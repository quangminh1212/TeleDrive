@echo off
title Telegram Scanner - Config Manager
color 0B

echo.
echo ================================================================
echo                 TELEGRAM SCANNER CONFIG MANAGER
echo ================================================================
echo.

REM Kiem tra Python
python --version >nul 2>&1
if errorlevel 1 (
    echo KHONG TIM THAY PYTHON!
    echo Tai Python tu: https://python.org/downloads/
    pause
    exit /b 1
)

echo Dang khoi dong Config Manager...
echo.

python config_manager.py

echo.
echo Nhan phim bat ky de thoat...
pause >nul
