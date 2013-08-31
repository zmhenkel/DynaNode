var MotorProfile = function(name,resolution,ds,de) {
	var self = this;
	
	this.name = name;
	this.resolution = resolution;
	this.degreeStart = ds;
	this.degreeEnd = de;
};

MotorProfile.Templates = {};
MotorProfile.Templates.AX12 = new MotorProfile("AX-12",0.29,0,300);
MotorProfile.Templates.AX12W = new MotorProfile("AX-12W",0.29,0,300);
MotorProfile.Templates.AX18 = new MotorProfile("AX-18",0.29,0,300);
MotorProfile.Templates.DX113 = new MotorProfile("DX-113",0.29,0,300);
MotorProfile.Templates.DX116 = new MotorProfile("DX-116",0.29,0,300);
MotorProfile.Templates.DX117 = new MotorProfile("DX-117",0.29,0,300);
MotorProfile.Templates.RX10 = new MotorProfile("RX-10",0.29,0,300);
MotorProfile.Templates.RX24F = new MotorProfile("RX-24F",0.29,0,300);
MotorProfile.Templates.RX28 = new MotorProfile("RX-28",0.29,0,300);
MotorProfile.Templates.RX64 = new MotorProfile("RX-64",0.29,0,300);
MotorProfile.Templates.EX106 = new MotorProfile("EX-106",0.06,0,251);
MotorProfile.Templates.MX28 = new MotorProfile("MX-28",0.088,0,360);
MotorProfile.Templates.MX64 = new MotorProfile("MX-64",0.088,0,360);
MotorProfile.Templates.MX106 = new MotorProfile("MX-106",0.088,0,360);

MotorProfile.getTemplate = function(modelNumber) {
	if(modelNumber === 0x0C)
		return MotorProfile.Templates.AX12;
	if(modelNumber === 0x2C)
		return MotorProfile.Templates.AX12W;
	if(modelNumber === 0x12)
		return MotorProfile.Templates.AX18;
	if(modelNumber === 0x71)
		return MotorProfile.Templates.DX113;
	if(modelNumber === 0x74)
		return MotorProfile.Templates.DX116;
	if(modelNumber === 0x75)
		return MotorProfile.Templates.DX117;
	if(modelNumber === 0x6B)
		return MotorProfile.Templates.EX106;
	if(modelNumber === 0x1D)
		return MotorProfile.Templates.MX28;
	if(modelNumber === 0x36)
		return MotorProfile.Templates.MX64;
	if(modelNumber === 0x40)
		return MotorProfile.Templates.MX106;
	if(modelNumber === 0x0A)
		return MotorProfile.Templates.RX10;
	if(modelNumber === 0x18)
		return MotorProfile.Templates.RX24F;
	if(modelNumber === 0x1C)
		return MotorProfile.Templates.RX28;
	if(modelNumber === 0x40)
		return MotorProfile.Templates.RX64;
		
	return new MotorProfile("Unknown Motor!",0.0,0,0);
};



module.exports = MotorProfile;