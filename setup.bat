@echo off
chcp 65001 >nul
title TeleDrive Setup

echo.
echo ========================================
echo       TeleDrive Setup Script
echo ========================================
echo.

REM Check if Python is installed
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
) else (
    python --version
    echo [OK] Python is installed
)

echo.
echo [2/5] Creating virtual environment...
if exist "venv" (
    echo [INFO] Virtual environment already exists
) else (
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)

echo.
echo [3/5] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [4/5] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully

echo.
echo [5/5] Setting up configuration...
if not exist ".env" (
    copy .env.example .env >nul
    echo [INFO] Created .env file from template
) else (
    echo [INFO] .env file already exists
)

echo.
echo ========================================
echo           Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env file and update your phone number
echo 2. Run: run.bat to start the application
echo 3. Or run: python setup_check.py to validate config
echo.
echo [INFO] Opening .env file for editing...
notepad .env

echo.
pause
