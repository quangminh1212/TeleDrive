@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: Delete old log file and create new one
if exist "log.txt" del /f /q "log.txt"
echo [%date% %time%] ========================================= >> log.txt
echo [%date% %time%] TeleDrive - Build & Run Started >> log.txt
echo [%date% %time%] ========================================= >> log.txt
echo. >> log.txt

echo.
echo ========================================
echo        TeleDrive - Build & Run
echo ========================================
echo.

:: Check if setup has been run
echo [%date% %time%] Checking virtual environment... >> log.txt
if not exist ".venv" (
    echo [%date% %time%] ERROR: Virtual environment not found >> log.txt
    echo ❌ Virtual environment not found!
    echo.
    echo Please run setup.bat first to install the project:
    echo    setup.bat
    echo.
    pause
    exit /b 1
)
echo [%date% %time%] Virtual environment found >> log.txt

:: Check if Python is installed
echo [%date% %time%] Checking Python installation... >> log.txt
python --version >nul 2>&1
if errorlevel 1 (
    echo [%date% %time%] ERROR: Python not found in PATH >> log.txt
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found
python --version
python --version >> log.txt 2>&1
echo [%date% %time%] Python version check completed >> log.txt
echo.

:: Check if we're in the correct directory
echo [%date% %time%] Verifying project structure... >> log.txt
echo [%date% %time%] Current directory: %CD% >> log.txt
if not exist "app\app.py" (
    echo [%date% %time%] ERROR: app\app.py not found >> log.txt
    echo ❌ Please run this script from the TeleDrive project root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo ✅ Project structure verified
echo [%date% %time%] Project structure verified >> log.txt
echo.

:: Activate virtual environment
echo 🔄 Activating virtual environment...
echo [%date% %time%] Activating virtual environment... >> log.txt
if exist ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
    if errorlevel 1 (
        echo [%date% %time%] WARNING: Failed to activate virtual environment, using manual setup >> log.txt
        echo ❌ Failed to activate virtual environment
        echo Trying manual PATH setup...
        set "PATH=%CD%\.venv\Scripts;%PATH%"
        set "VIRTUAL_ENV=%CD%\.venv"
    ) else (
        echo [%date% %time%] Virtual environment activated successfully >> log.txt
        echo ✅ Virtual environment activated
    )
) else (
    echo [%date% %time%] WARNING: activate.bat not found, using manual setup >> log.txt
    echo ❌ Virtual environment activation script not found
    echo Setting up manual PATH...
    set "PATH=%CD%\.venv\Scripts;%PATH%"
    set "VIRTUAL_ENV=%CD%\.venv"
    echo ✅ Manual environment setup completed
)
echo.

:: Check for updates in requirements
echo 🔄 Checking dependencies...
echo [%date% %time%] Installing/updating dependencies... >> log.txt
pip install -r requirements.txt --quiet --upgrade >> log.txt 2>&1
if errorlevel 1 (
    echo [%date% %time%] WARNING: Some dependencies may not be up to date >> log.txt
    echo ⚠️  Warning: Some dependencies may not be up to date
    echo Continuing anyway...
) else (
    echo [%date% %time%] Dependencies installed successfully >> log.txt
    echo ✅ Dependencies up to date
)
echo.

:: Cleanup ports
echo 🔍 Cleaning up ports...
echo [%date% %time%] Starting port cleanup... >> log.txt
call :cleanup_port 3000
call :cleanup_port 5000
call :cleanup_port 8000
echo [%date% %time%] Port cleanup completed >> log.txt
echo ✅ Port cleanup completed
echo.

:: Create necessary directories
echo 📁 Ensuring directories exist...
echo [%date% %time%] Creating necessary directories... >> log.txt
if not exist "logs" (
    mkdir logs
    echo [%date% %time%] Created logs directory >> log.txt
)
if not exist "data" (
    mkdir data
    echo [%date% %time%] Created data directory >> log.txt
)
if not exist "data\uploads" (
    mkdir data\uploads
    echo [%date% %time%] Created data\uploads directory >> log.txt
)
if not exist "data\temp" (
    mkdir data\temp
    echo [%date% %time%] Created data\temp directory >> log.txt
)
if not exist "data\backups" (
    mkdir data\backups
    echo [%date% %time%] Created data\backups directory >> log.txt
)
if not exist "output" (
    mkdir output
    echo [%date% %time%] Created output directory >> log.txt
)
echo [%date% %time%] All directories ready >> log.txt
echo ✅ Directories ready
echo.

:: Check database
echo 🗄️  Checking database...
echo [%date% %time%] Checking database... >> log.txt
if not exist "data\teledrive.db" (
    echo [%date% %time%] Database not found, will be created on first run >> log.txt
    echo ℹ️  Database will be created on first run
) else (
    echo [%date% %time%] Database exists at data\teledrive.db >> log.txt
    echo ✅ Database exists
)
echo.

:: Set environment variables
echo 🔧 Setting environment variables...
echo [%date% %time%] Setting environment variables... >> log.txt
set "FLASK_APP=app.app"
set "FLASK_ENV=development"
set "PYTHONPATH=%CD%\app;%PYTHONPATH%"
set "PYTHONIOENCODING=utf-8"
echo [%date% %time%] FLASK_APP=app.app >> log.txt
echo [%date% %time%] FLASK_ENV=development >> log.txt
echo [%date% %time%] PYTHONPATH=%CD%\app >> log.txt
echo [%date% %time%] PYTHONIOENCODING=utf-8 >> log.txt
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
echo [%date% %time%] ========================================= >> log.txt
echo [%date% %time%] Starting TeleDrive application... >> log.txt
echo [%date% %time%] Web Interface: http://localhost:3000 >> log.txt
echo [%date% %time%] ========================================= >> log.txt
echo. >> log.txt

:: Change to app directory and run
cd app
echo [%date% %time%] Changed to app directory >> ..\log.txt
echo [%date% %time%] Executing: python app.py >> ..\log.txt
python app.py >> ..\log.txt 2>&1

:: If we get here, the app has stopped
cd ..
echo.
echo [%date% %time%] ========================================= >> log.txt
echo [%date% %time%] TeleDrive stopped >> log.txt
echo [%date% %time%] ========================================= >> log.txt
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
echo [%date% %time%] Checking port %port%... >> log.txt

:: Find and kill processes using the port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%port% "') do (
    set "pid=%%a"
    if defined pid (
        if not "!pid!"=="0" (
            echo ⚠️  Found process !pid! using port %port%
            echo [%date% %time%] Found process !pid! using port %port% >> log.txt
            taskkill /f /pid !pid! >nul 2>&1
            if errorlevel 1 (
                echo ❌ Failed to kill process !pid!
                echo [%date% %time%] ERROR: Failed to kill process !pid! >> log.txt
            ) else (
                echo ✅ Process !pid! killed
                echo [%date% %time%] Process !pid! killed successfully >> log.txt
            )
        )
    )
)

:: Additional cleanup for listening sockets
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%port% "') do (
    set "pid=%%a"
    if defined pid (
        if not "!pid!"=="0" (
            echo [%date% %time%] Killing listening process !pid! on port %port% >> log.txt
            taskkill /f /pid !pid! >nul 2>&1
        )
    )
)

echo [%date% %time%] Port %port% cleanup completed >> log.txt
timeout /t 1 >nul 2>&1
exit /b 0 