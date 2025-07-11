@echo off
title Telegram Scanner - Config Validator
color 0E

echo.
echo ================================================================
echo                 TELEGRAM SCANNER CONFIG VALIDATOR
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

echo Dang kiem tra cau hinh...
echo.

python config_validator.py

echo.
echo Nhan phim bat ky de thoat...
pause >nul
