@echo off
title Telegram File Scanner - Menu
color 0F

:MENU
cls
echo.
echo ================================================================
echo                 TELEGRAM FILE SCANNER
echo ================================================================
echo.
echo CHON CHUC NANG:
echo.
echo 1. Cai dat (lan dau tien)
echo 2. Cau hinh so dien thoai
echo 3. Chay scanner
echo 4. Mo thu muc ket qua
echo 5. Thoat
echo.
echo ================================================================

set /p choice="Nhap lua chon (1-5): "

if "%choice%"=="1" (
    echo.
    echo Dang chay setup...
    call setup.bat
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto MENU
)

if "%choice%"=="2" (
    echo.
    echo Dang cau hinh so dien thoai...
    call config_phone.bat
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto MENU
)

if "%choice%"=="3" (
    echo.
    echo Dang chay scanner...
    call run.bat
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto MENU
)

if "%choice%"=="4" (
    if exist output (
        echo.
        echo Mo thu muc output...
        start "" "output"
        timeout /t 2 >nul
    ) else (
        echo.
        echo Thu muc output chua ton tai!
        echo Chay scanner it nhat 1 lan truoc.
        timeout /t 3 >nul
    )
    goto MENU
)

if "%choice%"=="5" (
    echo.
    echo Cam on ban da su dung!
    timeout /t 2 >nul
    exit
)

echo Lua chon khong hop le!
timeout /t 2 >nul
goto MENU
