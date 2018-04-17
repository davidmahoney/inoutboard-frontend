import * as ko from "knockout";

interface IHash<T> {
	[key: string]: T
}

class StatusCode {
	Code: number
	Value: string
}

var dateFormat = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'});
var formatPhone = (n: string) => { return n.replace(' ', '').replace('(', '').replace('(',''); }

class Person {
	ID: number
	Name: KnockoutObservable<string>
	Username: string
	Status: KnockoutObservable<number>
	StatusValue: KnockoutObservable<string>
	Remarks: KnockoutObservable<string>
	IsEditing: KnockoutObservable<boolean>
	LastEditor: KnockoutObservable<string>
	LastEditTime: KnockoutObservable<Date>
	Telephone: KnockoutObservable<string>
	Mobile: KnockoutObservable<string>
	Office: KnockoutObservable<string>
	Title: KnockoutObservable<string>
	Group: KnockoutObservable<string>
	error: KnockoutObservable<string>
	loading: KnockoutObservable<Boolean>
	saveSuccess: KnockoutObservable<Boolean>

	constructor() {
		this.error = ko.observable(null);
		this.loading = ko.observable(false);
		this.Name = ko.observable(null);
		this.Status = ko.observable(null);
		this.StatusValue = ko.observable(null);
		this.Remarks = ko.observable(null);
		this.Remarks.placeholder = ko.pureComputed(() => { 
			return  "Return time, regular schedule, availability"; });
		this.StatusValue.subscribe((nv) => {
			switch (nv) {
			case "In": this.Status(0); break;
			case "Out": this.Status(1); break;
			case "In Field": this.Status(2); break;
			}
		});
		this.IsEditing = ko.observable(false);
		this.LastEditor = ko.observable(null);
		this.LastEditTime = ko.observable(null);
		this.LastEditTime.formatted = ko.pureComputed(() => {
			return dateFormat.format(this.LastEditTime());
		});
		this.Group = ko.observable(null);
		this.Telephone = ko.observable(null);
		this.Telephone.Url = ko.pureComputed(() => {
			return formatPhone(this.Telephone() || "");
		});
		this.Mobile = ko.observable(null);
		this.Mobile.Url = ko.pureComputed(() => {
			return formatPhone(this.Mobile() || "");
		});
		this.Office = ko.observable(null);
		this.Title = ko.observable(null);
		this.saveSuccess = ko.observable(null);
		this.saveSuccess.subscribe(() => {
			// kinda hacky, but remove the success
			// setting so that the animation in the 
			// view doesn't reoccur
			setTimeout(() => { this.saveSuccess(null);}, 2000);
		});
	}
	save = () => {
		let xhr = new XMLHttpRequest();
		xhr.open("PUT", "/api/user/" + this.Username);
		xhr.onerror = (ev) => {
			this.loading(false);
			console.log("Save failed");
			this.saveSuccess(false);
			if (xhr.status == 401) {
				this.error("Error: unauthorized");
			}
			else {
				this.error("Error: " + xhr.status);
			}
			};
			
		let sc = new StatusCode();
		sc.Code = this.Status();
		let payload = JSON.stringify({
			ID: this.ID, 
			Name: this.Name,
			Username: this.Username, 
			Status: sc,
			Remarks: this.Remarks()
			});

		xhr.onload = () => {
			this.loading(false);
			if (xhr.status >= 400) {
				this.error("Error: " + xhr.status + " - " + xhr.statusText);
				this.saveSuccess(false);
			} else {
				this.IsEditing(false);
				let jsperson = JSON.parse(xhr.response);
				this.LastEditor(jsperson.LastEditor);
				this.LastEditTime(new Date(jsperson.LastEditTime));
				this.saveSuccess(true);
			}
		}
		this.saveSuccess(null);
		this.loading(true);
		xhr.send(payload);
	}

}

class PersonGroup {
	label: KnockoutObservable<string>
	people: KnockoutObservableArray<Person>
	active: KnockoutObservable<Boolean>

	constructor(label: string, people: Person[]) {
		this.label = ko.observable(label)
		this.people = ko.observableArray<Person>(people)
		this.active = ko.observable<Boolean>(false);
	}

	toggleActive = () => {
		this.active(!this.active());
	}
}

class InOutBoardViewModel {
	sections:  KnockoutObservableArray<string>
	people: KnockoutObservableArray<PersonGroup>
	user: KnockoutObservable<Person>
	chosenSectionId: KnockoutObservable<string>
	mustLogin: KnockoutObservable<string>
	username: KnockoutObservable<string>
	password: KnockoutObservable<string>
	error: KnockoutObservable<string>
	selectedUser: KnockoutObservable<Person>
	loading: KnockoutObservable<Boolean>
	statuses: KnockoutObservableArray<StatusCode>
	refreshId: number


	constructor() {
		this.loading = ko.observable(false);
		this.error = ko.observable("");
		this.chosenSectionId = ko.observable(null);
		this.people = null;
		this.username = null;
		this.user = ko.observable(null);
		this.people = ko.observableArray<PersonGroup>(new Array<PersonGroup>());
		this.mustLogin = ko.observable(null);
		this.username = ko.observable("");
		this.password = ko.observable("");
		this.sections = ko.observableArray(["Me", "Everyone"])
		this.selectedUser = ko.observable(null);
		this.statuses = ko.observableArray<StatusCode>(new Array<StatusCode>());
		this.goToSection("Me");
		this.people.extend({ deferred: true });
	}

	login = () => {
		let xhr = new XMLHttpRequest();
		xhr.open("POST", "/login");
		xhr.onerror = () => {
			if (xhr.status == 401) {
				this.mustLogin("true");
			}

		}
		xhr.onload = () => {
			this.password(null);
			if (xhr.status >= 400) {
				this.error("Login failed");
			} else {
				this.mustLogin(null);
				this.goToSection("Me");
			}
		}
		let content = JSON.stringify({Username: this.username(), Password: this.password()});
		xhr.send(content);
	}

	goToSection = (section: string) => {
		this.error("");
		// stop refreshing the everyone tab
		if (this.refreshId > 0) {
			clearInterval(this.refreshId);
		}

		// if there is a details tab and we aren't looking at it,
		// get rid of it
		if ((section === "Me" || section === "Everyone") && this.sections().length > 2) {
			this.selectedUser(null);
			this.sections.pop();
		}

		// the "me" tab
		if (section == "Me") {
			const promise = this.getStatusCodes();
			let xhr = new XMLHttpRequest();
			xhr.open("GET", "/api/user/");
			xhr.onload = (ev) => {
				if (xhr.status < 200 || xhr.status >= 300) {
				console.log("Failed to load user");
					if (xhr.status === 401) {
						this.user(null);
						this.mustLogin("true");
					}
				} else {
					this.mustLogin(null);
					let user = JSON.parse(xhr.response);
					this.user().ID = user.ID;
					this.user().Name(user.Name);
					this.user().Username = user.Username;
					this.user().Status(user.Status.Code);
					this.user().StatusValue(user.Status.Value);
					this.user().Remarks(user.Remarks);
					this.user().StatusValue.subscribe(this.user().save);
					this.user().LastEditTime(user.LastEditTime);
					this.user().Remarks.subscribe(this.user().save);
					this.user().Group(user.Department);
					this.user().Telephone(user.Telephone);
					this.user().Mobile(user.Mobile);
					this.user().Office(user.Office);
					this.user().Title(user.Title);
					this.user().error.subscribe((v) => {
						console.log(v);
						this.error(v);
					});
					this.user().loading.subscribe(this.loading);
					this.username(user.Username);
				}
				this.loading(false);
			};
			xhr.onerror = (err) => {
				this.loading(false);
				if (xhr.status === 401) {
					this.mustLogin("true");
					this.user(null);
					this.people(null);
				}
				else {
					if (xhr.status == 0) {
						this.error("Error: Could not contact server");
					}
					else {
						this.error("Failed to get user details: Error " + xhr.status);
					}
				}
			};
			this.loading(true);
			xhr.send();
			
			this.user(new Person());
			this.chosenSectionId(section);

		} else if (section === "Everyone") { // the "everyone" tab
			this.user(null);

			let getPeople = () => {
			if (this.people() === null)
			{
				this.people(new Array<PersonGroup>());
			}
			let xhr = new XMLHttpRequest();
			xhr.open("GET", "/api/people/");
			xhr.withCredentials = true;
			xhr.onload = (ev) => {
				if (xhr.status < 200 || xhr.status >= 300) {
					console.log("Ruh-roh!");
					this.error("Could not get data from the server: Error " + xhr.status);
				} else if (xhr.status !== 401){
					this.mustLogin(null);
					let people = JSON.parse(xhr.response);
					let myDepartment = "";
					let mapped: IHash<Person[]> = {};
					for (let jsperson of people) {
						let person = new Person();
						person.ID = jsperson.ID;
						person.Username = jsperson.Username;
						person.Name(jsperson.Name);
						person.Status(jsperson.Status.Code);
						person.StatusValue(jsperson.Status.Value);
						person.Status.subscribe((nv) => {
							this.getStatusCodes().then((res) => {
								for (let s of res) {
									if (s.Code == nv) {
										person.StatusValue(s.Value);
										break;
									}
								}
							});
						});
						person.Remarks(jsperson.Remarks);
						person.error.subscribe(this.error);
						person.LastEditor(jsperson.LastEditor);
						person.LastEditTime(new Date(jsperson.LastEditTime));
						person.Group(jsperson.Department);
						person.Telephone(jsperson.Telephone);
						person.Mobile(jsperson.Mobile);
						person.Office(jsperson.Office);
						person.Title(jsperson.Title);
						person.IsEditing.subscribe((ed) => {
							if (ed) {
								clearInterval(this.refreshId);
							} else {
								this.refreshId = setInterval(getPeople, 300000); // five minutes
							}
						});
						person.error.subscribe(this.error);
						person.loading.subscribe(this.loading);
						if (mapped[jsperson.Department] === undefined) {
							mapped[jsperson.Department] = new Array<Person>();
						}
						mapped[jsperson.Department].push(person);
						if (this.username() === jsperson.Username) {
							myDepartment = jsperson.Department;
						}
					}

					Object.keys(mapped).forEach((k) => {
						let group = ko.utils.arrayFirst(this.people(), function(g) {
							return g.label() === k;
						});
						if (group === null) {
							group = new PersonGroup(k, mapped[k]);
							if (k === myDepartment) {
								group.active(true);
							}
							this.people.push(group);
						} else {
							group.people.removeAll();
							group.people(mapped[k]);
						}
					});
					this.loading(false);
			} else { this.login(); }

			};
			xhr.onerror = () => {
				this.user(null);
				this.people(null);
				if (xhr.status === 401) {
					this.mustLogin("true");
				}
				this.loading(false);
			};
				this.loading(true);
				xhr.send();
			}
			this.refreshId = setInterval(getPeople, 300000); // five minutes
			getPeople();
		} else { // individual person details
			
		}
		this.chosenSectionId(section);
	}

	editPerson = (person: Person) => {
		person.saveSuccess(null);
		person.IsEditing(true);
	}

	viewPerson = (person: Person) => {
		if (person.IsEditing()) { return; }
		this.sections.push(person.Name());
		this.selectedUser(person);
		this.goToSection(person.Name());
	}

	// Get a list of status codes a person can have
	// this is cached
	getStatusCodes(): Promise<StatusCode[]> {
		return new Promise<StatusCode[]>((resolve, reject) => {
		if (typeof(this.statuses()) === null || this.statuses().length == 0) {
			let xhr = new XMLHttpRequest();
			xhr.open("GET","/api/statuscodes");
			xhr.onload = () => {
				if (xhr.status === 401) {
					// what now?
				} else if (xhr.status >= 400) {
					console.log("Error: " + xhr.status + " could not get status codes")
					throw new Error("Failed to get status codes");
				}
				let statuses = JSON.parse(xhr.response);
				statuses = statuses.sort((n1: StatusCode, n2: StatusCode) => {
					return n1.Code < n2.Code? -1: n1.Code === n2.Code? 0: 1;
				});
				for (let stat of statuses) {
					this.statuses.push(stat);
				}
				resolve(this.statuses());
			}
			xhr.onerror = () => {
				throw new Error("Failed to get status codes");
			}
			xhr.send();
		} else {
			resolve(this.statuses());
		}
		});
	}
}

ko.applyBindings(new InOutBoardViewModel());

