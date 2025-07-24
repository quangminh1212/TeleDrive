@echo off
setlocal enabledelayedexpansion
title TeleDrive - Telegram File Manager
color 0B

echo.
echo ================================================================
echo                 TELEDRIVE WEB INTERFACE LAUNCHER
echo ================================================================
echo.
echo [INFO] Khoi dong web interface tai http://localhost:3000
echo.

echo [BUOC 1/3] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] KHONG TIM THAY PYTHON!
    echo [INFO] Tai Python tu: https://python.org/downloads/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo [OK] %%i da san sang
)

echo.
echo [BUOC 2/3] Kiem tra thu muc du an...
if not exist "src\teledrive" (
    echo [ERROR] Khong tim thay thu muc src\teledrive!
    echo [INFO] Vui long chay file nay tu thu muc goc cua du an
    pause
    exit /b 1
) else (
    echo [OK] Cau truc thu muc hop le
)

echo.
echo [BUOC 3/3] Kiem tra dependencies...
echo    ^> Dang kiem tra cac thu vien Python...
python -c "import flask, telethon; print('[OK] Tat ca dependencies da san sang')" 2>nul
if errorlevel 1 (
    echo [INFO] Dang cai dat dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Khong the cai dat dependencies!
        pause
        exit /b 1
    )
)

echo.
echo ================================================================
echo [INFO] KHOI DONG TELEDRIVE WEB INTERFACE
echo ================================================================
echo.
echo [INFO] Dang chay TeleDrive...
echo [INFO] Web interface se mo tai: http://localhost:3000
echo [INFO] Nhan Ctrl+C de dung ung dung
echo.

python main.py

if errorlevel 1 (
    echo.
    echo [ERROR] Co loi xay ra khi chay TeleDrive!
    pause
)

exit /b 0
