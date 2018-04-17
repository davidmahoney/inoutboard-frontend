declare var require: any;
require.config({
	paths: {
	//"knockout": "node_modules/knockout/build/output/knockout-latest",
	"knockout": "knockout-latest",
	}
});

require(["es6-promise.auto"])
require(["inoutboard"]);
