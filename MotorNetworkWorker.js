/*	MotorNetworkWorker.js - internal child process for
 *	monitoring Dynamixel networks and sending updates.
 *
 *
 *	NOTE: This implementation uses several internal representations
 *	of objects instead of using the descriptions from other files.
 * 	These are somewhat optimized versions to help with limiting overhead.
 */

var Logger = require("./Logger");
var now = function() {
	return (new Date()).getTime();
};

function Register(name,address,numBytes,freq,motorid) {
	this.name = name;
	this.address = address;
	this.numBytes = numBytes;
	this.value = null;
	this.frequency = freq;
	this.lastQueryTime = -1*freq;
	this.motorID = parseInt(""+motorid);
	this.readBytes = new Buffer(8,'hex');
	this.readBytes.writeUInt8(0xFF,0);
	this.readBytes.writeUInt8(0xFF,1);
	this.readBytes.writeUInt8(this.motorID,2);
	this.readBytes.writeUInt8(0x04,3)
	this.readBytes.writeUInt8(0x02,4);
	this.readBytes.writeUInt8(address,5);
	this.readBytes.writeUInt8(numBytes,6);
	this.readBytes.writeUInt8((-1*(this.motorID+0x04+0x02+address+numBytes+1)) & 255,7)
};

function Motor(id) {
	this.id = id;
	this.model = null;
	this.lastContact = now();
	this.waitingThread = null;
	this.readRegisters = [];
	this.pendingRead = null;
};

var SerialPort = require("serialport").SerialPort;
var port = null;
var runningBuffer = new Buffer(0,'hex');
var pingLoop = null;
var statLoop = null;
var motors = [];
var registers = [];
var terminated = false;
var dataAnalysis = false;
var requests = 0;
var hits = 0;
var lastSendTime = 0;

var blockingRegister = null;
var timeoutThread = null;
var motorRemoveThread = null;

var pingBytes = new Buffer(6);
pingBytes.writeUInt8(0xFF,0);
pingBytes.writeUInt8(0xFF,1);
pingBytes.writeUInt8(0xFE,2);
pingBytes.writeUInt8(0x02,3);
pingBytes.writeUInt8(0x01,4);
pingBytes.writeUInt8((-1*(0xFE+0x02+0x01+1)) & 255,5);






var Shutdown = function() {
	terminated = true;
	motors = [];
	try {
		clearInterval(motorRemoveThread);
		clearInterval(timeoutThread);
		clearInterval(pingLoop);
		clearInterval(statLoop);
		
		if(port !==null)
			port.close();
		
		
	} catch(err){
		//console.log(err);
	}
	
	Send({action:"terminated"});
	process.exit(0);	
};

var Send = function(msg) {
	if(process.connected) {
		process.send(msg);
	}
};

var writePort = function(msg) {
	var td = now() - lastSendTime;
	while(td < 4) {
		td = now() - lastSendTime;	
	}
	port.write(msg);
	lastSendTime = now();
}

statLoop = setInterval(function() {
	Send({action:"statUpdate",requests:requests,hits:hits});
},5000);

var mout = false;
motorRemoveThread = setInterval(function(){
	
	for(var i=0; i<motors.length; i++) {
		var currentTime = now();
		if( (currentTime - motors[i].lastContact) > 1000) {
			mout = true;
			var motorID = motors[i].id;
			
			//Remove All Registers
			for(var j=0; j<registers.length; j++) {
				if(registers[j].motorID === motorID) {
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


var removeBufferGarbage = function(buff) {
	var startIndex = -1;
	for(var i=0; i<buff.length; i++) {
		if(buff[i] === 0xFF && i+1 >= buff.length) {
			startIndex = i;
			break;
		}
	
		if(i+1 < buff.length && buff[i] === 0xFF && buff[i+1]===0xFF) {
			startIndex = i;
			break;
		}
	}
	
	if(startIndex >= 0) {
		var retb = new Buffer(buff.length-startIndex,'hex');
		buff.copy(retb,0,startIndex);
		return retb;
	} else {
		return new Buffer(0,'hex');
	}
};

var extractPacket = function(buff) {

	runningBuffer = removeBufferGarbage(runningBuffer);
	if(runningBuffer.length < 6) {
		return null;
	}

	//3+len+1 =
	//var len = (5+ (buff[3] - 2));
	var len = 3 + runningBuffer[3] +1;
	if(len > 16) {
		Logger.log("> 16 length!");
		Logger.log(runningBuffer.toString('hex')+" .. "+runningBuffer.length);
		var nb = new Buffer(runningBuffer.length-1,'hex');
		runningBuffer.copy(nb,0,1,runningBuffer.length);
		runningBuffer = nb;
		runningBuffer = removeBufferGarbage(runningBuffer);		
		return extractPacket(runningBuffer);
	}
	
	if(runningBuffer.length < len) {
		return null;
	}
	
	
	
	var retb = new Buffer(len,'hex');
	runningBuffer.copy(retb,0,0,len);
	
	var nrb = new Buffer(runningBuffer.length-retb.length);
	runningBuffer.copy(nrb,0,retb.length,runningBuffer.length);
	runningBuffer = nrb;
	
	return retb;	
};

function createTimeout(register) {
	timeoutThread = setTimeout(function(){
		if(blockingRegister === register) {
			blockingRegister.lastQueryTime = -.5*blockingRegister.frequency;
			blockingRegister = null;
			mainLoop();
		}
	},32);
};

var prevWrite = "";
var mainLoop = function() {
	
	if(blockingRegister !== null)
		return;
		
	//Sort Registers
	registers.sort(function(a,b){
		var aNQ = a.lastQueryTime + a.frequency;
		var bNQ = b.lastQueryTime + b.frequency;
		return aNQ - bNQ;
	});
	
	if(registers.length >0 && blockingRegister === null) {
		requests++;
		blockingRegister = registers[0];
		//console.log(blockingRegister.motorID+":"+blockingRegister.name)
		prevWrite = "WRITE: "+blockingRegister.readBytes.toString('hex');
		writePort(blockingRegister.readBytes);
		clearTimeout(timeoutThread);
		createTimeout(registers[0]);
	}
};

var getRegisters = function(modelNumber,motorid) {
	var regs = [];
	
	//Base Registers
	regs.push(new Register("firmwareVersion",0x02,1,86400000,motorid));
	regs.push(new Register("baudRate",0x04,1,86400000,motorid));
	regs.push(new Register("returnDelayTime",0x05,1,86400000,motorid));
	regs.push(new Register("cwAngleLimit",0x06,2,86400000,motorid));
	regs.push(new Register("ccwAngleLimit",0x08,2,86400000,motorid));
	regs.push(new Register("highTempLimit",0x0B,1,86400000,motorid));
	regs.push(new Register("lowVoltageLimit",0x0C,1,86400000,motorid));
	regs.push(new Register("highVoltageLimit",0x0D,1,86400000,motorid));
	regs.push(new Register("maxTorque",0x0E,2,86400000,motorid));
	regs.push(new Register("statusReturnLevel",0x10,1,86400000,motorid));
	regs.push(new Register("alarmLED",0x11,1,500,motorid));
	regs.push(new Register("alarmShutdown",0x12,1,500,motorid));
	regs.push(new Register("torqueEnable",0x18,1,86400000,motorid));
	regs.push(new Register("led",0x19,1,86400000,motorid));
	regs.push(new Register("cwComplianceMargin",0x1A,1,86400000,motorid));
	regs.push(new Register("ccwComplianceMargin",0x1B,1,86400000,motorid));
	regs.push(new Register("cwComplianceSlope",0x1C,1,86400000,motorid));
	regs.push(new Register("ccwComplianceSlope",0x1D,1,86400000,motorid));
	regs.push(new Register("goalPosition",0x1E,2,86400000,motorid));
	regs.push(new Register("movingSpeed",0x20,2,86400000,motorid));
	regs.push(new Register("torqueLimit",0x22,2,86400000,motorid));
	regs.push(new Register("presentPosition",0x24,2,16,motorid));
	regs.push(new Register("presentSpeed",0x26,2,16,motorid));
	regs.push(new Register("presentLoad",0x28,2,16,motorid));
	regs.push(new Register("presentVoltage",0x2A,1,250,motorid));
	regs.push(new Register("presentTemp",0x2B,1,250,motorid));
	regs.push(new Register("registered",0x2C,1,86400000,motorid));
	regs.push(new Register("moving",0x2E,1,86400000,motorid));
	regs.push(new Register("lock",0x2F,1,86400000,motorid));
	regs.push(new Register("punch",0x30,2,86400000,motorid));
	
	//AX,DX, RX Series -- Standard Table
	
	//EX-106
	if( modelNumber === 0x6B) {
		regs.push(new Register("driveMode",0x0A,1,86400000,motorid));
		regs.push(new Register("sensedCurrent",0x38,2,86400000,motorid));
	}
	
	//MX Series
	if(modelNumber === 0x1D || modelNumber === 0x36 || modelNumber === 0x40) {
		//Add PID
		regs[16] = new Register("dGain",0x1A,1,86400000,motorid);
		regs[17] = new Register("iGain",0x1B,1,86400000,motorid);
		regs[18] = new Register("pGain",0x1C,1,86400000,motorid);
		regs.splice(19,1);
		regs.push(new Register("goalAcceleration",0x49,1,86400000,motorid));
	}
	
	//MX-64 / MX-106
	if(modelNumber === 0x36 || modelNumber === 0x40) {
		regs.push(new Register("current",0x44,2,86400000,motorid));
		regs.push(new Register("torqueControlEnable",0x46,1,86400000,motorid));
		regs.push(new Register("goalTorque",0x47,2,86400000,motorid));
	}
	
	return regs;
};


process.on("message",function(m){
	
	//On Initialization Message:
	if(m.action === "init") {
	
		//Create a serial port
		port = new SerialPort(m.portName,{baudRate:m.baudRate});
		
		//Port Events:
		
		port.on("open",function(){
			Send({action:"opened"});
			
			//Start Ping Loop
			pingLoop = setInterval(function(){
				//Look For Motors
				if(port!== null) {
					writePort(pingBytes);
				}
			},1000);
			
		});
		
		port.on("data",function(d){
			dataAnalysis = true;
			var b = new Buffer(d,'hex');
			
			
			//Concat To Buffer
			runningBuffer = Buffer.concat([runningBuffer,b]);
			
			
			//Remove Garbage From Buffer
			//runningBuffer = removeBufferGarbage(runningBuffer);
			//While Packets(Extract Packet From Buffer)
			var packet = extractPacket(runningBuffer);
			
			while(packet !== null) {
				
				//Handle PING Responses
				if(packet.length === 6) {
					
					//Status Response Packet
					if(packet[3] === 0x00) {
						console.log("status return packet");
						packet = extractPacket(runningBuffer);
						continue;
					}
					
					
					var theID = packet[2];
					var exist = false;
					var existing = null;
					for(var i=0; i<motors.length; i++) {
						if(motors[i].id === theID) {
							exist = true;
							existing = motors[i];
							motors[i].lastContact = now();
							break;
						}
					}
					
					if(mout)
						Logger.log("ping response - "+theID);
					
					if(!exist) {
						if(theID > 254 || theID<1) {
							packet = extractPacket(runningBuffer);
							continue;
						}
					
						Logger.log("***** NEW MOTOR ******"+theID);
						//Add Motor + Notify
						var mtr = new Motor(theID);
						motors.push(mtr);
						
						
						//Get Motor Model
						var mmr = new Register("modelNumber",0x00,2,86400000,theID);
						mtr.lastContact = now();
						mtr.readRegisters.push(mmr);
						registers.push(mmr);
						mainLoop();
						
						Send({action:"motorEncountered",motor:theID});
						
					} else {
						if(mout) {
							Logger.log("already exists? "+theID+" wmodel: "+existing.model);
							Logger.log(prevWrite);
							}				
					}
					mainLoop();
				}
				
				//Handle Data Responses
				if(packet.length > 6) {
				
					var indx = 2;
					var rsum = 0;
					var id = packet.readUInt8(indx++);
					rsum += id;
					var len = packet.readUInt8(indx++)-2;
					rsum += len + 2;
					var error = packet.readUInt8(indx++);
					
					var data = 0;
					if(len==1) {
						data = packet.readUInt8(indx++);
						rsum += data;
					}
					if(len==2) {
						data = packet.readUInt16LE(indx);
						rsum += packet[indx];
						rsum += packet[indx+1];
						indx+=2;
					}
					
					rsum = (-1*(rsum+1)) & 255;
					var checksum = packet.readUInt8(indx++);
					
					if(checksum === rsum) {
						hits++;
						blockingRegister.lastQueryTime = now();
						//Valid Data
						var mtr = null;
						for(var i=0; i<motors.length; i++) {
							if(motors[i].id === id) {
								mtr = motors[i];
								break;
							}
						}
						
						if(mtr !== null) {
							
							if(mtr.id !== blockingRegister.motorID) {
								Logger.log("ids don't match - expecting:"+blockingRegister.motorID);
								Logger.log(packet.toString('hex'));
								Logger.log(prevWrite);
							}
							
							var currentRead = blockingRegister;
							
							clearTimeout(timeoutThread);
							var address = currentRead.address;
							var name = currentRead.name;
							mtr.pendingRead = null;
							blockingRegister = null;
							mtr.lastContact = now();
							
							if(mtr.model!==null && currentRead.value !== data) {
								currentRead.value = data;
								Send({action:"valueUpdated",motor:id,name:name,value:data});
							} 
							
							//If it's the motor model, load in template
							if(address === 0x00 && mtr.model=== null) {
								//Load The Template
								currentRead.value = data;
								mtr.readRegisters = getRegisters(data,id);
								
								
								var rr = registers.concat(mtr.readRegisters);
								registers = rr;	
								mtr.model = data;
								var regNames = [];
								for(var i=0; i<registers.length; i++) {
									if(registers[i].motorID === id) {
										regNames.push({	name:registers[i].name,
														address:registers[i].address,
														bytes:registers[i].numBytes,
														frequency:registers[i].frequency,
														value:registers[i].value});
									}
								}
								
								Send({action:"motorAdded",motor:id,registers:regNames});
							}
							
							//Process Next Read
							mainLoop();
						} else {
						
							Logger.log("motor is null!");
							blockingRegister.lastQueryTime = -1*blockingRegister.frequency;
							clearTimeout(timeoutThread);
							blockingRegister = null;
							mainLoop();
						}
						
						
					} else {
						Logger.log("INVALID!");
						Logger.log(packet.toString('hex')+" expect "+rsum);
						//INVALID
						//console.log("invalid!");
						blockingRegister.lastQueryTime = -1*blockingRegister.frequency;
						clearTimeout(timeoutThread);
						blockingRegister = null;
						mainLoop();
					}
				
				}
				
				packet = extractPacket(runningBuffer);
			}
			mainLoop();	
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
	
	if(m.action === "shutdown") {
		Shutdown();
	}
	
	if(m.action === "updateReadFrequency") {
		//motorID, registerAddress, newFrequency
		for(var i=0; i<registers.length; i++) {
			if(registers[i].motorID === m.motorID && registers[i].address === m.address) {
				registers[i].frequency = m.frequency;
				registers[i].lastQueryTime = 0;
				Send({action:"frequncyUpdated",motor:m.motorID,name:registers[i].name,frequency:m.frequency});
				break;
			}
		}
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
			writePort(buff);
		}
		
		var mtr = null;
		for(var i=0; i< motors.length; i++) {
			if(motors[i].id === m.motorID) {
				mtr = motors[i];
			}
		}
		
		if(mtr !== null) {
			var reg = null;
			for(var i=0; i<mtr.readRegisters.length; i++) {
				if(mtr.readRegisters[i].address === m.address) {
					mtr.readRegisters[i].lastQueryTime = 0;
					break;
				}
			}
		}
		
	}
});