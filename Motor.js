/*	Motor.js - objects distributed by MotorSystem.js
 *	
 *	Events:
 *		- valueUpdated		{registerName,value}
 *		- frequencyUpdated	{registerName,frequency}
 *		- terminated	
 *
 *	Methods:
 *		- constructor				[motorID] [network] [regPairs]
 *		- getID						{id}
 *		- listRegisters				[[{name,value,frequency}...{}]]
 *		- getRegister				{decodedValue,rawValue,encoding,frequency}
 *		- setRegisterValue			[regName] [encodedValue]
 *		- setRegisterRefreshRate
 *		- getNetworkName			{comPortName}
 *		- terminate
 *	
 *	USAGE: 	Subscribe to event "valueUpdated" to receive motor updates
 *			Use setRegisterValue to write to motor registers 	
 *			
 *	NOTE:	Be sure to use encoded / decoded values where requested.
 */

var util = require("util");
var events = require("events");
var path = require("path");
var fs = require("fs");
var Encoding = require(path.join(path.dirname(fs.realpathSync(__filename)), './Encoding'));
var Logger = require(path.join(path.dirname(fs.realpathSync(__filename)), './Logger'));

var MotorRegister = function(name,address,bytes,frequency,encoding,value) {
	var self = this;
	this.name = name;
	this.address = address;
	this.numberOfBytes = bytes;
	this.frequencyMS = frequency;
	this.encoding = encoding;
	this.value = value;
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
		var value = Encoding.toNumber(encoding,regPairs[i].value);
		
		registers.push(new MotorRegister(name,address,bytes,frequency,encoding,value));
		
	}
	
	
	network.on("valueUpdated"+motorID,function(d){
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === d.name) {
				registers[i].value = d.value;
				var ev = Encoding.toNumber(registers[i].encoding,d.value);
				self.emit("valueUpdated",{name:d.name,value:ev});
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
		Logger.log("Motor Terminated: "+motorID);
		registers = [];
	});
	
	
	this.getID = function() {
		return motorID;
	};
	
	this.listRegisters = function() {
		var regs = [];
		for(var i=0; i<registers.length; i++) {
			var val = Encoding.toNumber(registers[i].encoding,registers[i].value);
			regs.push({name:registers[i].name,value:val,frequency:registers[i].frequencyMS});
		}
		return regs;
	};
	
	this.getRegister = function(regName) {
		//Retrieve from cache
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === regName) {
				var r = registers[i];
				var dv = Encoding.toNumber(registers[i].encoding,registers[i].value);
				return {decodedValue:dv,rawValue:r.value,encoding:r.encoding, frequency:r.frequencyMS};
			}
		}
		return {};
	};
	
	this.cueReadRegister = function(regName) {
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === regName) {
				if(network !== null) {
					network.readRegister(motorID,registers[i].address);
				}
				break;
			};
		}
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
	
	this.setRegisterValueReliable = function(regName,value,callBack) {
		var register = null;
		for(var i=0; i<registers.length; i++) {
			if(registers[i].name === regName) {
				register = registers[i];
				break;
			}
		}
		
		if(register !== null) {
			var setThread = setInterval(function(){
				if(register.value === value) {
					clearInterval(setThread);
					if(callBack)
						callBack();
					return;
				} else {
					network.setRegister(motorID,register.name,register.numberOfBytes,value);
				}
			},64);
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