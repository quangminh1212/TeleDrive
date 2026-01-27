@echo off
chcp 65001 >nul

:: Delete old log file
if exist "log.txt" del /f /q "log.txt" 2>nul

:: Start logging
call :log "========================================="
call :log "TeleDrive - Build & Run Started"
call :log "========================================="

echo.
echo ========================================
echo        TeleDrive - Build & Run
echo ========================================
echo.

:: Check if setup has been run
call :log "Checking virtual environment..."
if not exist ".venv" (
    call :log "ERROR: Virtual environment not found"
    echo ❌ Virtual environment not found!
    echo.
    echo Please run setup.bat first to install the project:
    echo    setup.bat
    echo.
    pause
    exit /b 1
)
call :log "Virtual environment found"

:: Check if Python is installed
call :log "Checking Python installation..."
python --version >nul 2>&1
if errorlevel 1 (
    call :log "ERROR: Python not found in PATH"
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found
for /f "delims=" %%v in ('python --version 2^>^&1') do (
    echo %%v
    call :log "%%v"
)
echo.

:: Check if we're in the correct directory
call :log "Verifying project structure..."
call :log "Current directory: %CD%"
if not exist "app\app.py" (
    call :log "ERROR: app\app.py not found"
    echo ❌ Please run this script from the TeleDrive project root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo ✅ Project structure verified
call :log "Project structure verified"
echo.

:: Activate virtual environment
echo 🔄 Activating virtual environment...
call :log "Activating virtual environment..."
if exist ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
    if errorlevel 1 (
        call :log "WARNING: Failed to activate virtual environment, using manual setup"
        echo ❌ Failed to activate virtual environment
        echo Trying manual PATH setup...
        set "PATH=%CD%\.venv\Scripts;%PATH%"
        set "VIRTUAL_ENV=%CD%\.venv"
    ) else (
        call :log "Virtual environment activated successfully"
        echo ✅ Virtual environment activated
    )
) else (
    call :log "WARNING: activate.bat not found, using manual setup"
    echo ❌ Virtual environment activation script not found
    echo Setting up manual PATH...
    set "PATH=%CD%\.venv\Scripts;%PATH%"
    set "VIRTUAL_ENV=%CD%\.venv"
    echo ✅ Manual environment setup completed
)
echo.

:: Check for updates in requirements
echo 🔄 Checking dependencies...
call :log "Installing/updating dependencies..."
pip install -r requirements.txt --quiet --upgrade >>log.txt 2>&1
if errorlevel 1 (
    call :log "WARNING: Some dependencies may not be up to date"
    echo ⚠️  Warning: Some dependencies may not be up to date
    echo Continuing anyway...
) else (
    call :log "Dependencies installed successfully"
    echo ✅ Dependencies up to date
)
echo.

:: Cleanup ports
echo 🔍 Cleaning up ports...
call :log "Starting port cleanup..."
call :cleanup_port 3000
call :cleanup_port 5000
call :cleanup_port 8000
call :log "Port cleanup completed"
echo ✅ Port cleanup completed
echo.

:: Create necessary directories
echo 📁 Ensuring directories exist...
call :log "Creating necessary directories..."
if not exist "logs" (
    mkdir logs
    call :log "Created logs directory"
)
if not exist "data" (
    mkdir data
    call :log "Created data directory"
)
if not exist "data\uploads" (
    mkdir data\uploads
    call :log "Created data\uploads directory"
)
if not exist "data\temp" (
    mkdir data\temp
    call :log "Created data\temp directory"
)
if not exist "data\backups" (
    mkdir data\backups
    call :log "Created data\backups directory"
)
if not exist "output" (
    mkdir output
    call :log "Created output directory"
)
call :log "All directories ready"
echo ✅ Directories ready
echo.

:: Check database
echo 🗄️  Checking database...
call :log "Checking database..."
if not exist "data\teledrive.db" (
    call :log "Database not found, will be created on first run"
    echo ℹ️  Database will be created on first run
) else (
    call :log "Database exists at data\teledrive.db"
    echo ✅ Database exists
)
echo.

:: Set environment variables
echo 🔧 Setting environment variables...
call :log "Setting environment variables..."
set "FLASK_APP=app.app"
set "FLASK_ENV=development"
set "PYTHONPATH=%CD%\app;%PYTHONPATH%"
set "PYTHONIOENCODING=utf-8"
call :log "FLASK_APP=app.app"
call :log "FLASK_ENV=development"
call :log "PYTHONPATH=%CD%\app"
call :log "PYTHONIOENCODING=utf-8"
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
call :log "========================================="
call :log "Starting TeleDrive application..."
call :log "Web Interface: http://localhost:3000"
call :log "========================================="

:: Change to app directory and run
cd app
call :log "Changed to app directory"
call :log "Executing: python app.py"
python app.py >>"..\log.txt" 2>&1

:: If we get here, the app has stopped
cd ..
echo.
call :log "========================================="
call :log "TeleDrive stopped"
call :log "========================================="
echo ========================================
echo      TeleDrive stopped
echo ========================================
echo.
echo 💡 To restart, run: run.bat
echo.
pause
exit /b 0

:: Logging function
:log
echo [%date% %time%] %~1 >> log.txt
exit /b 0

:: Port cleanup function
:cleanup_port
setlocal
set "port=%~1"
echo 🔧 Checking port %port%...
call :log "Checking port %port%..."

:: Find and kill processes using the port
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%port% "') do (
    set "pid=%%a"
    if defined pid (
        if not "!pid!"=="0" (
            echo ⚠️  Found process !pid! using port %port%
            call :log "Found process !pid! using port %port%"
            taskkill /f /pid !pid! >nul 2>&1
            if errorlevel 1 (
                echo ❌ Failed to kill process !pid!
                call :log "ERROR: Failed to kill process !pid!"
            ) else (
                echo ✅ Process !pid! killed
                call :log "Process !pid! killed successfully"
            )
        )
    )
)

:: Additional cleanup for listening sockets
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr "LISTENING" ^| findstr ":%port% "') do (
    set "pid=%%a"
    if defined pid (
        if not "!pid!"=="0" (
            call :log "Killing listening process !pid! on port %port%"
            taskkill /f /pid !pid! >nul 2>&1
        )
    )
)

call :log "Port %port% cleanup completed"
timeout /t 1 >nul 2>&1
endlocal
exit /b 0
