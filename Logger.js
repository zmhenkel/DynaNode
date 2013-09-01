/* Logger.js - simple logging utility.
 *
 */
var Logger = {};
Logger.storage = "";
var fs = require("fs");

Logger.print = true;

Logger.log = function(msg) {
	if(Logger.print) {
		console.log((new Date()).getTime()+ ": "+msg);
	}
};


module.exports = Logger;