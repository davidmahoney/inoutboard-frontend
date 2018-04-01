import * as ko from "knockout";

class Person {
	ID: number
	Name: KnockoutObservable<string>
	Username: string
	Status: KnockoutObservable<number>
	StatusValue: KnockoutObservable<string>
	Remarks: KnockoutObservable<string>
	IsEditing: KnockoutObservable<boolean>
	error: KnockoutObservable<string>

	constructor() {
		this.error = ko.observable(null)
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
	}
	save = () => {
		let xhr = new XMLHttpRequest();
		xhr.open("PUT", "/api/user/" + this.Username);
		xhr.onerror = () => {
			console.log("Save failed");
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
		}
		xhr.send(payload);
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
	error: KnockoutObservable<string>
	refreshId: number


	constructor() {
		this.error = ko.observable("");
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
					this.user().Remarks.subscribe(this.user().save);
					this.user().error.subscribe(this.error);
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
					this.mustLogin(null);
					let people = JSON.parse(xhr.response);
					let mapped = new Array<Person>();
					for (let jsperson of people) {
						let person = new Person();
						person.ID = jsperson.ID;
						person.Username = jsperson.Username;
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

	editPerson = (person: Person) => {
		person.IsEditing(true);
	}
}

ko.applyBindings(new InOutBoardViewModel());

