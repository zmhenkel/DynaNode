/* Alarms.js - converts alarm byte to error codes.
 *
 */

var Alarms = {};

Alarms.InputVoltageError 	= 0x01;
Alarms.AngleLimitError 		= 0x02;
Alarms.OverHeatingError 	= 0x04;
Alarms.RangeError 			= 0x08;
Alarms.ChecksumError 		= 0x10;
Alarms.OverloadError 		= 0x20;
Alarms.InstructionError 	= 0x40;

Alarms.getAlarms = function(alarmByte) {
	var alarms = [];
	
	if(alarmByte & Alarms.InputVoltageError > 0)
		alarms.push(Alarms.InputVoltageError);
	if(alarmByte & Alarms.AngleLimitError > 0)
		alarms.push(Alarms.AngleLimitError);
	if(alarmByte & Alarms.OverHeatingError > 0)
		alarms.push(Alarms.OverHeatingError);
	if(alarmByte & Alarms.RangeError > 0)
		alarms.push(Alarms.RangeError);
	if(alarmByte & Alarms.ChecksumError > 0)
		alarms.push(Alarms.ChecksumError);
	if(alarmByte & Alarms.OverloadError > 0)
		alarms.push(Alarms.OverloadError);
	if(alarmByte & Alarms.InstructionError > 0)
		alarms.push(Alarms.InstructionError);
	return alarms;
};



module.exports = Alarms;