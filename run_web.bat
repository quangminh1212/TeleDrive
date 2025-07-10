@echo off
echo Starting TeleDrive Web Interface...

REM Check if virtual environment exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM Start the web application
python app.py

pause
