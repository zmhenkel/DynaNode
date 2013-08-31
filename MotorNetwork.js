/*

	INPUTS 
	init
	
	STATIC
	listPorts		[Ports]
	
	OUTPUTS
	getPortName		[PortName]
	isConnected		[Connected]
	
	EVENTS
	ready
	motorAdded		[Motor]
	motorRemoved	[MotorID]
	valueUpdated	[MotorID] [Address] [Value]
	terminated

*/
var worker = "./MotorNetworkWorker.js";
var util = require("util");
var events = require("events");
var child_process = require("child_process");
var serialport = require("serialport");
var Logger = require("./Logger");
var Motor = require("./Motor");

var MotorNetwork = function(portName,baudRate) {
	var self = this;
	var portName = portName;
	var baudRate = baudRate;
	var motors = [];
	var hits = 0;
	var requests = 0;
	
	
	var childProcess = child_process.fork(worker);
	childProcess.on("message",function(m){
		
		if(m.action === "opened") {
			//Nothing to do...
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