@echo off
title TeleDrive - Installer

echo.
echo ================================================
echo        TeleDrive Installer
echo      Telegram File Manager
echo ================================================
echo.

echo Installing required libraries...
echo.

pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install libraries!
    echo Please check:
    echo    - Python is installed
    echo    - pip is installed
    echo    - Internet connection is stable
    pause
    exit /b 1
)

echo.
echo SUCCESS: Installation completed!
echo.
echo Next steps:
echo    1. Edit .env file with your Telegram API credentials
echo    2. Run: run.bat to start the application
echo.
pause
