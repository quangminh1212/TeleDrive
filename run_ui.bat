@echo off
echo ========================================
echo    TeleDrive - Web UI Launcher
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ and try again
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install Flask and dependencies if not already installed
echo Checking dependencies...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo Installing Flask and dependencies...
    pip install flask flask-cors
)

REM Create UI assets directory and copy logo
if not exist "ui\assets" mkdir ui\assets
if exist "logo.png" (
    if not exist "ui\assets\logo.png" (
        copy logo.png ui\assets\logo.png >nul
        echo Logo copied to UI assets
    )
)

REM Start the UI server
echo.
echo Starting TeleDrive Web UI...
echo Open your browser and go to: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
python ui_server.py

pause
