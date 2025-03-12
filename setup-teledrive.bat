@echo off
echo Setting up TeleDrive project...

:: Set paths to Node.js
set NODE_PATH=C:\Program Files\nodejs\node.exe
set NPM_PATH=C:\Program Files\nodejs\npm.cmd

:: Check if Node.js is installed
if not exist "%NODE_PATH%" (
    echo Node.js is not found at %NODE_PATH%.
    echo Please check if Node.js is installed correctly.
    goto :EOF
)

:: Check Node.js version
echo Node.js version:
"%NODE_PATH%" -v

:: Check npm version  
echo npm version:
"%NPM_PATH%" -v

:: Install dependencies
echo Installing dependencies...
"%NPM_PATH%" install

echo.
echo Setup complete! You can now run the application with:
echo    start-teledrive.bat
echo.

pause 