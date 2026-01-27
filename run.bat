@echo off
chcp 65001 >nul

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
for %%p in (3000 5000 8000) do (
    echo 🔧 Checking port %%p...
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p "') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)
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

:: Start the application with logging
echo.
echo ========================================
echo      🚀 Starting TeleDrive...
echo ========================================
echo.
echo 📱 Web Interface: http://localhost:3000
echo 📱 Alternative: http://127.0.0.1:3000
echo.
echo ⏹️  Press Ctrl+C to stop the server
echo 📝 Logs are being written to log.txt
echo.
echo ========================================
echo.

:: Run with Python logging script
python run_with_log.py

:: If we get here, the app has stopped
echo.
echo ========================================
echo      TeleDrive stopped
echo ========================================
echo.
echo 💡 To restart, run: run.bat
echo 💡 Check log.txt for detailed logs
echo.
pause
exit /b 0
