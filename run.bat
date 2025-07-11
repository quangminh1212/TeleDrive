@echo off
title Telegram File Scanner
color 0D

echo.
echo ================================================================
echo                 TELEGRAM FILE SCANNER
echo ================================================================
echo.

REM Kiem tra file .env
set "ENV_CONFIGURED=0"
if exist .env (
    REM Kiem tra xem .env co cau hinh dung chua
    findstr /C:"your_api_id_here" .env >nul
    if not errorlevel 1 set "ENV_CONFIGURED=0"

    findstr /C:"your_api_hash_here" .env >nul
    if not errorlevel 1 set "ENV_CONFIGURED=0"

    findstr /C:"+84xxxxxxxxx" .env >nul
    if not errorlevel 1 set "ENV_CONFIGURED=0"

    REM Kiem tra xem co API_ID va API_HASH thuc su chua
    findstr /R "TELEGRAM_API_ID=[0-9]" .env >nul
    if not errorlevel 1 (
        findstr /R "TELEGRAM_API_HASH=[a-zA-Z0-9]" .env >nul
        if not errorlevel 1 (
            findstr /R "TELEGRAM_PHONE=\+[0-9]" .env >nul
            if not errorlevel 1 set "ENV_CONFIGURED=1"
        )
    )
)

if "%ENV_CONFIGURED%"=="0" (
    echo CHUA CAU HINH API HOAC CAU HINH SAI!
    echo.
    echo 1. Tao file .env moi tu .env.example
    echo 2. Dien API_ID, API_HASH va so dien thoai
    echo.
    if exist .env.example (
        copy .env.example .env >nul
        echo Da tao file .env moi. Vui long chinh sua thong tin API!
        echo.
        echo Huong dan:
        echo - Lay API_ID va API_HASH tu: https://my.telegram.org/apps
        echo - Dien so dien thoai dang: +84xxxxxxxxx
    ) else (
        echo KHONG TIM THAY FILE .env.example!
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
