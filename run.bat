@echo off
chcp 65001 >nul
title TeleDrive - Telegram Channel File Manager

echo.
echo ========================================
echo    TeleDrive - Telegram File Manager
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if requirements are installed
if not exist "venv\Lib\site-packages\telethon" (
    echo [INFO] Installing dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found
    echo [INFO] Copying .env.example to .env...
    copy .env.example .env >nul
    echo.
    echo [IMPORTANT] Please edit .env file and update your phone number
    echo Then run this script again.
    echo.
    pause
    exit /b 0
)

REM Run setup check first
echo [INFO] Running setup check...
python setup_check.py
if errorlevel 1 (
    echo.
    echo [WARNING] Setup check failed. Please fix configuration issues.
    echo.
    pause
    exit /b 1
)

echo.
echo [INFO] Starting TeleDrive application...
echo.
python main.py

echo.
echo [INFO] TeleDrive application closed.
pause
