DynaNode
========

Dynamixel Library for Node.js

This library supports using Dynamixel Servo motors in Node.js.

The library automatically scans for USB2Dynamixel devices and attached motors. Once a motor is detected, its registers are read on a consistent schedule, and the values are pushed out over event emitters. The library also supports sending commands to the motors and adjusting the frequency of register reads. 

The polling time for a single register is very fast (~1ms) as long as the latency timer for the USB2Dynamixel is set to 1ms. In its current form the library sometimes struggles with motors with a very low return delay time. 250us seems to work well. 
 

The library wraps each serial port connection in its own child process, to ensure reliability with the serialport library across platforms.


I will continue to update this library, but consider it experimental at this point. I am planning to deploy it on a research robot soon, so the library should progress to something more reliable and stable over time.
