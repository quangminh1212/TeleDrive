@echo off
title TeleDrive - Telegram File Scanner
color 0B

echo.
echo ================================================================
echo                    TELEDRIVE PROJECT
echo              Telegram File Scanner ^& Manager
echo ================================================================
echo.

echo [STEP 1/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.8+ from: https://python.org/downloads/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo OK: %%i ready
)

echo.
echo [STEP 2/4] Checking config.json...
if not exist config.json (
    echo ERROR: config.json not found!
    echo Please create config.json file first
    pause
    exit /b 1
) else (
    echo OK: config.json found
)

echo.
echo [STEP 3/4] Checking dependencies...
python -c "import telethon, flask, sqlalchemy, flask_socketio, flask_login, flask_wtf; print('OK: All dependencies ready')" 2>nul
if errorlevel 1 (
    echo WARNING: Missing some dependencies!
    echo Installing dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Cannot install dependencies!
        echo Please run: pip install -r requirements.txt
        pause
        exit /b 1
    )
    echo OK: Dependencies installed
) else (
    echo OK: All dependencies ready
)

echo.
echo [STEP 4/5] Creating directories...
if not exist output mkdir output
if not exist logs mkdir logs
if not exist data mkdir data
echo OK: Directories ready

echo.
echo [STEP 5/5] Killing existing processes...
echo Stopping any existing TeleDrive processes...

REM Kill Python processes (simple approach)
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im pythonw.exe >nul 2>&1

REM Kill processes using port 3000 (simple approach)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 "') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM Wait 2 seconds for processes to terminate
ping 127.0.0.1 -n 3 >nul

echo OK: Existing processes stopped

echo.
echo ================================================================
echo                 STARTING TELEDRIVE WEB INTERFACE
echo ================================================================
echo.
echo Access at: http://localhost:3000
echo Dashboard: http://localhost:3000
echo Settings: http://localhost:3000/settings
echo Scanner: http://localhost:3000/scan
echo.
echo Press Ctrl+C to stop the server
echo ================================================================
echo.

REM Start web interface
python start_server.py

echo.
echo ================================================================
echo                    TELEDRIVE COMPLETED
echo ================================================================
echo.
echo Results saved in: 'output/' folder
echo Logs saved in: 'logs/' folder
echo Configuration: 'config.json'
echo.
echo Web Interface: http://localhost:3000
echo CLI: Run 'python source/main.py' for Command Line
echo.
echo Thank you for using TeleDrive!
echo.
echo Press any key to exit...
pause >nul
