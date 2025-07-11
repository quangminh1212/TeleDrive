@echo off
title Telegram File Scanner - Public Channel
color 0B

echo.
echo ================================================================
echo              TELEGRAM FILE SCANNER - PUBLIC CHANNEL
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

echo Dang khoi dong scanner cho PUBLIC CHANNEL...
echo Ho tro format:
echo    - @channelname
echo    - https://t.me/channelname
echo    - channelname
echo.

python run.py

echo.
echo Ket qua duoc luu trong thu muc 'output'
echo Nhan phim bat ky de thoat...
pause >nul
