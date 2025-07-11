@echo off
title Cau hinh so dien thoai
color 0C

echo.
echo ================================================================
echo                 CAU HINH SO DIEN THOAI
echo ================================================================
echo.

if not exist .env (
    echo File .env khong ton tai!
    echo Chay setup.bat truoc.
    pause
    exit /b 1
)

echo Nhap so dien thoai Telegram cua ban:
echo Vi du: +84987654321
echo.
set /p phone="So dien thoai: "

if "%phone%"=="" (
    echo So dien thoai khong duoc de trong!
    pause
    exit /b 1
)

echo.
echo Dang cap nhat file .env...

REM Backup file .env
copy .env .env.backup >nul

REM Tao file .env moi
(
echo # Telegram API Credentials
echo # Lay tu https://my.telegram.org/apps
echo TELEGRAM_API_ID=21272067
echo TELEGRAM_API_HASH=b7690dc86952dbc9b16717b101164af3
echo TELEGRAM_PHONE=%phone%
) > .env

echo.
echo Da cap nhat thanh cong!
echo So dien thoai: %phone%
echo.
echo Ban co the chay run.bat de bat dau quet.
pause
