@echo off
title TeleDrive - Installation
color 0A

echo.
echo ========================================
echo    TeleDrive - Installation Script
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo.
    echo Please install Python 3.7+ from https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] Python found
python --version

echo.
echo [INFO] Installing TeleDrive dependencies...
echo This may take a few minutes...
echo.

REM Install dependencies
pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed
    echo Please check your internet connection and try again
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Installation Complete!
echo ========================================
echo.
echo [SUCCESS] TeleDrive is ready to use
echo.
echo To start the application:
echo 1. Double-click "run.bat"
echo 2. Or run: python main.py
echo.
echo First time setup:
echo - Enter your phone number with country code
echo - Enter verification code from Telegram
echo - If you have 2FA, enter your cloud password
echo.
pause
