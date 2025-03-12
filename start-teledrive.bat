@echo off
echo Starting TeleDrive application...

:: Set path to Node.js
set NODE_PATH=C:\Program Files\nodejs\node.exe

:: Check if Node.js is installed
if not exist "%NODE_PATH%" (
    echo Node.js is not found at %NODE_PATH%.
    echo Please check if Node.js is installed correctly.
    goto :EOF
)

:: Start the server
echo Server is starting at http://localhost:3000
echo Press Ctrl+C to stop the server
"%NODE_PATH%" server.js

pause 