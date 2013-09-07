/*	MotorNetwork.js - used by MotorSystem.js, Motor.js
 *	
 *	Events:
 *		- motorAdded	[Motor Object]
 *		- motorRemoved	[Motor ID]
 *		- valueUpdated / frequencyUpdated (custom channels for each motor)
 *		- terminated
 *
 *	Methods:
 *		- constructor		[portName] [baudRate]
 *		- init					
 *		- setRegister		[motorID] [address] [numBytes] [value]
 *		- setRefreshRate	[motorID] [address] [frequency]
 *		- getMotors			[[Motor,..,Motor]]
 *		- terminate
 *
 *	Static Methods:
 *		- listPorts		[callBack]
 *
 *	SEE Motor.js for details of Motor events and methods.
 *	
 *	USAGE: 	Used internally by MotorSystem.js and Motor.js
 *			Static method listPorts provides list of COM ports.
 */
var path = require("path");
var fs = require("fs");
var worker = path.join(path.dirname(fs.realpathSync(__filename)), './MotorNetworkWorker.js');
var util = require("util");
var events = require("events");
var child_process = require("child_process");
var serialport = require("serialport");
var Motor = require(path.join(path.dirname(fs.realpathSync(__filename)), './Motor'));

var MotorNetwork = function(portName,baudRate) {
	var self = this;
	var portName = portName;
	var baudRate = baudRate;
	var motors = [];
	var hits = 0;
	var requests = 0;
	
	
	var childProcess = child_process.fork(worker);
	
	childProcess.on("error",function(e) {
		motors = [];
		self.emit("terminated",{});
	});
	
	childProcess.on("exit",function(e) {
		motors = [];
		self.emit("terminated",{});
	});
	
	childProcess.on("close",function(e){
		motors = [];
		self.emit("terminated",{});
	});
	
	childProcess.on("disconnect",function(e) {
		motors = [];
		self.emit("terminated",{});
	});
	
	childProcess.on("message",function(m){
		
		if(m.action === "opened") {
			//Do an initial scan
			for(var i=0; i<255; i++) {
				self.scan(i);
			}
		}
		
		if(m.action === "valueUpdated") {
			self.emit("valueUpdated"+m.motor,{name:m.name,motor:m.motor,value:m.value});
		}
		
		if(m.action === "frequencyUpdated") {
			self.emit("frequencyUpdated"+m.motor,{name:m.name,motor:m.motor,frequency:m.frequency});
		}
		
		if(m.action === "motorAdded") {
			var m = new Motor(m.motor,self,m.registers);
			motors.push(m);
			self.emit("motorAdded",{motor:m});
		}
		
		if(m.action === "motorRemoved") {
			for(var i=0; i<motors.length; i++) {
				if(motors[i].getID() === m.motor) {
					motors[i].terminate();
					motors.splice(i,1);
					i--;
				}
			};
			self.emit("motorRemoved",{id:m.motor});	
		}
		
		if(m.action === "statUpdate") {
			hits = m.hits;
			requests = m.requests;
			self.emit("statUpdate",{hits:hits,requests:requests});	
		}
		
		if(m.action === "terminated") {
			motors = [];
			self.emit("terminated",{});	
		};
		
	});
	
	this.init = function() {
		if(childProcess.connected) {
			childProcess.send({action:"init",portName:portName,baudRate:baudRate});
		}
	};
	
	this.terminate = function() {
		if(childProcess.connected) {
			childProcess.send({action:"shutdown"});
		}
	};
	
	this.setRegister = function(motorID,address,numBytes,value) {
		if(childProcess.connected) {
			childProcess.send({action:"writeRegister",motorID:motorID,numBytes:numBytes,address:address,value:value});
			return true;
		} else {
			return false;
		}
	};
	
	this.readRegister = function(motorID,address) {
		if(childProcess.connected) {
			childProcess.send({action:"readRegister",motorID:motorID,address:address});
		}
	};
	
	this.getMotors = function() {
		return motors;
	};
	
	this.setRefreshRate = function(motorID,address,frequency) {
		if(childProcess.connected) {
			childProcess.send({action:"updateReadFrequency",address:address,frequency:frequency});
			return true;
		} else {
			return false;
		}
	};
	
	this.getName = function() {
		return portName;
	};
	
	this.scan = function(id) {
		if(childProcess.connected) {
			childProcess.send({action:"ping",motorID:id});
		}	
	};
	
};



MotorNetwork.listPorts = function(callback) {
    callback = callback || function (err, ports){};
    if (process.platform !== 'darwin'){
        serialport.list(function(err, ports){
            out = [];
            ports.forEach(function(port){
                out.push(port.comName);
            });
            callback(null, out);
        });
        return;
    }

    child_process.exec('ls /dev/tty.*', function(err, stdout, stderr){
        if (err) return callback(err);
        if (stderr !== "") return callback(stderr);
        return callback(null, stdout.split("\n").slice(0,-1));
    });
};

util.inherits(MotorNetwork,events.EventEmitter);
module.exports = MotorNetwork;