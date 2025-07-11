@echo off
title Telegram File Scanner - Demo & Help
color 0E

echo.
echo ================================================================
echo               TELEGRAM FILE SCANNER - DEMO & HELP
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

echo DEMO va TROUBLESHOOTING GUIDE
echo Huong dan chi tiet va giai quyet loi
echo.

python demo.py

echo.
echo Nhan phim bat ky de thoat...
pause >nul
