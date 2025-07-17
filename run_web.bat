@echo off
echo ========================================
echo    TeleDrive Web Interface Launcher
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo [ERROR] Virtual environment not found!
    echo Please run setup.bat first to create the virtual environment.
    pause
    exit /b 1
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if Flask is installed
python -c "import flask" 2>nul
if errorlevel 1 (
    echo [INFO] Installing Flask dependencies...
    pip install flask flask-cors
)

REM Check if output directory exists and has data
if not exist "output\" (
    echo [WARNING] Output directory not found!
    echo Please run the scanner first to generate data.
    echo.
)

REM Count JSON files in output directory
set count=0
for %%f in (output\*_telegram_files.json) do set /a count+=1

if %count%==0 (
    echo [WARNING] No scan data found in output directory!
    echo Please run the scanner first to generate data.
    echo.
    echo You can still start the web interface, but it will be empty.
    echo.
    set /p choice="Do you want to continue? (y/n): "
    if /i not "!choice!"=="y" (
        echo Cancelled.
        pause
        exit /b 0
    )
) else (
    echo [INFO] Found %count% scan session(s) in output directory.
)

echo.
echo [INFO] Starting TeleDrive Web Interface...
echo [INFO] The web interface will be available at: http://localhost:5000
echo [INFO] Press Ctrl+C to stop the server.
echo.

REM Start the Flask application
python app.py

echo.
echo [INFO] Web interface stopped.
pause
