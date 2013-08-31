/*	DynaNode - v0.1
 *	2013-02-09 - dynaNode@zmhenkel.com - Zachary Henkel
 *	Free to use without restriction.
 *
 *	Library for controlling Dynamixel Motors using Node.js
 */ 
 
//Namespace for DynaNode
var DynaNode = DynaNode || {};

//Requires for DynaNode
DynaNode.Requires = DynaNode.Requires || {};
DynaNode.Requires.Util = require("util");
DynaNode.Requires.Events = require("events");
DynaNode.Requires.SerialPort = require("serialport");
DynaNode.Requires.ChildProcess = require("child_process");

//Workers (for serialport)
DynaNode.Workers = DynaNode.Workers || {};
DynaNode.Workers.SerialPort = "./DynaSerialWorker.js";

//Represents a Register (Address & Size in Bytes)
DynaNode.Register = function(registerID,byteLength) {
	this.registerID = registerID;
	this.byteLength = byteLength;
};

//Register and value pair
DynaNode.Data = function(register,value) {
	this.register = register;
	this.value = value;
};

//Dynamixel Standard Registers & Byte Sizes
DynaNode.Registers = DynaNode.Registers || {};
DynaNode.Registers.MODEL_NUMBER 		= new DynaNode.Register(0,2);				
DynaNode.Registers.FIRMWARE_VERSION 	= new DynaNode.Register(2,1);			
DynaNode.Registers.MOTOR_ID 			= new DynaNode.Register(3,1);
DynaNode.Registers.BAUD_RATE 			= new DynaNode.Register(4,1);
DynaNode.Registers.RETURN_DELAY_TIME	= new DynaNode.Register(5,1);
DynaNode.Registers.CW_ANGLE_LIMIT 		= new DynaNode.Register(6,2);
DynaNode.Registers.CCW_ANGLE_LIMIT 		= new DynaNode.Register(8,2);
DynaNode.Registers.MODE 				= new DynaNode.Register(10,1);
DynaNode.Registers.HIGH_TEMP_LIMIT 		= new DynaNode.Register(11,1);
DynaNode.Registers.LOW_VOLTAGE_LIMIT 	= new DynaNode.Register(12,1);
DynaNode.Registers.HIGH_VOLTAGE_LIMIT 	= new DynaNode.Register(13,1);
DynaNode.Registers.MAX_TORQUE 			= new DynaNode.Register(14,2);
DynaNode.Registers.STATUS_RETURN_LEVEL 	= new DynaNode.Register(16,1);
DynaNode.Registers.ALARM_LED 			= new DynaNode.Register(17,1);
DynaNode.Registers.ALARM_SHUTDOWN 		= new DynaNode.Register(18,1);
DynaNode.Registers.TORQUE_ENABLE 		= new DynaNode.Register(24,1);
DynaNode.Registers.LED 					= new DynaNode.Register(25,1);
DynaNode.Registers.CW_COMPLIANCE_MARGIN	= new DynaNode.Register(26,1);	
DynaNode.Registers.CCW_COMPLIANCE_MARGIN= new DynaNode.Register(27,1);
DynaNode.Registers.CW_COMPLIANCE_SLOPE 	= new DynaNode.Register(28,1);
DynaNode.Registers.CCW_COMPLIANCE_SLOPE = new DynaNode.Register(29,1);
DynaNode.Registers.GOAL_POSITION 		= new DynaNode.Register(30,2);
DynaNode.Registers.MOVING_SPEED 		= new DynaNode.Register(32,2);
DynaNode.Registers.TORQUE_LIMIT 		= new DynaNode.Register(34,2);
DynaNode.Registers.PRESENT_POSITION 	= new DynaNode.Register(36,2);
DynaNode.Registers.PRESENT_SPEED 		= new DynaNode.Register(38,2);
DynaNode.Registers.PRESENT_LOAD 		= new DynaNode.Register(40,2);
DynaNode.Registers.PRESENT_VOLTAGE 		= new DynaNode.Register(42,1);
DynaNode.Registers.PRESENT_TEMP 		= new DynaNode.Register(43,1);
DynaNode.Registers.REGISTERED_INS		= new DynaNode.Register(44,1);
DynaNode.Registers.RESERVED				= new DynaNode.Register(45,1);
DynaNode.Registers.MOVING 				= new DynaNode.Register(46,1);
DynaNode.Registers.LOCK 				= new DynaNode.Register(47,1);
DynaNode.Registers.PUNCH 				= new DynaNode.Register(48,2);

//Dynamixel Standard Instruction Codes
DynaNode.Instruction = DynaNode.Instruction || {};
DynaNode.Instruction.PING 		= 0x01;
DynaNode.Instruction.READ_DATA 	= 0x02;
DynaNode.Instruction.WRITE_DATA = 0x03;

//Dynamixel Model Numbers
DynaNode.ModelNumbers = DynaNode.ModelNumbers || {};
DynaNode.ModelNumbers.AX12 = 12;
DynaNode.ModelNumbers.RX64 = 64;
DynaNode.ModelNumbers.MX64 = 54;
DynaNode.ModelNumbers.EX106 = 107;
DynaNode.ModelNumbers.DX113 = 113;
DynaNode.ModelNumbers.DX116 = 116;
DynaNode.ModelNumbers.DX117 = 117;
DynaNode.ModelNumbers.AX18 = 18;
DynaNode.ModelNumbers.RX10 = 10;
DynaNode.ModelNumbers.RX24 = 24;
DynaNode.ModelNumbers.RX28 = 28;
DynaNode.ModelNumbers.MX28 = 29;
DynaNode.ModelNumbers.MX106 = 320;

//Dynamixel Status Return Levels
DynaNode.StatusReturnLevels = DynaNode.StatusReturnLevels || {};
DynaNode.StatusReturnLevels.NONE 		= 0;
DynaNode.StatusReturnLevels.READ_DATA 	= 1;
DynaNode.StatusReturnLevels.ALL 		= 2;

//Make a global list of all registers
DynaNode.AllRegisters = [];
DynaNode.AllRegisters.push(DynaNode.Registers.MODEL_NUMBER);
DynaNode.AllRegisters.push(DynaNode.Registers.FIRMWARE_VERSION);
DynaNode.AllRegisters.push(DynaNode.Registers.MOTOR_ID);
DynaNode.AllRegisters.push(DynaNode.Registers.BAUD_RATE);
DynaNode.AllRegisters.push(DynaNode.Registers.RETURN_DELAY_TIME);
DynaNode.AllRegisters.push(DynaNode.Registers.CW_ANGLE_LIMIT);
DynaNode.AllRegisters.push(DynaNode.Registers.CCW_ANGLE_LIMIT);
DynaNode.AllRegisters.push(DynaNode.Registers.MODE);
DynaNode.AllRegisters.push(DynaNode.Registers.HIGH_TEMP_LIMIT);
DynaNode.AllRegisters.push(DynaNode.Registers.LOW_VOLTAGE_LIMIT);
DynaNode.AllRegisters.push(DynaNode.Registers.HIGH_VOLTAGE_LIMIT);
DynaNode.AllRegisters.push(DynaNode.Registers.MAX_TORQUE);
DynaNode.AllRegisters.push(DynaNode.Registers.STATUS_RETURN_LEVEL);
DynaNode.AllRegisters.push(DynaNode.Registers.ALARM_LED);
DynaNode.AllRegisters.push(DynaNode.Registers.ALARM_SHUTDOWN);
DynaNode.AllRegisters.push(DynaNode.Registers.TORQUE_ENABLE);
DynaNode.AllRegisters.push(DynaNode.Registers.LED);
DynaNode.AllRegisters.push(DynaNode.Registers.CW_COMPLIANCE_MARGIN);
DynaNode.AllRegisters.push(DynaNode.Registers.CCW_COMPLIANCE_MARGIN);
DynaNode.AllRegisters.push(DynaNode.Registers.CW_COMPLIANCE_SLOPE);
DynaNode.AllRegisters.push(DynaNode.Registers.CCW_COMPLIANCE_SLOPE);
DynaNode.AllRegisters.push(DynaNode.Registers.GOAL_POSITION);
DynaNode.AllRegisters.push(DynaNode.Registers.TORQUE_LIMIT);
DynaNode.AllRegisters.push(DynaNode.Registers.MOVING_SPEED);
DynaNode.AllRegisters.push(DynaNode.Registers.PRESENT_POSITION);
DynaNode.AllRegisters.push(DynaNode.Registers.PRESENT_SPEED);
DynaNode.AllRegisters.push(DynaNode.Registers.PRESENT_LOAD);
DynaNode.AllRegisters.push(DynaNode.Registers.PRESENT_VOLTAGE);
DynaNode.AllRegisters.push(DynaNode.Registers.PRESENT_TEMP);
DynaNode.AllRegisters.push(DynaNode.Registers.REGISTERED_INS);
DynaNode.AllRegisters.push(DynaNode.Registers.RESERVED);
DynaNode.AllRegisters.push(DynaNode.Registers.MOVING);
DynaNode.AllRegisters.push(DynaNode.Registers.LOCK);
DynaNode.AllRegisters.push(DynaNode.Registers.PUNCH);

/* ReadParameter
 * Used to indicate the range of registers to read
 * stopRegister should be >= startRegister
 *
 * startRegister (DynaNode.Register)
 * stopRegister (DynaNode.Register)
*/
DynaNode.ReadParameter = function(startRegister,stopRegister) {
	var that = this;
	this.startRegisterID = startRegister.registerID;
	this.stopRegisterID = stopRegister.registerID;
	
	var numStopBytes = stopRegister.byteLength;
	
	this.getNumberOfBytes = function() {
		return that.stopRegisterID - that.startRegisterID + numStopBytes;
	};
};

/* WriteParameter
 * For listing values to write to motor
 * auto detects range, based on values input
 * 
 * startRegister (DynaNode.Register)
 * values = int or [int] (do not separate bytes manually)
*/
DynaNode.WriteParameter = function(startRegister,values) {
	var that = this;
	this.startRegister 	= startRegister;
	this.registerID 	= startRegister.registerID;
	this.values 		= values;
	this.valueBuffer	= new Buffer(0);
	
	//IF Sent a Single Number as Value
	if(!isNaN(values)) {
	
		if(this.startRegister.byteLength === 1) {
			var buff = new Buffer(1);
			buff.writeUInt8(parseInt(this.values),0);
			that.valueBuffer = Buffer.concat([that.valueBuffer,buff]);
		}
		
		if(this.startRegister.byteLength === 2) {
			var buff = new Buffer(2);
			buff.writeUInt16LE(parseInt(this.values),0);
			that.valueBuffer = Buffer.concat([that.valueBuffer,buff]);
		}
		
	} else {
		
		var cReg = that.registerID;
		
		for(var i=0; i<that.value.length; i++) {
			//Find The Register Object
			var reg = null;
			
			for(var j=0; j<DynaNode.AllRegisters.length; j++)
				if(DynaNode.AllRegisters[j].registerID === cReg) {
					reg = DynaNode.AllRegisters[j];
					break;
				}
			
			var len = reg.byteLength;
			cReg += len;
			var buff = new Buffer(len);
			if(len === 1 ) {
				buff.readUInt8(that.value[i],0);
			}
			if(len === 2) {
				buff.readUInt16LE(that.value[i],0);
			}
			that.valueBuffer = Buffer.concat([that.valueBuffer,buff]);
		}	
	}
};

/*
 * Class: DynaNode.InstructionPacket
 * Builds a packet to send to the Dynamixel Network.
 *   
 * dynamixelID (int)
 * instruction (DynaNode.Instructions.*)
 * parameter (DynaNode.ReadParameter or DynaNode.WriteParameter)
*/
DynaNode.InstructionPacket = function(dynamixelID,instruction,parameter) {
	var that = this;
	
	this.dynamixelID 	= dynamixelID;
	this.instruction 	= instruction;
	this.parameter 	= parameter;
	
	this.getBuffer = function() {
		
		if(this.instruction === DynaNode.Instruction.PING) {
			//0xFF 0xFF ID 0x02 0x01 Checksum
			var indx = 0;
			var checkSum = 0;
			var buffer = new Buffer(6);
			
			buffer.writeUInt8(0xFF,indx++);
			buffer.writeUInt8(0xFF,indx++);
			
			buffer.writeUInt8(that.dynamixelID,indx++);
			checkSum += that.dynamixelID;
			
			buffer.writeUInt8(0x02,indx++);
			checkSum += 0x02;
			
			buffer.writeUInt8(that.instruction,indx++);
			checkSum += that.instruction;
			
			buffer.writeUInt8((-1*(checkSum+1)) & 255,indx++);
			return buffer;
		}
		
		if(this.instruction === DynaNode.Instruction.READ_DATA && that.parameter instanceof DynaNode.ReadParameter) {
			//0xFF 0xFF ID 0x04 0x02 StartLocation AmountToRead Checksum
			var indx = 0;
			var checkSum = 0;
			var buffer = new Buffer(8);
			
			buffer.writeUInt8(0xFF,indx++);
			buffer.writeUInt8(0xFF,indx++);
			
			buffer.writeUInt8(that.dynamixelID,indx++);
			checkSum += that.dynamixelID;
			
			buffer.writeUInt8(0x04,indx++);
			checkSum += 0x04;
			
			buffer.writeUInt8(that.instruction,indx++);
			checkSum += that.instruction;
			
			buffer.writeUInt8(that.parameter.startRegisterID,indx++);
			checkSum += that.parameter.startRegisterID;
			
			var bts = that.parameter.getNumberOfBytes();
			buffer.writeUInt8(bts,indx++);
			checkSum += bts;
			
			buffer.writeUInt8((-1*(checkSum+1)) & 255,indx++);
			return buffer;
		}
		
		if(this.instruction === DynaNode.Instruction.WRITE_DATA && that.parameter instanceof DynaNode.WriteParameter) {
			//0xFF 0xFF ID (N+3) 0x03 StartingAddress [Data] Checksum
			var indx = 0;
			var checkSum = 0;
			var length = 3 + that.parameter.valueBuffer.length;
			var buffer = new Buffer(4 + length);
			
			buffer.writeUInt8(0xFF,indx++);
			buffer.writeUInt8(0xFF,indx++);
			
			buffer.writeUInt8(that.dynamixelID,indx++);
			checkSum += that.dynamixelID;
			
			buffer.writeUInt8(length,indx++);
			checkSum += length;
			
			buffer.writeUInt8(that.instruction,indx++);
			checkSum += that.instruction;
			
			buffer.writeUInt8(that.parameter.registerID,indx++);
			checkSum += that.parameter.registerID;
			
			for(var i=0;i<that.parameter.valueBuffer.length;i++) {
				buffer[indx++] = that.parameter.valueBuffer[i];
				checkSum += that.parameter.valueBuffer[i];
			}
			
			buffer.writeUInt8((-1*(checkSum+1)) & 255,indx++);
			return buffer;
		}
	};
};

/*
 * Class: DynaNode.ResponsePacket
 * Assembles a response based on Dynamixel feedback and original
 * request packet that was sent.
 *
 * bufferInput (Buffer) from Dynamixel 
 * sendPacket (DynaNode.InstructionPacket) that corresponds to sent command
*/
DynaNode.ResponsePacket = function(bufferInput,sendPacket) {
	var that = this;
	
	this.dynamixelID = 0;
	this.error = 0;
	this.data = [];
	this.isValid = false;
	
	//0xFF 0xFF ID LENGTH ERROR [Parameters] Checksum
	if(bufferInput.length >= 6 && sendPacket !== null) {
		var indx = 2;
		var checkSum = 0;
		
		that.dynamixelID = bufferInput.readUInt8(indx++);
		var length = bufferInput.readUInt8(indx++) - 2;
		that.error = bufferInput.readUInt8(indx++);
		checkSum += that.dynamixelID + (length+2) + that.error;
		
		var runningReg = sendPacket.parameter.startRegisterID;
		for(var i=0;i<length;i++) {
			//Find The Register
			var reg = null;
			for(var j=0;j<DynaNode.AllRegisters.length;j++)
				if(DynaNode.AllRegisters[j].registerID === runningReg) {
					reg = DynaNode.AllRegisters[j];
					break;
				}
			
			var val = 0;
			
			if(reg.byteLength == 1) {
				val = bufferInput.readUInt8(indx++);
				checkSum+=val;
				runningReg++;
			}
			if(reg.byteLength == 2) {
				val = bufferInput.readUInt16LE(indx);
				checkSum+=bufferInput[indx];
				checkSum+=bufferInput[indx+1];
				indx+=2;
				i++;
				runningReg+=2;
			}
			
			that.data.push(new DynaNode.Data(reg,val));
		}
		
		var rsum = bufferInput.readUInt8(indx++);
		checkSum = (-1*(checkSum+1)) & 255;
		
		if(checkSum === rsum)
			that.isValid = true;
		else
			that.isValid = false;
		
			
	} else {
		that.isValid = false;
	}
};


/**
 * Dynamixel class
 * Represents a single Dynamixel Motor. Has a ref to its Network.
 * Responsible for sending commands to read registers @ reg intervals.
 * IMPORTANT: only created by DynaNode.DynamixelNetwork, not directly
 * 
 *	dynaNetwork (DynaNode.DynamixelNetwork)
 *	motorID	(int)
 *
 *	Events
 *	registerUpdate	
 *	motorStatus
 */
DynaNode.Dynamixel = function(dynaNetwork,motorID){
    var that = this;
	this.motorID = motorID;
	
    var theNetwork = dynaNetwork;
    var motorData = []; motorData.length = 50;
	var regularPoll = null;
	var online = true;
	var lastUpdateTime = -1;
	
	DynaNode.Requires.Events.EventEmitter.call(this);
	

	this.initMotor = function() {
		//One-time Poll
		var param = new DynaNode.ReadParameter(DynaNode.Registers.MODEL_NUMBER,DynaNode.Registers.ALARM_SHUTDOWN);
		var ip = new DynaNode.InstructionPacket(that.motorID,DynaNode.Instruction.READ_DATA,param);
		theNetwork.writeInstructionPacket(ip);
		
		//Regular Polling (every 16ms)
		var rp = new DynaNode.ReadParameter(DynaNode.Registers.TORQUE_ENABLE,DynaNode.Registers.PUNCH);
		var rip = new DynaNode.InstructionPacket(that.motorID,DynaNode.Instruction.READ_DATA,rp);
		regularPoll = setInterval(function(){
			theNetwork.writeInstructionPacket(rip);
		},16);
		
		online = true;
		that.emit("motorStatus","online");
	};

	//Writes To Motor Register
    this.writeRegister = function(dynaData) {
		var param = new DynaNode.WriteParameter(dynaData.register,dynaData.value);
		var ip = new DynaNode.InstructionPacket(that.motorID,DynaNode.Instruction.WRITE_DATA,param);
		theNetwork.writeInstructionPacket(ip);
    };
    
    this.writeRegisters = function(startRegister,values) {
    	var param = new DynaNode.WriteParameter(startRegister,values);
    	var ip = new DynaNode.InstructionPacket(that.motorID,DynaNode.Instruction.WRITE_DATA,param);
    	theNetwork.writeInstructionPacket(ip);
    };
	    
    //Receives Data From Network
    this.updateRegister = function(dynaData) {
    	
    	lastUpdateTime = (new Date()).getTime();
    	var oldData = motorData[dynaData.register.registerID];
    	motorData[dynaData.register.registerID] = dynaData.value;
    	
    	if(oldData !== dynaData.value)
    		that.emit("registerUpdate",{register:dynaData.register.registerID, value:dynaData.value});
    };
    
    this.terminate = function() {
    	clearInterval(regularPoll);
    	online = false;
    	that.emit("motorStatus","offline");
    };
    
    this.isOnline = function() {
    	return online;
    };
    
    this.getLastUpdateTime = function() {
    	return lastUpdateTime;
    };
    
    this.getCurrentValue = function(registerAddress) {
    	if(registerAddress < motorData.length)
    		return motorData[registerAddress];
    	else
    		return null;
    };
    
};
DynaNode.Requires.Util.inherits(DynaNode.Dynamixel,DynaNode.Requires.Events.EventEmitter);


//----------A Few "static" methods for Dynamixel -------------------
DynaNode.Dynamixel.getBaudRateConversion = function(regValue) {
	return 2000000 / (regValue + 1);
};

DynaNode.Dynamixel.getReturnDelayTimeConversion = function(regValue) {
	return 2*regValue;
};

DynaNode.Dynamixel.getLoadConversion = function(regValue) {
	//BITS:	15 - 11			10			9-0
	//		   0         Direction   Load Value
	// 0 = CCW, 1 = CW
	var loadValue 	= regValue & 511;
	var cw 			= regValue & 2048 === 2048?1:-1;
	
	return cw*loadValue; 
};

DynaNode.Dynamixel.getVoltageConversion = function(regValue) {
	return (regValue *1.0) / 10.0;
};



/* DynamixelNetwork
 * Represents a single USB2Dynamixel or COM port connection to a
 * motor network. Use startRange/endRange to specify scanning range.
 *
 * portName (string) name of COM port for Dynamixel Network
 * startRange (int) <=endRange, >=0, <=253
 * endRange (int) >=startRange, >=0, <=253
 *
 * Events
 * portOpened - fires when the serial port is successfully opened
 * scanCompleted - fires after the motor network has been scaned
 * portClosed
 * motorAdded
*/
DynaNode.DynamixelNetwork = function(portName,startRange,endRange,timeout){
	var that = this;
	var port = null;
	
	var start = 1;
	var end = 253;
	
	var motors = [];
	var runningBuffer = new Buffer(0);
	var packetQueue = [];
	var currentPacket = null;
	var currentPacketTimeout = null;
	
	var portOpened = false;
	var inScanMode = true;
	var scanBuffer = new Buffer(0);
	var scanTimeout = 3000;
	
	timeout = parseInt(timeout);
	if(!isNaN(timeout))
		scanTimeout = timeout;
	

	//TODO: Add Custom Scan Ranges	
	if(startRange<=endRange && startRange>=1)
		start = startRange;
	if(endRange>=startRange && endRange<=253)
		end = endRange;
	
	DynaNode.Requires.Events.EventEmitter.call(this);
	port = DynaNode.Requires.ChildProcess.fork(DynaNode.Workers.SerialPort);
	
	console.log("start scanner");	
	port.on("message",function(m){
		console.log(m.action);
		if(m.action === "open") {
			portOpened = true;
			that.emit("portOpened");
			
			//Scan For Motors: 3 second timeout, checks 
			var ip = new DynaNode.InstructionPacket(0xFE,DynaNode.Instruction.PING);
			currentPacket = ip;
			that.writeInstructionPacketToPort(ip);
			
			//The timeout for the motor scan
			setTimeout(function() {
				inScanMode = false;
				currentPacket = null;
				that.emit("scanCompleted",motors);
			},scanTimeout);
			
		}
		
		if(m.action === "error") {
			portOpened = false;
			that.terminateAllMotors();
			if(port!==null) {
				port.kill();
				port = null;
			}
			
			if(inScanMode)
				that.emit("scanError");
				
			that.emit("portClosed");
		}
		
		if(m.action === "end") {
			portOpened = false;
			that.terminateAllMotors();
			if(port!==null) {
				port.kill();
				port = null;
			}
			that.emit("portClosed");
		}
		
		if(m.action === "close") {
			portOpened = false;
			that.terminateAllMotors();
			if(port!==null) {
				port.kill();
				port = null;
			}
			that.emit("portClosed");
		}
		
		if(m.action === "data" && inScanMode) {
			//Response To Scan
			var buffer = new Buffer(m.bufferData);
			scanBuffer = Buffer.concat([scanBuffer,buffer]);
			scanBuffer = that.removeStartGarbageFromBuffer(scanBuffer);
			var rb = that.extractPacketFromBuffer(scanBuffer);
			if(rb !== null && rb.length >= 3) {
				scanBuffer = scanBuffer.slice(rb.length-1);
				
				//Just Need An ID
				var theID = rb[2];
				
				//TODO: Check if motor exists first
				var dn = new DynaNode.Dynamixel(that,theID);
				motors.push(dn);
				that.emit("motorAdded",dn);
			}
		}
		
		if(m.action === "data" && !inScanMode) {
			var buffer = new Buffer(m.bufferData);
			runningBuffer = Buffer.concat([runningBuffer,buffer]);
			runningBuffer = that.removeStartGarbageFromBuffer(runningBuffer);
		
			var rb = that.extractPacketFromBuffer(runningBuffer);
			if(rb !== null) {
				runningBuffer = runningBuffer.slice(rb.length-1);
				var respPacket = new DynaNode.ResponsePacket(rb,currentPacket);
				currentPacket = null;
				clearTimeout(currentPacketTimeout);
				if(respPacket.isValid) {
			
					//Find Motor To Send Data To
					var sendTo = null;
					for(var i=0; i<motors.length; i++) {
					if(motors[i].motorID === respPacket.dynamixelID) {
							sendTo = motors[i];
							break;
						}
					}
			
					if(sendTo !== null) {
						//Send Response Data
						for(var i=0; i<respPacket.data.length; i++)
							sendTo.updateRegister(respPacket.data[i]);
					}
				}
				that.processQueue();	
			}	
		}		
	});
	
	//Creates the actual port connection
	port.send({action:"create",comName:portName,baudRate:1000000});
	
	this.removeStartGarbageFromBuffer = function(theBuffer) {
		var startIndex = 0;
		for(var i=0; i<theBuffer.length; i++) {
			if(theBuffer[i] === 0xFF && i+1 >= theBuffer.length) {
				startIndex = i;
				break;
			}
			
			if(i+1 < theBuffer.length && theBuffer[i] === 0xFF && theBuffer[i+1] === 0xFF) {
				startIndex = i;
				break;
			}
			startIndex = i;
		}
		return theBuffer.slice(startIndex);
	};
	
	this.extractPacketFromBuffer = function(theBuffer) {
		//0xFF 0xFF ID LENGTH ERROR [Parameters] CheckSum
		if(theBuffer.length < 6) {
			return null;
		}
		
		var len = (6+ (theBuffer[3] - 2));
		if(theBuffer.length < len) {
			return null;
		}
		
		return theBuffer.slice(0,len);
	};
	
	this.processQueue = function() {
		//Move On To Next Message In Queue
		for(var i=0; i<packetQueue.length; i++) {
			if(currentPacket !== null)
				break;
		
			if(packetQueue[i].instruction === DynaNode.Instruction.WRITE_DATA) {
				//Write without response expected
				that.writeInstructionPacketToPort(packetQueue[i]);
				packetQueue.splice(i,1);
				i--;
				continue;
			}
			if(packetQueue[i].instruction === DynaNode.Instruction.READ_DATA) {
				//Place in currentPacket, then write
				currentPacket = packetQueue[i];
				that.writeInstructionPacketToPort(packetQueue[i]);
				currentPacketTimeout = setTimeout(function(){
					that.readDataTimeout();	
				},128);
				packetQueue.splice(i,1);
				break;
			}	
		}	
	};
		
	this.writeInstructionPacket = function(instructionPacket) {
		if(!inScanMode) {
			packetQueue.push(instructionPacket);
			that.processQueue();
		}
	};
	
	this.readDataTimeout = function() {
		//Remove Current Waiting Object, Process Next In Queue
		currentPacket = null;
		that.processQueue();
	};
	
	
	
	this.writeInstructionPacketToPort = function(instructionPacket) {
		if(port!=null && port.connected)
			port.send({action:"transmit",message:instructionPacket.getBuffer()});
	};
	
	this.terminateAllMotors = function() {
		for(var i=0; i<motors.length; i++)
			motors[i].terminate();
	};
	
	this.terminate = function() {
		portOpened = false;
		that.terminateAllMotors();
		if(port!=null && port.connected)
			port.send({action:"disconnect"});
		if(port!==null) {
			port.kill();
			port = null;
		}
		that.emit("portClosed");	
	};
	
};
DynaNode.Requires.Util.inherits(DynaNode.DynamixelNetwork, DynaNode.Requires.Events.EventEmitter);

//"static" method for DynamixelNetwork, lists all COM ports on system
DynaNode.Utils = DynaNode.Utils || {};
DynaNode.Utils.getAllPorts = function(callBack) {
	var retPorts = [];
	DynaNode.Requires.SerialPort.list(function(err,ports){
		if(err) {
			callBack(retPorts);
		} else {
			for(var i=0;i<ports.length;i++) {
				retPorts.push(ports[i].comName);
			}
			callBack(retPorts);
		}
	});
};

module.exports = DynaNode;
