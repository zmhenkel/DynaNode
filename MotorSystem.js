/*	MotorSystem.js - main entry point for DynaNode
 *	
 *	Events:
 *		- motorAdded	[Motor Object]
 *		- motorRemoved	[Motor ID]
 *
 *	Methods:
 *		- constructor			[baudRate] [searchFequencyMS]
 *		- init					
 *		- setSearchFrequency	[frequencyMS]
 *		- getSearchFrequency	[frequencyMS]
 *		- addToBlackList		[comPortName]
 *		- removeFromBlackList	[comPortName]
 *		- getMotors				[[Motor,..,Motor]]
 *		- terminate
 *
 *	SEE Motor.js for details of Motor events and methods.
 *	
 *	USAGE: 	var MotorSystem = require("dynanode");
 *			var ms = new MotorSystem(1000000,1200);
 *			ms.on("motorAdded",funciton(d) { console.log(d); });
 *			ms.init();
 */


var MotorNetwork = require("./MotorNetwork");
var util = require("util");
var events = require("events");


var MotorSystem = function(baudRate,searchFrequencyMS) {
	var self = this;
	var baudRate = baudRate || 1000000;
	var searchFrequency = searchFrequencyMS || 1200;
	var blackList = [];
	
	var searchThread = null;
	var networks = [];
	var searching = false;
	
	var searchFunction = function() {
		if(!searching) {
			searching = true;
			MotorNetwork.listPorts(function(err,pts){
				for(var i=0; i<pts.length; i++) {
					var use = true;
					
					for(var j=0; j<blackList.length; j++) {
						if(blackList[j] === pts[i]) {
							use = false;
							break;
						}
					}
					
					for(var j=0; j<networks.length; j++) {
						if(networks[j].getName() === pts[i]) {
							use = false;
							break;
						}
					}
					
					if(use) {
						var mn = new MotorNetwork(pts[i],baudRate);
						networks.push(mn);
						self.emit("networkAdded",{name:pts[i]});
						
						mn.on("motorAdded",function(d) {
							self.emit("motorAdded",{motor:d.motor});
						});
						
						mn.on("motorRemoved",function(d) {
							self.emit("motorRemoved",{id:d.id});
						});
						
						mn.on("statUpdate",function(d) {
							//TODO: handle stat updates
						});
						
						mn.on("terminated",function(d) {
							self.emit("networkRemoved",{name:mn.getName()});
							for(var j=0; j<networks.length; j++) {
								if(networks[j].getName() === mn.getName()) {
									networks.splice(j,1);
									j--;
								}
							}
						});
						
						mn.init();
					}
					
				}
				searching = false;
			});
		}	
	};
	
	
	
	this.init = function() {
		searchThread = setInterval(searchFunction,searchFrequency);
		return true;
	};
	
	this.setSearchFrequency = function(frequencyMS) {
		if(searchThread !== null) {
			searchFrequency = frequencyMS;
			clearInterval(searchThread);
			searchThread = setInterval(searchFunction,searchFrequency);
			return true;
		}
		return false;
	};
	
	this.getSearchFrequency = function() {
		return searchFrequency;
	};
	
	this.addToBlackList = function(comPortName) {
		blackList.push(comPortName);	
	};
	
	this.removeFromBlackList = function(comPortName) {
		for(var i=0; i<blackList.length; i++) {
			if(blackList[i] === comPortName) {
				blackList.splice(i,1);
				i--;
			}
		}
	};
	
	this.getMotors = function() {
		var mtrs = [];
		for(var i=0; i<networks.length; i++) {
			var ms = networks[i].getMotors();
			for(var j=0; j<ms.length; j++) {
				mtrs.push(ms[j]);
			}
		}
		return mtrs;
	};
	
	this.terminate = function() {
		clearInterval(searchThread);
		for(var i=0; i<networks.length; i++)
			networks[i].terminate();
	};
	
};


util.inherits(MotorSystem,events.EventEmitter);
module.exports = MotorSystem;

