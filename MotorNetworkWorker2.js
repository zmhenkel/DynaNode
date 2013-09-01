var runningBuffer = new Buffer(0,'hex');
var registers = [];
var motors = [];
var SerialPort = require("serialport").SerialPort;
var port = null;
var terminated = false;
var pingBytes = new Buffer(6);
var Logger = require("./Logger");
pingBytes.writeUInt8(0xFF,0);
pingBytes.writeUInt8(0xFF,1);
pingBytes.writeUInt8(0xFE,2);
pingBytes.writeUInt8(0x02,3);
pingBytes.writeUInt8(0x01,4);
pingBytes.writeUInt8((~(0xFE+0x02+0x01)) & 255,5);

var pingLoop = null;
var removeMotorLoop = null;

var pendingRegisterRead = null;

var now = function() {
	return (new Date()).getTime();
};

var Send = function(msg) {
	if(process.connected) {
		process.send(msg);
	}
};

var Write = function(msg) {
	port.write(msg);
};

var Shutdown = function() {
	console.log("shutdown triggered");
	terminated = true;
	motors = [];
	try {
		clearInterval(pingLoop);
		clearInterval(mainLoop);
		clearInterval(removeMotorLoop)
		if(port !==null)
			port.close();
		
		
	} catch(err){
	
	}
	
	Send({action:"terminated"});
	process.exit(0);	
};

function Register(name,address,numBytes,freq,motor) {
	this.name = name;
	this.address = address;
	this.numBytes = numBytes;
	this.value = null;
	this.frequency = freq;
	this.lastReadTime = -.7*freq;
	this.motor = motor;
	this.readBytes = new Buffer(8,'hex');
	this.readBytes.writeUInt8(0xFF,0);
	this.readBytes.writeUInt8(0xFF,1);
	this.readBytes.writeUInt8(motor.id,2);
	this.readBytes.writeUInt8(0x04,3)
	this.readBytes.writeUInt8(0x02,4);
	this.readBytes.writeUInt8(address,5);
	this.readBytes.writeUInt8(numBytes,6);
	this.readBytes.writeUInt8((~(motor.id+0x04+0x02+address+numBytes)) & 255,7)
};

function Motor(id) {
	this.id = id;
	this.lastContact = now();
	this.knowModel = false;
};

var getRegisters = function(modelNumber,motor) {
	var regs = [];
	
	//Base Registers
	regs.push(new Register("firmwareVersion",0x02,1,86400000,motor));
	regs.push(new Register("baudRate",0x04,1,86400000,motor));
	regs.push(new Register("returnDelayTime",0x05,1,86400000,motor));
	regs.push(new Register("cwAngleLimit",0x06,2,86400000,motor));
	regs.push(new Register("ccwAngleLimit",0x08,2,86400000,motor));
	regs.push(new Register("highTempLimit",0x0B,1,86400000,motor));
	regs.push(new Register("lowVoltageLimit",0x0C,1,86400000,motor));
	regs.push(new Register("highVoltageLimit",0x0D,1,86400000,motor));
	regs.push(new Register("maxTorque",0x0E,2,86400000,motor));
	regs.push(new Register("statusReturnLevel",0x10,1,86400000,motor));
	regs.push(new Register("alarmLED",0x11,1,500,motor));
	regs.push(new Register("alarmShutdown",0x12,1,500,motor));
	regs.push(new Register("torqueEnable",0x18,1,100,motor));
	regs.push(new Register("led",0x19,1,100,motor));
	regs.push(new Register("cwComplianceMargin",0x1A,1,86400000,motor));
	regs.push(new Register("ccwComplianceMargin",0x1B,1,86400000,motor));
	regs.push(new Register("cwComplianceSlope",0x1C,1,86400000,motor));
	regs.push(new Register("ccwComplianceSlope",0x1D,1,86400000,motor));
	regs.push(new Register("goalPosition",0x1E,2,100,motor));
	regs.push(new Register("movingSpeed",0x20,2,100,motor));
	regs.push(new Register("torqueLimit",0x22,2,86400000,motor));
	regs.push(new Register("presentPosition",0x24,2,16,motor));
	regs.push(new Register("presentSpeed",0x26,2,16,motor));
	regs.push(new Register("presentLoad",0x28,2,16,motor));
	regs.push(new Register("presentVoltage",0x2A,1,250,motor));
	regs.push(new Register("presentTemp",0x2B,1,250,motor));
	regs.push(new Register("registered",0x2C,1,86400000,motor));
	regs.push(new Register("moving",0x2E,1,100,motor));
	regs.push(new Register("lock",0x2F,1,86400000,motor));
	regs.push(new Register("punch",0x30,2,86400000,motor));
	
	//AX,DX, RX Series -- Standard Table
	
	//EX-106
	if( modelNumber === 0x6B) {
		regs.push(new Register("driveMode",0x0A,1,86400000,motor));
		regs.push(new Register("sensedCurrent",0x38,2,86400000,motor));
	}
	
	//MX Series
	if(modelNumber === 0x1D || modelNumber === 0x36 || modelNumber === 0x40) {
		//Add PID
		regs[16] = new Register("dGain",0x1A,1,86400000,motor);
		regs[17] = new Register("iGain",0x1B,1,86400000,motor);
		regs[18] = new Register("pGain",0x1C,1,86400000,motor);
		regs.splice(19,1);
		regs.push(new Register("goalAcceleration",0x49,1,86400000,motor));
	}
	
	//MX-64 / MX-106
	if(modelNumber === 0x36 || modelNumber === 0x40) {
		regs.push(new Register("current",0x44,2,86400000,motor));
		regs.push(new Register("torqueControlEnable",0x46,1,86400000,motor));
		regs.push(new Register("goalTorque",0x47,2,86400000,motor));
	}
	
	return regs;
};

var getPacketsFromBuffer = function() {
	//0xFF 0xFF ID LENGTH ERROR PARAMS CHECKSUM
	//IF LENGTH == 0 -> Status Packet
	var packets = [];
	
	while(4 < runningBuffer.length) {
		if(runningBuffer[0] !== 0xFF || runningBuffer[1] !== 0xFF) {
			//Not 0xFF 0xFF, Remove 1 and try again
			var nb = new Buffer(runningBuffer.length-1,'hex');
			runningBuffer.copy(nb,0,1,runningBuffer.length);
			runningBuffer = nb;
			continue;
		} else {
			var id = runningBuffer[2];
			var length = runningBuffer[3];

			//If the buffer is too long, remove a starting byte and try again
			//If the dynamixel id is out of range, remove a byte and replay
			if(length > 16 || id>254 || id <1) {
				var nb = new Buffer(runningBuffer.length-1,'hex');
				runningBuffer.copy(nb,0,1,runningBuffer.length);
				runningBuffer = nb;
				continue;
			} else if(4+length > runningBuffer.length) {
				//The packet hasn't fully arrived yet... we'll be back on next data event.
				break;
			} else {
				//The Buffer is structurally OK, copy it and place in packets
				var buff = new Buffer(4+length,'hex');
				runningBuffer.copy(buff,0,0,4+length);
				packets.push(buff);
				
				//Remove The bytes we used from the running buffer
				var nb = new Buffer(runningBuffer.length-(4+length),'hex');
				runningBuffer.copy(nb,0,(4+length),runningBuffer.length);
				runningBuffer = nb;
			}
		}	
	}
	return packets;
};


var appendIncomingToBuffer = function(inData) {
	//Concat inData to running buffer
	var b = new Buffer(inData,'hex');
	var nb = Buffer.concat([runningBuffer,b]);
	runningBuffer = nb;
};

var readTimeout = null;
var createTimeout = function(ts) {
	
	readTimeout = setTimeout(function(){
		if(pendingRegisterRead !== null && pendingRegisterRead.ts === ts) {
			pendingRegisterRead.lastReadTime = now();
			Logger.log("Read Time Out Occurred: "+ pendingRegisterRead.motor.id+"/"+pendingRegisterRead.name);
			pendingRegisterRead = null;
		} else {
		}
	},16);
};

var refetch = function() {
	clearTimeout(readTimeout);
	if(pendingRegisterRead !== null) {
		pendingRegisterRead.lastReadTime = now();
		Logger.log("Refetch Issued: "+pendingRegisterRead.motor.id+"/"+pendingRegisterRead.name);
	}
	pendingRegisterRead = null;
	
};

var mainLoop = setInterval(function() {
	if(!terminated) {
		if(pendingRegisterRead === null) {
			//Sort
			registers.sort(function(a,b){
				var aNQ = a.lastReadTime + a.frequency;
				var bNQ = b.lastReadTime + b.frequency;
				return aNQ - bNQ;
			});
			
			if(registers.length >0) {
				pendingRegisterRead = registers[0];
				pendingRegisterRead.ts = now();
				createTimeout(pendingRegisterRead.ts);
				Write(pendingRegisterRead.readBytes);
				//Logger.log("R: "+pendingRegisterRead.motor.id+"/"+pendingRegisterRead.name);
			}
		} else {
			//Logger.log("Blocked By:"+pendingRegisterRead.motor.id+"/"+pendingRegisterRead.name);
		}		
	} else {
		Logger.log("TERMINATED!");
	}	
},4);

removeMotorLoop = setInterval(function(){
	for(var i=0; i<motors.length; i++) {
		var currentTime = now();
		if( (currentTime - motors[i].lastContact) > 1000) {
			mout = true;
			var motorID = motors[i].id;
			
			//Remove All Registers
			for(var j=0; j<registers.length; j++) {
				if(registers[j].motor.id === motorID) {
					registers.splice(j,1);
					j--;
				}
			}
			
			//Remove Motor
			for(var j=0; j<motors.length; j++) {
				if(motors[j].id === motorID) {
					motors.splice(j,1);
					j--;
				}
			}
			
			//Trigger Event
			Send({action:"motorRemoved",motor:motorID});
		}
	}	
},1000);


process.on("message",function(m){
	
	//On Initialization Message:
	if(m.action === "init") {
		port = new SerialPort(m.portName,{baudRate:m.baudRate});
		
		port.on("open",function(){
			Send({action:"opened"});
			//Start PING Loop
			pingLoop = setInterval(function(){
				Write(pingBytes);
			},1000);
		});
		
		port.on("data",function(d){
			appendIncomingToBuffer(d);
			var packets = getPacketsFromBuffer();
			for(var j=0; j<packets.length; j++) {
				
				var p = packets[j];
				
				//Process the packet
				
				//Unknown Response (Packet Size < 6)
				if(p.length < 6) {
					Logger.log("Unknown Packet Size <6: "+p.toString('hex'));
				}
				
				//PING / STATUS Responses (Packet Size = 6)
				if(p.length === 6) {
					var id = p[2];
					var len = p[3];
					var err = p[4];
					var cs = p[5];
					
					var rs = (-1*(id+len+1)) & 255;
					
					//Validate CheckSum
					if(rs === cs) {
						var mtr = null;
						for(var i=0; i<motors.length; i++) {
							if(motors[i].id === id) {
								mtr = motors[i];
								break;
							}
						}
						
						if(mtr!== null && mtr.knowModel) {
							mtr.lastContact = now();
						}
						
						if(mtr=== null) {
							//Add Motor To Motors
							var m = new Motor(id);
							motors.push(m);
							
							//Add Model To Register Search
							Logger.log("Acquiring Details for "+m.id);
							registers.push(new Register("modelNumber",0x00,2,86400000,m));
						}
						
					} else {
						Logger.log("Invalid Status Packet: "+p.toString('hex'));
					}
				}
				
				//READ Responses (Packet Size > 6)
				if(p.length > 6) {
					if(pendingRegisterRead === null) {
						Logger.log("Unexpected Packet!");
						continue;
					}
				
					var rs = 0;
					var indx = 2;
					var id = p[indx++];
					rs+= id;
					var len = p[indx++];
					rs+=len;
					var err = p[indx++];
					
					var data = 0;
					if(len-2 === 1) {
						data = p.readUInt8(indx++);
						rs+= data;
					}
					if(len-2 === 2 && indx+1<p.length) {
						data = p.readUInt16LE(indx);
						rs+= p[indx];
						rs+= p[indx+1];
						indx+=2;
					}
					var cs = 0;
					if(indx < p.length) {
						cs = p[indx];
					}
					
					rs = (-1*(rs+1)) & 255;
					
					if(cs === rs) {
						//VALID Read Packet
						
						//Verify Sender
						if(id !== pendingRegisterRead.motor.id) {
							Logger.log("Packet does not match expected sender: "+p.toString('hex'));
							refetch();
						} else {
							//Clear The Block
							pendingRegisterRead.lastReadTime = now();
							pendingRegisterRead.motor.lastContact = now();
							var read = pendingRegisterRead;
							clearTimeout(readTimeout);
							pendingRegisterRead = null;
						
							//Check if it's a load for registers
							if(read.address === 0x00 && read.motor.knowModel===false) {
								//Load up the registers for this motor, send notice
								read.value = data;
								var regs = getRegisters(data,read.motor);
								var rr = registers.concat(regs);
								registers = rr;
								read.motor.knowModel = true;
								
								var regNames = [];
								for(var i=0; i<registers.length; i++) {
									if(registers[i].motor.id === id) {
										regNames.push({	name:registers[i].name,
														address:registers[i].address,
														bytes:registers[i].numBytes,
														frequency:registers[i].frequency,
														value:registers[i].value});
									}
								}
								Send({action:"motorAdded",motor:id,registers:regNames});
								
							} else {
								//Just a regular update
								
								if(read.value !== data) {
									read.value = data;
									Send({action:"valueUpdated",motor:id,name:read.name,value:data});
								}
							}
						}
					} else {
						//Invalid Packet
						Logger.log("Invalid Packet by Checksum: "+p.toString('hex')+" "+rs+"/"+cs);
						refetch();
					}	
				}
				
					
			}
		});
		
		
		port.on("error",function(){
			if(!terminated)
				Shutdown();
		});
		
		port.on("end",function(){
			if(!terminated)
				Shutdown();
		});
		
		port.on("close",function(){
			if(!terminated)
				Shutdown();
		});
		
	}
	
	if(m.action === "writeRegister") {
		var buff = new Buffer(7 + m.numBytes,'hex');
		var indx = 0;
		buff.writeUInt8(0xFF,indx++);
		buff.writeUInt8(0xFF,indx++);
		buff.writeUInt8(m.motorID,indx++);
		buff.writeUInt8(3+m.numBytes,indx++);
		buff.writeUInt8(0x03,indx++);
		buff.writeUInt8(m.address,indx++);
		var data = 0;
		if(m.numBytes === 1) {
			buff.writeUInt8(m.value,indx++);
			data += m.value;
		}
		if(m.numBytes === 2) {
			buff.writeUInt16LE(m.value,indx);
			indx+=2;
			data += buff[6];
			data += buff[7];
		}
		buff.writeUInt8((-1*(m.motorID+3+m.numBytes+0x03+m.address+data+1)) & 255,indx++);
		
		if(port!==null) {
			Write(buff);
		}
	}
	
	if(m.action === "updateFrequency") {
		for(var i=0; i<registers.length; i++) {
			if(registers[i].motor.id === m.motorID && registers[i].address === m.address) {
				registers[i].frequency = m.frequency;
				registers[i].lastQueryTime = 0;
				Send({action:"frequncyUpdated",motor:m.motorID,name:registers[i].name,frequency:m.frequency});
				break;
			}
		}
	}
	
	if(m.action === "shutdown") {
		if(!terminated)
			Shutdown();
	}
	
	
});


