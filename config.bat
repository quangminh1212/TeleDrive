@echo off
title Telegram Scanner - Config Manager
color 0B

:MENU
cls
echo.
echo ================================================================
echo                 TELEGRAM SCANNER CONFIG MANAGER
echo ================================================================
echo.
echo CHON CHUC NANG:
echo.
echo 1. Quan ly cau hinh chi tiet (JSON)
echo 2. Cau hinh so dien thoai (.env)
echo 3. Thoat
echo.
echo ================================================================

set /p choice="Nhap lua chon (1-3): "

if "%choice%"=="1" (
    echo.
    echo Dang khoi dong Config Manager...
    echo.

    REM Kiem tra Python
    py --version >nul 2>&1
    if errorlevel 1 (
        echo KHONG TIM THAY PYTHON!
        echo Tai Python tu: https://python.org/downloads/
        pause
        goto MENU
    )

    py -c "from config import interactive_config_manager; interactive_config_manager()"
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto MENU
)

if "%choice%"=="2" (
    echo.
    echo ================================================================
    echo                 CAU HINH SO DIEN THOAI
    echo ================================================================
    echo.

    if not exist .env (
        echo File .env khong ton tai!
        echo Chay setup.bat truoc.
        pause
        goto MENU
    )

    echo Nhap so dien thoai Telegram cua ban:
    echo Vi du: +84987654321
    echo.
    set /p phone="So dien thoai: "

    if "%phone%"=="" (
        echo So dien thoai khong duoc de trong!
        pause
        goto MENU
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
    goto MENU
)

if "%choice%"=="3" (
    echo.
    echo Cam on ban da su dung!
    timeout /t 2 >nul
    exit
)

echo Lua chon khong hop le!
timeout /t 2 >nul
goto MENU
