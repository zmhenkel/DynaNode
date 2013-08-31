
var Logger = {};
Logger.storage = "";
var fs = require("fs");

Logger.print = false;

Logger.log = function(msg) {
	if(Logger.print) {
		console.log((new Date()).getTime()+ ": "+msg);
	} else {
		Logger.storage += "\n"+(new Date()).getTime()+ ": "+msg;
	}
};

Logger.printStorage = function() {
	console.log(Logger.storage);
};

Logger.st = "";

Logger.csvStore = function(d) {
	Logger.st += "\n"+(new Date()).getTime()+","+d;
};

Logger.writeFile = function() {
	var s = fs.createWriteStream("motion2.csv");
	s.once('open',function(fd){
		s.write(Logger.st);
		s.end();
	});
	//console.log(Logger.st);
};


module.exports = Logger;