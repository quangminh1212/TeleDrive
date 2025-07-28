@echo off
title TeleDrive Web Interface
color 0B

echo.
echo ================================================================
echo                    TELEDRIVE WEB INTERFACE
echo ================================================================
echo.

echo [STEP 1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ PYTHON NOT FOUND!
    echo 📥 Download Python from: https://python.org/downloads/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo ✅ %%i is ready
)

echo.
echo [STEP 2/5] Checking dependencies...
echo    ^> Checking Flask...
python -c "import flask; print('✅ Flask version:', flask.__version__)" 2>nul
if errorlevel 1 (
    echo ❌ Flask not found! Installing dependencies...
    echo    ^> Running pip install...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ Failed to install dependencies!
        echo 🔧 Try running: setup.bat
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
) else (
    echo ✅ All web dependencies are ready
)

echo.
echo [STEP 3/5] Checking configuration...
echo    ^> Checking config files...
if not exist config.json (
    echo ❌ config.json not found!
    echo 🔧 Run setup.bat first or configure via web interface
    pause
    exit /b 1
) else (
    echo ✅ Configuration files found
)

echo.
echo [STEP 4/5] Creating required directories...
if not exist templates mkdir templates
if not exist static mkdir static
if not exist static\css mkdir static\css
if not exist static\js mkdir static\js
if not exist static\images mkdir static\images
if not exist uploads mkdir uploads
if not exist output mkdir output
echo ✅ Directory structure ready

echo.
echo [STEP 5/5] Starting web server...
echo ================================================================
echo 🌐 STARTING TELEDRIVE WEB INTERFACE...
echo ================================================================
echo.
echo 📱 Web Interface: http://localhost:5000
echo 🔧 Settings Page: http://localhost:5000/settings
echo 📡 Scan Page: http://localhost:5000/scan
echo.
echo 💡 Features:
echo    • Google Drive-like interface
echo    • Telegram channel scanning
echo    • File management and preview
echo    • Drag & drop file upload
echo    • Responsive design
echo.
echo 🔧 Configuration:
echo    • Configure Telegram API in Settings
echo    • Set scanning preferences
echo    • Manage storage options
echo.
echo ⏹️  Press Ctrl+C to stop the server
echo ================================================================
echo.

REM Start the Flask application
python app.py

echo.
echo ================================================================
echo 🛑 WEB SERVER STOPPED
echo ================================================================
echo.
echo Thank you for using TeleDrive!
echo.
pause
