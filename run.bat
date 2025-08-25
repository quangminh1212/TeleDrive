@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo           TeleDrive Launcher
echo ========================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found
python --version

:: Check if we're in the correct directory
if not exist "app\app.py" (
    echo ❌ Please run this script from the TeleDrive project root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo ✅ Project structure verified

:: Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo.
    echo 🔧 Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment exists
)

:: Activate virtual environment
echo.
echo 🔄 Activating virtual environment...
if exist ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
    if errorlevel 1 (
        echo ❌ Failed to activate virtual environment
        echo Trying manual PATH setup...
        set "PATH=%CD%\.venv\Scripts;%PATH%"
        set "VIRTUAL_ENV=%CD%\.venv"
    ) else (
        echo ✅ Virtual environment activated
    )
) else (
    echo ❌ Virtual environment activation script not found
    echo Setting up manual PATH...
    set "PATH=%CD%\.venv\Scripts;%PATH%"
    set "VIRTUAL_ENV=%CD%\.venv"
    echo ✅ Manual environment setup completed
)

:: Upgrade pip
echo.
echo 🔄 Upgrading pip...
python -m pip install --upgrade pip

:: Install/upgrade dependencies
echo.
echo 📦 Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)
echo ✅ Dependencies installed

:: Cleanup ports function
echo.
echo 🔍 Cleaning up ports...
call :cleanup_port 3000
call :cleanup_port 5000
call :cleanup_port 8000
echo ✅ Port cleanup completed

:: Create necessary directories
echo.
echo 📁 Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\temp" mkdir data\temp
if not exist "data\backups" mkdir data\backups
echo ✅ Directories created

:: Check if database exists, if not create it
echo.
echo 🗄️  Checking database...
if not exist "data\teledrive.db" (
    echo ℹ️  Database will be created on first run
) else (
    echo ✅ Database exists
)

:: Set environment variables
echo.
echo 🔧 Setting environment variables...
set "FLASK_APP=app.app"
set "FLASK_ENV=development"
set "PYTHONPATH=%CD%\app;%PYTHONPATH%"

:: Ensure Python uses UTF-8 encoding
set "PYTHONIOENCODING=utf-8"

:: Start the application
echo.
echo 🚀 Starting TeleDrive...
echo.
echo ========================================
echo           TeleDrive is starting
echo ========================================
echo.
echo 📱 Web Interface: http://localhost:3000
echo 📱 Alternative: http://127.0.0.1:3000
echo.
echo ⏹️  Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

:: Change to app directory and run the app
cd app
python app.py

:: If we get here, the app has stopped
echo.
echo ========================================
echo           TeleDrive stopped
echo ========================================
echo.
echo 💡 To restart, run run.bat again
echo.
pause
exit /b 0

:: Port cleanup function
:cleanup_port
set "port=%1"
echo 🔧 Checking port %port%...

:: Find processes using the port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%port% "') do (
    set "pid=%%a"
    if defined pid (
        if not "!pid!"=="0" (
            echo ⚠️  Found process !pid! using port %port%
            echo 🗡️  Killing process !pid!...
            taskkill /f /pid !pid! >nul 2>&1
            if errorlevel 1 (
                echo ❌ Failed to kill process !pid!
            ) else (
                echo ✅ Process !pid! killed successfully
            )
        )
    )
)

:: Additional cleanup for listening sockets
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%port% "') do (
    set "pid=%%a"
    if defined pid (
        if not "!pid!"=="0" (
            echo ⚠️  Found listening process !pid! on port %port%
            echo 🗡️  Killing listening process !pid!...
            taskkill /f /pid !pid! >nul 2>&1
            if errorlevel 1 (
                echo ❌ Failed to kill listening process !pid!
            ) else (
                echo ✅ Listening process !pid! killed successfully
            )
        )
    )
)

:: Wait a moment for ports to be fully released
timeout /t 1 >nul 2>&1
echo ✅ Port %port% cleanup completed
exit /b 0 