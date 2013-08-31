DynaNode
========

Dynamixel Library for Node.js

This library supports using Dynamixel Servo motors in Node.js. It currently provides abstractions for a DynamixelNetwork (like a single USB2Dynamixel) and for each Dynamixel motor. 

To get started, the library enables fast scanning of all COM ports for DynamixelNetworks. Once a network is found, it is scanned for motors. Identified motors are setup for automatic polling, and a motor object with an event emitter is passed back. Using the motor object you can send commands to the motors, read current values, or subscribe to auto emitted updates.

The library wraps each serial port connection to a network in its own child process, to ensure reliability with the serialport library.

This project is an ongoing tool that I am using as part of my PhD research. Though my applications are very specific, I've tried to provide a comprehensive library for all Dynamixel Servos. 