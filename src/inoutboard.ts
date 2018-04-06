import * as ko from "knockout";

interface IHash<T> {
	[key: string]: T
}

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
	Group: KnockoutObservable<string>
	error: KnockoutObservable<string>

	constructor() {
		this.error = ko.observable(null);
		this.Name = ko.observable(null);
		this.Status = ko.observable(null);
		this.StatusValue = ko.observable(null);
		this.Remarks = ko.observable(null);
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
			return this.LastEditTime().toLocaleDateString('en-ca', {hour: '2-digit', minute: '2-digit'});
		});
		this.Group = ko.observable(null);
		this.Telephone = ko.observable(null);
		this.Mobile = ko.observable(null);
		this.Office = ko.observable(null);
	}
	save = () => {
		let xhr = new XMLHttpRequest();
		xhr.open("PUT", "/api/user/" + this.Username);
		xhr.onerror = (ev) => {
			console.log("Save failed");
			if (xhr.status == 401) {
				this.error("Error: unauthorized");
			}
			else {
				this.error("Error: " + xhr.status);
			}
			};
			
		let payload = JSON.stringify({
			ID: this.ID, 
			Name: this.Name,
			Username: this.Username, 
			Status: this.Status(),
			StatusValue: this.StatusValue(),	
			Remarks: this.Remarks()
			});

		xhr.onload = () => {
			this.IsEditing(false);
			if (xhr.status >= 400) {
				this.error("Error: " + xhr.status + " - " + xhr.statusText);
			}
			let jsperson = JSON.parse(xhr.response);
			this.LastEditor(jsperson.LastEditor);
			this.LastEditTime(new Date(jsperson.LastEditTime));
		}
		xhr.send(payload);
	}

}

class PersonGroup {
	label: KnockoutObservable<string>
	people: KnockoutObservableArray<Person>

	constructor(label: string, people: Person[]) {
		this.label = ko.observable(label)
		this.people = ko.observableArray<Person>(people)
	}
}

class InOutBoardViewModel {
	sections:  KnockoutObservableArray<string>
	people: KnockoutObservableArray<PersonGroup>
	user: KnockoutObservable<Person>
	chosenSectionId: KnockoutObservable<string>
	statuses: KnockoutObservableArray<string>
	mustLogin: KnockoutObservable<string>
	username: KnockoutObservable<string>
	password: KnockoutObservable<string>
	error: KnockoutObservable<string>
	selectedUser: KnockoutObservable<Person>
	refreshId: number


	constructor() {
		this.error = ko.observable("");
		this.chosenSectionId = ko.observable(null);
		this.people = null;
		this.user = ko.observable(null);
		this.people = ko.observableArray<PersonGroup>(null);
		this.statuses = ko.observableArray(["In", "In Field", "Out"]);
		this.mustLogin = ko.observable(null);
		this.username = ko.observable("");
		this.password = ko.observable("");
		this.sections = ko.observableArray(["Me", "Everyone"])
		this.selectedUser = ko.observable(null);
		this.goToSection("Me");
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
			this.mustLogin(null);
			this.goToSection("Me");
		}
		let content = JSON.stringify({Username: this.username(), Password: this.password()});
		xhr.send(content);
	}

	goToSection = (section: string) => {
		this.error("");
		if ((section === "Me" || section === "Everyone") && this.sections().length > 2) {
			this.selectedUser(null);
			this.sections.pop();
		}

		if (section == "Me") {
			if (this.refreshId > 0) {
				clearInterval(this.refreshId);
			}
			this.people(null);
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
					this.user().Status(user.Status);
					this.user().StatusValue(user.StatusValue);
					this.user().Remarks(user.Remarks);
					this.user().StatusValue.subscribe(this.user().save);
					this.user().LastEditTime(user.LastEditTime);
					this.user().Remarks.subscribe(this.user().save);
					this.user().Group(user.Department);
					this.user().Telephone(user.Telephone);
					this.user().Mobile(user.Mobile);
					this.user().Office(user.Office);
					this.user().error.subscribe((v) => {
						console.log(v);
						this.error(v);
					});
				}
			};
			xhr.onerror = (err) => {
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
			xhr.send();
			
			this.user(new Person());
			this.chosenSectionId(section);

		} else if (section === "Everyone") {
			this.user(null);

			let getPeople = () => {
				this.people(new Array<PersonGroup>());
			let xhr = new XMLHttpRequest();
			xhr.open("GET", "/api/people/");
			xhr.withCredentials = true;
			xhr.onload = (ev) => {
				if (xhr.status < 200 || xhr.status >= 300) {
					console.log("Ruh-roh!");
				} else if (xhr.status !== 401){
					this.mustLogin(null);
					let people = JSON.parse(xhr.response);
					let mapped: IHash<Person[]> = {};
					for (let jsperson of people) {
						let person = new Person();
						person.ID = jsperson.ID;
						person.Username = jsperson.Username;
						person.Name(jsperson.Name);
						person.Status(jsperson.Status);
						person.StatusValue(jsperson.StatusValue);
						person.Remarks(jsperson.Remarks);
						person.error.subscribe(this.error);
						person.LastEditor(jsperson.LastEditor);
						person.LastEditTime(new Date(jsperson.LastEditTime));
						person.Group(jsperson.Department);
						person.Telephone(jsperson.Telephone);
						person.Mobile(jsperson.Mobile);
						person.Office(jsperson.Office);
						person.IsEditing.subscribe((ed) => {
							if (ed) {
								clearInterval(this.refreshId);
							} else {
								this.refreshId = setInterval(getPeople, 300000); // five minutes
							}
						});
						if (mapped[jsperson.Department] === undefined) {
							mapped[jsperson.Department] = new Array<Person>();
						}
						mapped[jsperson.Department].push(person);
					}
					Object.keys(mapped).forEach((k) => {
						let group = new PersonGroup(k, mapped[k]);
						this.people.push(group);
					});
			} else { this.login(); }

			};
			xhr.onerror = () => {
				this.user(null);
				this.people(null);
				this.mustLogin("true");
			};
				xhr.send();
			}
			this.refreshId = setInterval(getPeople, 300000); // five minutes
			getPeople();
		} else { // individual person details
			
		}
		this.chosenSectionId(section);
	}

	editPerson = (person: Person) => {
		person.IsEditing(true);
	}

	viewPerson = (person: Person) => {
		if (person.IsEditing()) { return; }
		this.sections.push(person.Name());
		this.selectedUser(person);
		this.goToSection(person.Name());
	}
}

ko.applyBindings(new InOutBoardViewModel());

