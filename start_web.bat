@echo off
title TeleDrive Web Interface Launcher
color 0B

echo.
echo ================================================================
echo                 TELEDRIVE WEB INTERFACE
echo ================================================================
echo.

REM Check Python
echo [1/4] Checking Python installation...
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
echo [2/4] Installing/checking Flask dependencies...
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
echo [3/4] Checking scan data...
if not exist "output\" (
    echo ⚠️ Output directory not found!
    echo 💡 Run the scanner first to generate data
    mkdir output
    echo ✅ Created output directory
) else (
    echo ✅ Output directory found
)

echo.
echo [4/4] Starting web interface...
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
