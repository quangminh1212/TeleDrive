@echo off
chcp 65001 >nul
title TeleDrive - Quick Install

echo.
echo ========================================
echo    TeleDrive - Quick Install Script
echo ========================================
echo.
echo This script will:
echo - Check Python installation
echo - Install dependencies
echo - Setup configuration
echo - Run the application
echo.

set /p confirm="Continue? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Installation cancelled.
    pause
    exit /b 0
)

echo.
echo [STEP 1] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo.
    echo Please install Python 3.7+ from: https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

python --version
echo [OK] Python is available

echo.
echo [STEP 2] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo [STEP 3] Setting up configuration...
if not exist ".env" (
    copy .env.example .env >nul
    echo [INFO] Created .env configuration file
)

echo.
echo [STEP 4] Configuration required...
echo.
echo IMPORTANT: You need to update your phone number in the .env file
echo.
set /p phone="Enter your phone number (with country code, e.g., +84123456789): "

REM Update phone number in .env file
powershell -Command "(Get-Content .env) -replace 'PHONE_NUMBER=.*', 'PHONE_NUMBER=%phone%' | Set-Content .env"

echo [OK] Phone number updated: %phone%

echo.
echo [STEP 5] Testing configuration...
python setup_check.py
if errorlevel 1 (
    echo.
    echo [WARNING] Configuration test failed
    echo Please check your settings and try again
    pause
    exit /b 1
)

echo.
echo ========================================
echo        Installation Complete!
echo ========================================
echo.
echo You can now run TeleDrive using:
echo - Double-click: run.bat
echo - Or command: python main.py
echo.
set /p start="Start TeleDrive now? (Y/N): "
if /i "%start%"=="Y" (
    echo.
    echo Starting TeleDrive...
    python main.py
)

echo.
echo Thank you for using TeleDrive!
pause
