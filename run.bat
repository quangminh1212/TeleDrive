@echo off
title TeleDrive
echo Starting TeleDrive...

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found! Please install Python 3.7+
    pause
    exit /b 1
)

REM Install dependencies if needed
python -c "import telethon, PIL" >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Run app
python main.py
pause
