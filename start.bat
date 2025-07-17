@echo off
setlocal enabledelayedexpansion
title TeleDrive Web Interface Launcher
color 0B

echo.
echo ================================================================
echo                 TELEDRIVE WEB INTERFACE
echo ================================================================
echo.

REM Check Python
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found!
    echo 💡 Please install Python from: https://python.org/downloads/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo ✅ %%i ready
)

echo.
echo [2/5] Checking virtual environment...
if not exist "venv\" (
    echo ⚠️ Virtual environment not found!
    echo 🔧 Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment!
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment found
)

echo.
echo [3/5] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ Failed to activate virtual environment!
    pause
    exit /b 1
) else (
    echo ✅ Virtual environment activated
)

echo.
echo [4/5] Installing/checking Flask dependencies...
python -c "import flask, flask_cors" 2>nul
if errorlevel 1 (
    echo 📦 Installing Flask and Flask-CORS...
    pip install flask flask-cors
    if errorlevel 1 (
        echo ❌ Failed to install Flask dependencies!
        echo 💡 Try running: pip install --upgrade pip
        pause
        exit /b 1
    )
    echo ✅ Flask dependencies installed
) else (
    echo ✅ Flask dependencies ready
)

echo.
echo [5/5] Checking scan data...
if not exist "output\" (
    echo ⚠️ Output directory not found!
    echo 💡 Run the scanner first to generate data
    mkdir output
    echo ✅ Created output directory
) else (
    set count=0
    for %%f in (output\*_telegram_files.json) do set /a count+=1
    
    if !count!==0 (
        echo ⚠️ No scan data found in output directory!
        echo 💡 The web interface will be empty until you run a scan
        echo.
        echo You can still start the web interface to see the UI
        echo.
    ) else (
        echo ✅ Found !count! scan session(s) in output directory
    )
)

echo.
echo ================================================================
echo 🚀 STARTING WEB INTERFACE...
echo ================================================================
echo.
echo 🌐 Web interface will be available at: http://localhost:5000
echo 🛑 Press Ctrl+C to stop the server
echo 📁 Data displayed from: output/ directory
echo.
echo 💡 Keep this window open to keep the server running
echo 🔄 The page will auto-refresh when new scan data is available
echo.

REM Start Flask application
python app.py

echo.
echo ================================================================
echo 🛑 WEB INTERFACE STOPPED
echo ================================================================
echo.
echo Thank you for using TeleDrive Web Interface!
pause
