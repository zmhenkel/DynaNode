var DynaNode = require("./dynanode");

console.log("--start program--");

DynaNode.Utils.getAllPorts(function(rp){
	for(var i=0;i<rp.length;i++) {
		createDN(rp[i]);	
	}	
});

function createDN(comName) {
	console.log("Creating DynamixelNetwork for: "+comName);
	var dn = new DynaNode.DynamixelNetwork(comName,1,253);
	
	//Once scan is done, display how many motors
	dn.on("scanCompleted",function(m){
		console.log("found "+m.length+" motors on "+comName);
		dn.terminate();		
	});
	
	//If there is an error, report it
	dn.on("scanError",function(){
		console.log("the device on "+comName+" doesn't appear to be a DynamixelNetwork.");
		dn.terminate();
	});
	
};