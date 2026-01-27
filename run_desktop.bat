@echo off
echo ========================================
echo TeleDrive Desktop Application
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.11 or higher
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist ".venv\" (
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

REM Create necessary directories
if not exist "data\" mkdir data
if not exist "data\uploads\" mkdir data\uploads
if not exist "data\temp\" mkdir data\temp
if not exist "data\backups\" mkdir data\backups
if not exist "logs\" mkdir logs

REM Run the desktop application
echo.
echo Starting TeleDrive Desktop...
echo.
python main.py

REM Deactivate virtual environment
deactivate

echo.
echo ========================================
echo TeleDrive closed
echo ========================================
pause
