@echo off
title Telegram File Scanner
color 0D

echo.
echo ================================================================
echo                 TELEGRAM FILE SCANNER
echo ================================================================
echo.

REM Kiem tra file .env
if not exist .env (
    echo CHUA CAU HINH API!
    echo.
    echo 1. Tao file .env tu .env.example
    echo 2. Dien so dien thoai (vi du: +84xxxxxxxxx)
    echo.
    if exist .env.example (
        copy .env.example .env >nul
        echo Da tao file .env. Vui long chinh sua so dien thoai!
    )
    pause
    exit /b 1
)

REM Kiem tra Python
python --version >nul 2>&1
if errorlevel 1 (
    echo KHONG TIM THAY PYTHON!
    echo Tai Python tu: https://python.org/downloads/
    pause
    exit /b 1
)

echo Dang khoi dong Private Channel Scanner...
echo Ho tro format:
echo    - https://t.me/joinchat/xxxxx
echo    - https://t.me/+xxxxx
echo    - @privatechannel (neu da join)
echo.

python main.py

echo.
echo Ket qua duoc luu trong thu muc 'output'
echo Nhan phim bat ky de thoat...
pause >nul
