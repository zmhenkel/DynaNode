console.log("start test program");
var MotorSystem = require("./MotorSystem");

var ms = new MotorSystem();

ms.on("motorAdded",function(d) {
	d.motor.on("valueUpdated",function(m){
		//console.log("value updated: "+d.motor.getID()+" "+m.name+":"+m.value);
	});
	console.log("motor added "+d.motor.getID());
});

ms.on("networkAdded",function(n) {
	console.log("network added - "+n.name);
});

ms.on("networkRemoved",function(n) {
	console.log("network removed - "+n.name);
});


setTimeout(function() {
	console.log("shutdown command");
	ms.terminate();
},20000);