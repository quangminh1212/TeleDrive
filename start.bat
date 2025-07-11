@echo off
title Telegram File Scanner
color 0F

:MAIN_MENU
cls
echo.
echo ================================================================
echo                    TELEGRAM FILE SCANNER
echo                  Quet file trong kenh Telegram
echo ================================================================
echo.
echo CHON CHUC NANG:
echo.
echo    1. Setup va Cai dat
echo    2. Quet Public Channel
echo    3. Quet Private Channel
echo    4. Demo va Huong dan
echo    5. Mo thu muc ket qua
echo    0. Thoat
echo.
echo ================================================================

set /p choice="Nhap lua chon (0-5): "

if "%choice%"=="1" goto SETUP
if "%choice%"=="2" goto PUBLIC
if "%choice%"=="3" goto PRIVATE
if "%choice%"=="4" goto DEMO
if "%choice%"=="5" goto OPEN_OUTPUT
if "%choice%"=="0" goto EXIT

echo Lua chon khong hop le!
timeout /t 2 >nul
goto MAIN_MENU

:SETUP
echo.
echo Dang chay setup...
call setup.bat
echo.
echo Nhan phim bat ky de quay lai menu...
pause >nul
goto MAIN_MENU

:PUBLIC
echo.
echo Dang khoi dong Public Channel Scanner...
call run.bat
echo.
echo Nhan phim bat ky de quay lai menu...
pause >nul
goto MAIN_MENU

:PRIVATE
echo.
echo Dang khoi dong Private Channel Scanner...
call private.bat
echo.
echo Nhan phim bat ky de quay lai menu...
pause >nul
goto MAIN_MENU

:DEMO
echo.
echo Dang khoi dong Demo va Help...
call demo.bat
echo.
echo Nhan phim bat ky de quay lai menu...
pause >nul
goto MAIN_MENU

:OPEN_OUTPUT
if exist output (
    echo.
    echo Dang mo thu muc output...
    start "" "output"
    timeout /t 2 >nul
) else (
    echo.
    echo Thu muc output chua ton tai!
    echo Chay scanner it nhat 1 lan de tao thu muc
    timeout /t 3 >nul
)
goto MAIN_MENU

:EXIT
echo.
echo Cam on ban da su dung Telegram File Scanner!
echo.
timeout /t 2 >nul
exit
