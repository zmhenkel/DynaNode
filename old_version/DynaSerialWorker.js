/* 	DynaSerialWorker - v0.1
 *	2013-02-09 - dynaNode@zmhenkel.com - Zachary Henkel
 *  Free to use without restriction.
 *
 *	This worker is used as a wrapper around serialport objects.
 * 	This is primarily because serialport objects have difficulty closing
 * 	properly on some systems. By wrapping them in their own process, we can
 * 	ensure the process is killed, and the port released. 
 *
 *	Additionally, the serialport library sometimes behaves oddly if 
 * 	many ports are opened within the same process. This allows each
 *	port to have its own process with IPC with the main program.
*/
var serialPortRequire = require("serialport");

var currentPort = null;
var portConnected = false;

function shutdownSPWorker() {
	try {
		if(currentPort !== null) {
			currentPort.close();
	}
	}catch(err){ }
	
	process.exit(0);
};

process.on("message",function(m){
	if(m.action === "create" && currentPort === null) {
		currentPort = new serialPortRequire.SerialPort(m.comName,{baudrate:m.baudRate});
		
		currentPort.on("open",function(){
			portConnected = true;
			if(process.connected)
				process.send({action:"open"});
			else
				shutdownSPWorker();
		});
		
		currentPort.on("data",function(d){
			var b = new Buffer(d);
			if(process.connected)
				process.send({action:"data" ,bufferData:b});
			else
				shutdownSPWorker();
		});
		
		currentPort.on("error",function(e){
			if(process.connected)
				process.send({action:"error",error:e});
			else
				shutdownSPWorker();
		});
		
		currentPort.on("end",function(){
			if(process.connected) {
				process.send({action:"end"});
				portConnected = false;
			} else {
				shutdownSPWorker();
			}
		});
		
		currentPort.on("close",function(){
			if(process.connected) {
				process.send({action:"close"});
				portConnected = false;
			} else {
				shutdownSPWorker();
			}
		});
		
	}
	
	if(m.action === "isConnected") {
		if(process.connected)
			process.send({action:"isConnected",isConnected:portConnected});
		else
			shutdownSPWorker();
	}
	
	if(m.action === "transmit") {
		if(currentPort !== null) {
			currentPort.write(m.message);
		}
	}
	
	if(m.action === "disconnect") {
		if(currentPort !== null) {
			shutdownSPWorker();
		}
	}
});

setInterval(function() {
	if(!process.connected)
		shutdownSPWorker();
},2000);