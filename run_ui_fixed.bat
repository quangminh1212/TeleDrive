@echo off
chcp 65001 >nul
title TeleDrive UI Server - Fixed Version

echo.
echo ========================================
echo    TeleDrive UI Server - Fixed Version
echo ========================================
echo.

echo 🔧 Checking Python environment...
python --version
if %errorlevel% neq 0 (
    echo ❌ Python not found! Please install Python 3.8+
    pause
    exit /b 1
)

echo.
echo 🔧 Checking virtual environment...
if not exist "venv\Scripts\activate.bat" (
    echo ❌ Virtual environment not found!
    echo 💡 Please run setup.bat first
    pause
    exit /b 1
)

echo ✅ Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo 🔧 Checking required files...
if not exist "ui_server.py" (
    echo ❌ ui_server.py not found!
    pause
    exit /b 1
)

if not exist "config.json" (
    echo ❌ config.json not found!
    echo 💡 Please run config.bat first
    pause
    exit /b 1
)

echo.
echo 🔧 Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "output" mkdir output
if not exist "ui\assets" mkdir ui\assets

echo.
echo 🚀 Starting TeleDrive UI Server (Fixed Version)...
echo.
echo 📱 The web interface will be available at:
echo    http://localhost:5003
echo.
echo ⏹️  Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

python ui_server.py

echo.
echo 🔧 Server stopped.
pause
