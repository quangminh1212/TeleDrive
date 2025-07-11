@echo off
title Telegram Scanner - Config Sync
color 0C

echo.
echo ================================================================
echo                 TELEGRAM SCANNER CONFIG SYNC
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

echo Dang dong bo cau hinh tu .env vao config.json...
echo.

python sync_config.py

echo.
echo Nhan phim bat ky de thoat...
pause >nul
