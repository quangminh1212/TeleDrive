@echo off
title TeleDrive - Telegram File Manager

echo.
echo ================================================
echo           TeleDrive v1.0
echo      Telegram File Manager
echo ================================================
echo.

if "%1"=="cmd" (
    echo Starting command line interface...
    python cmd.py %2 %3 %4 %5 %6
) else (
    echo Starting desktop application...
    python app.py
)

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start application!
    echo Please check:
    echo    - Python is installed
    echo    - Libraries installed: pip install -r requirements.txt
    echo    - .env file is configured correctly
    pause
)
