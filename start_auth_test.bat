@echo off
title TeleDrive Authentication Test
color 0B

echo ========================================
echo    TeleDrive Authentication Test
echo ========================================
echo.

REM Activate virtual environment
if exist "venv\" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
)

echo.
echo Installing required packages...
pip install flask flask-cors flask-login flask-sqlalchemy requests --quiet

echo.
echo ========================================
echo Starting TeleDrive with Authentication
echo ========================================
echo.
echo Server will start at: http://localhost:5000
echo.
echo First time setup:
echo 1. Go to http://localhost:5000/setup
echo 2. Create admin account
echo 3. Login with your credentials
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py
