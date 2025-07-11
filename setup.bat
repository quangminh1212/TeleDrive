@echo off
title Telegram File Scanner - Setup
color 0A

echo.
echo ================================================================
echo                 TELEGRAM FILE SCANNER - SETUP
echo ================================================================
echo.

echo [1/4] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo KHONG TIM THAY PYTHON!
    echo Vui long tai Python tu: https://www.python.org/downloads/
    echo Nho check "Add Python to PATH" khi cai dat
    echo.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Python %PYTHON_VERSION% da duoc cai dat

echo.
echo [2/4] Cai dat thu vien...
echo Dang cai dat dependencies...
pip install -r requirements.txt --quiet --disable-pip-version-check
if errorlevel 1 (
    echo LOI: Khong the cai dat thu vien!
    echo Thu chay: pip install -r requirements.txt
    pause
    exit /b 1
)
echo Da cai dat thanh cong tat ca thu vien

echo.
echo [3/4] Thiet lap cau hinh...
if not exist .env (
    copy .env.example .env >nul
    echo Da tao file .env tu template
) else (
    echo File .env da ton tai
)

echo.
echo [4/4] Tao thu muc output...
if not exist output mkdir output
echo Da tao thu muc output

echo.
echo ================================================================
echo                        SETUP HOAN TAT!
echo ================================================================
echo.
echo BUOC TIEP THEO:
echo.
echo 1. Chinh sua file .env voi thong tin API cua ban:
echo    - Truy cap: https://my.telegram.org/apps
echo    - Tao app moi de lay API_ID va API_HASH
echo    - Dien vao file .env
echo.
echo 2. Chay chuong trinh:
echo    - Public channel:  run.bat
echo    - Private channel: private.bat
echo    - Demo/Help:       demo.bat
echo.
echo TIP: Nhap doi vao file .env de chinh sua
echo.
pause
