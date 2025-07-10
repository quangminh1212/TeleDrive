@echo off
chcp 65001 >nul
title TeleDrive - Quick Test

echo.
echo ========================================
echo    Testing with new phone number
echo    +84866528014
echo ========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

echo [INFO] Testing configuration...
python setup_check.py

if errorlevel 1 (
    echo.
    echo [ERROR] Configuration test failed
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Configuration looks good!
echo.
set /p start="Start TeleDrive now? (Y/N): "
if /i "%start%"=="Y" (
    echo.
    echo Starting TeleDrive...
    python main.py
)

pause
