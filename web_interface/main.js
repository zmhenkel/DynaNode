var app = require('http').createServer(handler);
var io = require('socket.io').listen(app,{log:false});
var fs = require('fs');
var path = require("path");
var MotorSystem = require(path.join(path.dirname(fs.realpathSync(__filename)), '../MotorSystem'));
var ms = new MotorSystem();
var url = require('url');
var path = require('path');
ms.addToBlackList("/dev/tty.Bluetooth-PDA-Sync");
ms.addToBlackList("/dev/tty.Bluetooth-Modem");

app.listen(8001);

//------ Simple Page Server ------------
function handler (request, response) {
  var uri = url.parse(request.url).pathname
    , filename = path.join("./", uri);

  path.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }

    if (fs.statSync(filename).isDirectory()) filename += '/index.html';

    fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      response.writeHead(200);
      response.write(file, "binary");
      response.end();
    });
  });
}

//----- Socket.io Responses --------------
var motors = [];
io.sockets.on('connection', function (socket) {
	
	//On Connect: Send Motors + Registers
	var mtrs = ms.getMotors();
	for(var i=0; i<mtrs.length; i++) {
		socket.emit("addMotor",{id:mtrs[i].getID()});
		socket.emit("addRegisters",{id:mtrs[i].getID(),registers:mtrs[i].listRegisters()});
	}
	
	socket.on("updateRegister",function(d){
		var motorid = d.motor;
		var registerName = d.register;
		var value = d.value;
		var mtr = null;
		
		for(var i=0; i<motors.length; i++) {
			if(motors[i].getID() === motorid) {
				mtr = motors[i];
				break;
			}
		}
		
		if(mtr!== null) {
			mtr.setRegisterValue(registerName,value);
		}
		
	});
			
});


//------ Motor System Operation ---------
ms.on("motorAdded",function(m) {
	console.log("motor added - "+m.motor.getID());
	var mid = m.motor.getID();
	motors.push(m.motor);
	
	io.sockets.emit("addMotor",{id:m.motor.getID()});
	io.sockets.emit("addRegisters",{id:m.motor.getID(),registers:m.motor.listRegisters()});
	
	m.motor.on("valueUpdated",function(d) {
		io.sockets.emit("valueUpdated",{id:mid,register:d.name,value:d.value});
	});
});

ms.on("motorRemoved",function(m) {
	console.log("motor removed - "+m.id);
	for(var i=0; i<motors.length; i++) {
		if(motors[i].getID() === m.id) {
			motors.splice(i,1);
			i--;
		}
	}
	io.sockets.emit("removeMotor",{id:m.id});
});

ms.init();

process.on('SIGINT', function() {
	ms.terminate();
	process.exit(0);
});


