import * as ko from "knockout";

class Person {
	ID: number
	Name: KnockoutObservable<string>
	Username: string
	Status: KnockoutObservable<number>
	StatusValue: KnockoutObservable<string>
	Remarks: KnockoutObservable<string>

	constructor() {
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
	}
}

class InOutBoardViewModel {
	sections: string[] = ["Me", "Everyone"]
	people: KnockoutObservable<Person[]>
	user: KnockoutObservable<Person>
	chosenSectionId: KnockoutObservable<string>
	statuses: KnockoutObservableArray<string>
	mustLogin: KnockoutObservable<string>
	username: KnockoutObservable<string>
	password: KnockoutObservable<string>
	refreshId: number


	constructor() {
		this.chosenSectionId = ko.observable(null);
		this.people = null;
		this.user = ko.observable(null);
		this.people = ko.observable(null);
		this.statuses = ko.observableArray(["In", "In Field", "Out"]);
		this.mustLogin = ko.observable(null);
		this.goToSection("Me");
		this.username = ko.observable("");
		this.password = ko.observable("");
	}

	login = () => {
		let xhr = new XMLHttpRequest();
		xhr.open("POST", "http://zaphod:8080/login");
		//xhr.setRequestHeader("Authorization", "Basic " + btoa(this.username() + ":" + this.password()));
		//xhr.withCredentials = true;
		xhr.onerror = () => {
			if (xhr.status == 401) {
				this.mustLogin("true");
			}

		}
		xhr.onload = () => {
			this.password(null);
			this.goToSection("Me");
		}
		let content = JSON.stringify({Username: this.username(), Password: this.password()});
		xhr.send(content);
	}
	save = () => {
		let xhr = new XMLHttpRequest();
		xhr.open("PUT", "/api/user/" + this.user());
		xhr.onerror = () => {
			console.log("Save failed");
			};
			
			let payload = JSON.stringify({
				ID: this.user().ID, 
				Name: this.user().Name(),
				Username: this.user().Username, 
				Status: this.user().Status(),
			    StatusValue: this.user().StatusValue(),	
				Remarks: this.user().Remarks()
				});
			xhr.send(payload);
	}

	goToSection = (section: string) => {
		if (section == "Me") {
			if (this.refreshId > 0) {
				clearInterval(this.refreshId);
			}
			this.people(null);
			let xhr = new XMLHttpRequest();
			xhr.open("GET", "http://zaphod:8080/api/user/");
			//xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			//xhr.withCredentials = true;
			xhr.onload = (ev) => {
				if (xhr.status < 200 || xhr.status >= 300) {
				console.log("Failed to load user");
					if (xhr.status === 401) {
						this.user(null);
						this.mustLogin("true");
					}
				} else {
					let user = JSON.parse(xhr.response);
					this.user().ID = user.ID;
					this.user().Name(user.Name);
					this.user().Username = user.Username;
					this.user().Status(user.Status);
					this.user().StatusValue(user.StatusValue);
					this.user().Remarks(user.Remarks);
					this.user().StatusValue.subscribe(this.save);
					this.user().Remarks.subscribe(this.save);
				}
			};
			xhr.onerror = (err) => {
				if (xhr.status === 401) {
					this.mustLogin("true");
					this.user(null);
					this.people(null);
				}
			};
			xhr.send();
			
			this.user(new Person());

		} else if (section === "Everyone") {
			this.user(null);

			let getPeople = () => {
			this.people(new Array<Person>());
			let xhr = new XMLHttpRequest();
			xhr.open("GET", "/api/people/");
			xhr.withCredentials = true;
			xhr.onload = (ev) => {
				if (xhr.status < 200 || xhr.status >= 300) {
					console.log("Ruh-roh!");
				} else if (xhr.status !== 401){
					let people = JSON.parse(xhr.response);
					let mapped = new Array<Person>();
					for (let jsperson of people) {
						let person = new Person();
						person.Name(jsperson.Name);
						person.Status(jsperson.Status);
						person.StatusValue(jsperson.StatusValue);
						person.Remarks(jsperson.Remarks);
						mapped.push(person);
					}
					this.people(mapped);
			} else { this.login(); }

			};
			xhr.onerror = () => {
				this.user(null);
				this.people(null);
				this.mustLogin("true");
			};
				xhr.send();
			}
			this.refreshId = setInterval(getPeople, 30000); // five minutes
			getPeople();
		}
		this.chosenSectionId(section);
	}
}

ko.applyBindings(new InOutBoardViewModel());

