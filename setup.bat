@echo off
title Setup - Telegram File Scanner
color 0A

echo.
echo ================================================================
echo                        SETUP
echo ================================================================
echo.

echo [1/3] Cai dat Python packages...
pip install -r requirements.txt
if errorlevel 1 (
    echo LOI: Khong the cai dat packages!
    pause
    exit /b 1
)

echo.
echo [2/3] Tao file cau hinh...
if not exist .env (
    copy .env.example .env >nul
    echo Da tao file .env
) else (
    echo File .env da ton tai
)

echo.
echo [3/3] Tao cac thu muc can thiet...
if not exist output mkdir output
if not exist logs mkdir logs
if not exist config mkdir config
echo Da tao cac thu muc: output, logs, config

echo.
echo ================================================================
echo                    SETUP HOAN TAT!
echo ================================================================
echo.
echo BUOC TIEP THEO:
echo 1. Chinh sua file .env voi API credentials
echo 2. Lay API tu: https://my.telegram.org/apps
echo 3. Chay: run.bat
echo.
pause
