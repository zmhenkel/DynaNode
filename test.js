/*	test.js - Test Program for DynaNode (console app)
 *	
 */

console.log("start test program");
var MotorSystem = require("./MotorSystem");

var ms = new MotorSystem();
ms.addToBlackList("/dev/tty.Bluetooth-PDA-Sync");
ms.addToBlackList("/dev/tty.Bluetooth-Modem");

ms.on("motorAdded",function(d) {
	d.motor.on("valueUpdated",function(m){
		console.log("value updated: "+d.motor.getID()+" "+m.name+":"+m.value);
	});
	console.log("motor added "+d.motor.getID());
});

ms.init();

process.on('SIGINT', function() {
	console.log("shutdown command");
	ms.terminate();
});