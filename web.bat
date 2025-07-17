@echo off
title TeleDrive Web - Quick Start
color 0B

echo ========================================
echo    TeleDrive Web Interface
echo ========================================
echo.

REM Quick check and start
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install flask flask-cors --quiet

echo.
echo Starting web interface at http://localhost:5000
echo Press Ctrl+C to stop
echo.

python app.py
