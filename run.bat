@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo        TeleDrive - Build & Run
echo ========================================
echo.

:: Check if setup has been run
if not exist ".venv" (
    echo ❌ Virtual environment not found!
    echo.
    echo Please run setup.bat first to install the project:
    echo    setup.bat
    echo.
    pause
    exit /b 1
)

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
echo.

:: Check if we're in the correct directory
if not exist "app\app.py" (
    echo ❌ Please run this script from the TeleDrive project root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo ✅ Project structure verified
echo.

:: Activate virtual environment
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
echo.

:: Check for updates in requirements
echo 🔄 Checking dependencies...
pip install -r requirements.txt --quiet --upgrade
if errorlevel 1 (
    echo ⚠️  Warning: Some dependencies may not be up to date
    echo Continuing anyway...
) else (
    echo ✅ Dependencies up to date
)
echo.

:: Cleanup ports
echo 🔍 Cleaning up ports...
call :cleanup_port 3000
call :cleanup_port 5000
call :cleanup_port 8000
echo ✅ Port cleanup completed
echo.

:: Create necessary directories
echo 📁 Ensuring directories exist...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\temp" mkdir data\temp
if not exist "data\backups" mkdir data\backups
if not exist "output" mkdir output
echo ✅ Directories ready
echo.

:: Check database
echo 🗄️  Checking database...
if not exist "data\teledrive.db" (
    echo ℹ️  Database will be created on first run
) else (
    echo ✅ Database exists
)
echo.

:: Set environment variables
echo 🔧 Setting environment variables...
set "FLASK_APP=app.app"
set "FLASK_ENV=development"
set "PYTHONPATH=%CD%\app;%PYTHONPATH%"
set "PYTHONIOENCODING=utf-8"
echo ✅ Environment configured
echo.

:: Start the application
echo.
echo ========================================
echo      🚀 Starting TeleDrive...
echo ========================================
echo.
echo 📱 Web Interface: http://localhost:3000
echo 📱 Alternative: http://127.0.0.1:3000
echo.
echo ⏹️  Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

:: Change to app directory and run
cd app
python app.py

:: If we get here, the app has stopped
cd ..
echo.
echo ========================================
echo      TeleDrive stopped
echo ========================================
echo.
echo 💡 To restart, run: run.bat
echo.
pause
exit /b 0

:: Port cleanup function
:cleanup_port
set "port=%1"
echo 🔧 Checking port %port%...

:: Find and kill processes using the port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%port% "') do (
    set "pid=%%a"
    if defined pid (
        if not "!pid!"=="0" (
            echo ⚠️  Found process !pid! using port %port%
            taskkill /f /pid !pid! >nul 2>&1
            if errorlevel 1 (
                echo ❌ Failed to kill process !pid!
            ) else (
                echo ✅ Process !pid! killed
            )
        )
    )
)

:: Additional cleanup for listening sockets
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%port% "') do (
    set "pid=%%a"
    if defined pid (
        if not "!pid!"=="0" (
            taskkill /f /pid !pid! >nul 2>&1
        )
    )
)

timeout /t 1 >nul 2>&1
exit /b 0 