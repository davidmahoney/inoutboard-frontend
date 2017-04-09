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
	}
}

class InOutBoardViewModel {
	sections: string[] = ["Me", "Everyone"]
	people: KnockoutObservable<Person[]>
	user: KnockoutObservable<Person>
	chosenSectionId: KnockoutObservable<string>
	statuses: KnockoutObservableArray<string>


	constructor() {
		this.chosenSectionId = ko.observable(null);
		this.people = null;
		this.user = ko.observable(null);
		this.people = ko.observable(null);
		this.statuses = ko.observableArray(["In", "In Field", "Out"]);
		this.goToSection("Me");
	}

	goToSection = (section: string) => {
		if (section == "Me") {
			this.people(null);
			let xhr = new XMLHttpRequest();
			xhr.open("GET", "http://zaphod:8080/user/eartburm");
			xhr.onload = (ev) => {
				if (xhr.status < 200 || xhr.status >= 300) {
					console.log("Failed to load user");
				} else {
					let user = JSON.parse(xhr.response);
					this.user().Name(user.Name);
					this.user().Status(user.Status);
					this.user().StatusValue(user.StatusValue);
					this.user().Remarks(user.Remarks);
				}
			};
			xhr.onerror = () => {

			};
			xhr.send();
			
			this.user(new Person());

		} else {
			this.user(null);
			this.people(new Array<Person>());
			let xhr = new XMLHttpRequest();
			xhr.open("GET", "http://zaphod:8080/people/");
			xhr.onload = (ev) => {
				if (xhr.status < 200 || xhr.status >= 300) {
					console.log("Ruh-roh!");
				} else {
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
				}

			};
			xhr.onerror = () => {

			};
			xhr.send();
		}
		this.chosenSectionId(section);
	}
}

ko.applyBindings(new InOutBoardViewModel());

