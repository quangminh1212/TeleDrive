@echo off
echo Starting TeleDrive Desktop App...

REM Check if virtual environment exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM Start the desktop application
python app_desktop.py

pause
