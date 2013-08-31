var MotorNetwork = require("./MotorNetwork");
var util = require("util");
var events = require("events");

var blackList = [];
blackList.push("/dev/tty.Bluetooth-PDA-Sync");
blackList.push("/dev/tty.Bluetooth-Modem");


var MotorSystem = function() {
	var self = this;
	var searchThread = null;
	var networks = [];
	var searching = false;
	
	searchThread = setInterval(function(){
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
						var mn = new MotorNetwork(pts[i],1000000);
						networks.push(mn);
						self.emit("networkAdded",{name:pts[i]});
						mn.on("motorAdded",function(d){
							self.emit("motorAdded",{motor:d.motor});
						});
						
						mn.on("statUpdate",function(d){
							console.log("stat: "+(Math.round(d.hits/d.requests,5)*100)+"%");
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
	},1200);
	
	
	
	this.terminate = function() {
		clearInterval(searchThread);
		for(var i=0; i<networks.length; i++)
			networks[i].terminate();
	};
	
};


util.inherits(MotorSystem,events.EventEmitter);
module.exports = MotorSystem;

