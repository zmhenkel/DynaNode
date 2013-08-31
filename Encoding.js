/* Encoding.js - represents Dynamixel encodings of registers
 *
 * USAGE: used to convert from native Dynamixel values to
 * human-readable quantities. 
 */

var Alarms = require("./Alarms");

var Encoding = {};
Encoding.Default 			= 0x01;
Encoding.BaudRate			= 0x02;
Encoding.ReturnDelayTime 	= 0x03;
Encoding.Load 				= 0x04;
Encoding.Voltage 			= 0x05;
Encoding.Alarm		 		= 0x06;
Encoding.Current 			= 0x07;
Encoding.Boolean			= 0x08;

Encoding.GetEncoding = function(regName) {
	if(regName === "baudRate")
		return Encoding.BaudRate;
	if(regName === "returnDelayTime")
		return Encoding.ReturnDelayTime;
	if(regName === "presentLoad")
		return Encoding.Load;
	if(	regName === "presentVoltage" ||
		regName === "highVoltageLimit" ||
		regName === "lowVoltageLimit" ) {
			return Encoding.Voltage;
		}
	if( regName === "alarmLED" ||
		regName === "alarmShutdown" ) {
			return Encoding.Alarm;
		}
	if( regName === "current")
		return Encoding.Current;
	if( regName === "torqueEnable" ||
		regName === "led" ||
		regName === "moving" ) {
			return Encoding.Boolean;
		}
	return Encoding.Default;

};

Encoding.BaudToNumber = function(baudRate) {
	return 2000000 / (baudRate + 1);
};

Encoding.ReturnDelayToNumber = function(rd) {
	return 2*rd;
};

Encoding.LoadToNumber = function(ld) {
	var loadValue 	= ld & 511;
	var cw 			= ld & 2048 === 2048?1:-1;
	return cw*loadValue; 
};

Encoding.VoltageToNumber = function(vl) {
	return (vl *1.0) / 10.0;
};

Encoding.CurrentToNumber = function(c) {
	return 4.5*(c-2048);
};

Encoding.GetAlarms = function(alarmBytes) {
	return Alarms.getAlarms(alarmBytes);
};

Encoding.BooleanToNumber = function(b) {
	if(b)
		return 1;
	else
		return 0;
};

Encoding.toNumber = function(encoding,value) {
	if(encoding === Encoding.Default)
		return value;
	if(encoding === Encoding.BaudRate)
		return Encoding.BaudToNumber(value);
	if(encoding === Encoding.ReturnDelayTime)
		return Encoding.ReturnDelayToNumber(value);
	if(encoding === Encoding.Load)
		return Encoding.LoadToNumber(value);
	if(encoding === Encoding.Voltage)
		return Encoding.VoltageToNumber(value);
	if(encoding === Encoding.Alarm)
		return value;
	if(encoding === Encoding.Current)
		return Encoding.CurrentToNumber(value);
	if(encoding === Encoding.Boolean)
		return Encoding.BooleanToNumber(value);
		
	return 0;
};



module.exports = Encoding;