@echo off
setlocal

echo.
echo ========================================
echo   TeleDrive Desktop - Tauri Version
echo ========================================
echo.

:: Check if Rust is installed
cargo --version >nul 2>&1
if errorlevel 1 (
    echo Rust/Cargo is not installed!
    echo.
    echo Please install Rust from: https://rustup.rs/
    echo.
    pause
    exit /b 1
)

echo Rust/Cargo found
cargo --version
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo Python found
python --version
echo.

:: Activate virtual environment if exists
if exist ".venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call ".venv\Scripts\activate.bat"
    echo.
)

:: Create necessary directories
echo Ensuring directories exist...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\temp" mkdir data\temp
if not exist "data\backups" mkdir data\backups
if not exist "output" mkdir output
echo Directories ready
echo.

:: Set environment variables
set "FLASK_APP=app.app"
set "FLASK_ENV=development"
set "PYTHONPATH=%CD%\app;%PYTHONPATH%"
set "PYTHONIOENCODING=utf-8"

:: Start Python Flask server in background
echo Starting Flask server in background...
start /B python main.py
echo Flask server starting...
echo.

:: Wait a bit for Flask to start
timeout /t 3 /nobreak >nul

:: Check if npm is installed (for Tauri)
where npm >nul 2>&1
if errorlevel 1 (
    echo.
    echo WARNING: npm not found. Installing Tauri CLI globally...
    echo You may need to install Node.js from: https://nodejs.org/
    echo.
    pause
)

:: Navigate to Tauri app directory
cd tauri-app

:: Install dependencies if needed
if not exist "node_modules" (
    echo Installing Tauri dependencies...
    npm install
    echo.
)

:: Run Tauri in development mode
echo.
echo ========================================
echo   Starting Tauri Desktop Window...
echo ========================================
echo.
echo Press Ctrl+C to stop the application
echo.

npm run tauri dev

:: Cleanup
echo.
echo Stopping Flask server...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq main.py*" >nul 2>&1

echo.
echo ========================================
echo      TeleDrive stopped
echo ========================================
echo.
pause
exit /b 0
