@echo off
title Telegram File Scanner - Private Channel
color 0D

echo.
echo ================================================================
echo             TELEGRAM FILE SCANNER - PRIVATE CHANNEL
echo ================================================================
echo.

REM Kiem tra file .env
if not exist .env (
    echo CHUA CAU HINH!
    echo Vui long chay setup.bat truoc
    echo Hoac tao file .env voi API credentials
    echo.
    pause
    exit /b 1
)

REM Kiem tra Python
python --version >nul 2>&1
if errorlevel 1 (
    echo KHONG TIM THAY PYTHON!
    echo Vui long chay setup.bat de cai dat
    echo.
    pause
    exit /b 1
)

echo Dang khoi dong scanner cho PRIVATE CHANNEL...
echo Ho tro format:
echo    - https://t.me/joinchat/xxxxx
echo    - https://t.me/+xxxxx
echo    - @privatechannel (neu da join)
echo.
echo Script se tu dong join neu ban co invite link
echo.

python private.py

echo.
echo Ket qua duoc luu trong thu muc 'output'
echo Nhan phim bat ky de thoat...
pause >nul
