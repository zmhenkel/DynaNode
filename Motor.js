var util = require("util");
var events = require("events");
var Encoding = require("./Encoding");

var MotorRegister = function(name,address,bytes,frequency,encoding) {
	var self = this;
	this.name = name;
	this.address = address;
	this.numberOfBytes = bytes;
	this.frequencyMS = frequency;
	this.encoding = encoding;
	this.value = null;
};


var Motor = function(motorID,network,regPairs) {
	var self = this;
	var motorID = motorID;
	var network = network;
	var registers = [];
	
	//Process regPairs
	for(var i=0; i<regPairs.length; i++) {
		var name = regPairs[i].name;
		var address = regPairs[i].address;
		var bytes = regPairs[i].bytes;
		var frequency = regPairs[i].frequency;
		var encoding = Encoding.GetEncoding(name);
		
		registers.push(new MotorRegister(name,address,bytes,frequency,encoding));
		
	}
	
	
	network.on("valueUpdated"+motorID,function(d){
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === d.name) {
				registers[i].value = d.value;
				self.emit("valueUpdated",{name:d.name,value:d.value});
				break;
			}
		}	
	});
	
	network.on("frequencyUpdated"+motorID,function(d){
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === d.name) {
				registers[i].frequencyMS = d.frequency;
				self.emit("frequencyUpdated",{name:d.name,frequency:d.frequency});
				break;
			}
		}	
	});
	
	network.on("terminated",function(d){
		self.emit("terminated",{});
		registers = [];
	});
	
	
	this.getID = function() {
		return motorID;
	};
	
	this.listRegisters = function() {
		var regs = [];
		for(var i=0; i<registers.length; i++) {
			regs.push(registers[i].name);
		}
		return regs;
	};
	
	this.getRegister = function(regName) {
		//Retrieve from cache
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === regName) {
				var r = registers[i];
				return {value:r.value,encoding:r.encoding, frequency:r.frequencyMS};
			}
		}
		return {};
	};
	
	this.setRegisterValue = function(regName,value) {
		//Tell the network to update the register
		var address = null;
		var nb = 1;
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === regName) {
				address = registers[i].address;
				nb = registers[i].numberOfBytes;
				break;
			}
		}
		
		if(address !== null) {
			return network.setRegister(motorID,address,nb,value);
		} else {
			return false;
		}
	};
	
	this.setRegisterRefreshRate = function(regName,frequencyMS) {
		//Tell network to update refresh rate
		var address = null;
		var nb = 1;
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === regName) {
				address = registers[i].address;
				nb = registers[i].numberOfBytes;
				break;
			}
		}
		
		if(address !== null) {
			return network.setRefreshRate(motorID,address,frequencyMS);
		} else {
			return false;
		}
	};
	
	this.getNetworkName = function() {
		return network.getName();
	};
	
	this.terminate = function() {
		self.emit("terminated",{});
		registers = [];
	};
};

util.inherits(Motor,events.EventEmitter);
module.exports = Motor;