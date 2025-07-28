@echo off
title TeleDrive - Development Server
color 0A

echo.
echo ================================================================
echo                    TELEDRIVE DEVELOPMENT SERVER
echo ================================================================
echo.

echo [INFO] Starting development server on port 3000...
echo [INFO] Environment: Development
echo [INFO] Debug mode: Enabled
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.8+
    pause
    exit /b 1
)

REM Check if dependencies are installed
echo [INFO] Checking dependencies...
python -c "import flask" 2>nul
if errorlevel 1 (
    echo [WARN] Flask not found. Installing dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo [INFO] Dependencies OK
echo.

REM Create necessary directories
if not exist uploads mkdir uploads
if not exist output mkdir output
if not exist logs mkdir logs

echo [INFO] Directory structure ready
echo.

echo ================================================================
echo 🚀 STARTING TELEDRIVE WEB INTERFACE
echo ================================================================
echo.
echo 🌐 Local:            http://localhost:3000
echo 🌐 Network:          http://0.0.0.0:3000
echo.
echo 📁 Main Dashboard:   http://localhost:3000
echo ⚙️  Settings:        http://localhost:3000/settings  
echo 📡 Channel Scanner:  http://localhost:3000/scan
echo.
echo 💡 Features Available:
echo    • Google Drive-like interface
echo    • Telegram channel scanning
echo    • File upload/download
echo    • Real-time progress tracking
echo    • Mobile responsive design
echo.
echo 🔧 Development Mode:
echo    • Auto-reload on file changes
echo    • Debug information enabled
echo    • Error details in browser
echo.
echo ⏹️  Press Ctrl+C to stop the server
echo ================================================================
echo.

REM Start the Flask development server
python app.py

echo.
echo ================================================================
echo 🛑 DEVELOPMENT SERVER STOPPED
echo ================================================================
echo.
echo Thank you for using TeleDrive!
echo.
pause
