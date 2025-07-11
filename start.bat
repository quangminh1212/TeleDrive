@echo off
chcp 65001 >nul
title Telegram File Scanner
color 0F

:MAIN_MENU
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    TELEGRAM FILE SCANNER                    ║
echo ║                  Quét file trong kênh Telegram              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📋 CHỌN CHỨC NĂNG:
echo.
echo    1️⃣  Setup & Cài đặt
echo    2️⃣  Quét Public Channel
echo    3️⃣  Quét Private Channel  
echo    4️⃣  Demo & Hướng dẫn
echo    5️⃣  Mở thư mục kết quả
echo    0️⃣  Thoát
echo.
echo ╔══════════════════════════════════════════════════════════════╗

set /p choice="👉 Nhập lựa chọn (0-5): "

if "%choice%"=="1" goto SETUP
if "%choice%"=="2" goto PUBLIC
if "%choice%"=="3" goto PRIVATE
if "%choice%"=="4" goto DEMO
if "%choice%"=="5" goto OPEN_OUTPUT
if "%choice%"=="0" goto EXIT

echo ❌ Lựa chọn không hợp lệ!
timeout /t 2 >nul
goto MAIN_MENU

:SETUP
echo.
echo 🔧 Đang chạy setup...
call setup.bat
echo.
echo 📋 Nhấn phím bất kỳ để quay lại menu...
pause >nul
goto MAIN_MENU

:PUBLIC
echo.
echo 🌐 Đang khởi động Public Channel Scanner...
call run.bat
echo.
echo 📋 Nhấn phím bất kỳ để quay lại menu...
pause >nul
goto MAIN_MENU

:PRIVATE
echo.
echo 🔐 Đang khởi động Private Channel Scanner...
call private.bat
echo.
echo 📋 Nhấn phím bất kỳ để quay lại menu...
pause >nul
goto MAIN_MENU

:DEMO
echo.
echo 🎯 Đang khởi động Demo & Help...
call demo.bat
echo.
echo 📋 Nhấn phím bất kỳ để quay lại menu...
pause >nul
goto MAIN_MENU

:OPEN_OUTPUT
if exist output (
    echo.
    echo 📁 Đang mở thư mục output...
    start "" "output"
    timeout /t 2 >nul
) else (
    echo.
    echo ❌ Thư mục output chưa tồn tại!
    echo 💡 Chạy scanner ít nhất 1 lần để tạo thư mục
    timeout /t 3 >nul
)
goto MAIN_MENU

:EXIT
echo.
echo 👋 Cảm ơn bạn đã sử dụng Telegram File Scanner!
echo.
timeout /t 2 >nul
exit
