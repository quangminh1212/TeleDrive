@echo off
echo Starting TeleDrive...
echo.

echo Checking Python...
python --version
if errorlevel 1 (
    echo Python not found! Please install Python 3.8+
    pause
    exit /b 1
)

echo.
echo Checking config.json...
if not exist config.json (
    echo config.json not found!
    pause
    exit /b 1
)

echo.
echo Creating directories...
if not exist output mkdir output
if not exist logs mkdir logs
if not exist data mkdir data

echo.
echo Starting TeleDrive Web Interface...
echo Access at: http://localhost:3000
echo.

python start_server.py

pause
