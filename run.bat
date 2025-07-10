@echo off
title TeleDrive - Telegram Channel File Manager
color 0B

echo.
echo ========================================
echo    TeleDrive - Starting Application
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://python.org
    echo.
    pause
    exit /b 1
)

echo [INFO] Python found - checking dependencies...

REM Check if required packages are installed
python -c "import telethon, PIL" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing required dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        echo Please run: pip install -r requirements.txt
        echo.
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully
) else (
    echo [SUCCESS] All dependencies are already installed
)

echo.
echo [INFO] Starting TeleDrive application...
echo [INFO] Close this window to stop the application
echo.

REM Run the main application
python main.py

REM Check if application exited with error
if errorlevel 1 (
    echo.
    echo [ERROR] Application exited with error
    echo Check the error messages above
    echo.
    pause
) else (
    echo.
    echo [INFO] Application closed successfully
)

echo.
pause
