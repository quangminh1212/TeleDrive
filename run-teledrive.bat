@echo off
echo Setting up and running TeleDrive...

:: Set Node.js paths
set PATH=%PATH%;C:\Program Files\nodejs
set NODE_PATH=C:\Program Files\nodejs\node_modules

:: Install basic dependencies
echo Installing basic dependencies...
call npm install --no-optional

:: Start the server
echo Starting TeleDrive server at http://localhost:3000
echo Press Ctrl+C to stop the server
node server.js

pause 