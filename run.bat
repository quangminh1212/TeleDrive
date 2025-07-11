@echo off
chcp 65001 >nul
title Telegram File Scanner - Public Channel
color 0B

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              TELEGRAM FILE SCANNER - PUBLIC CHANNEL         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Kiểm tra file .env
if not exist .env (
    echo ❌ CHƯA CẤU HÌNH!
    echo 📝 Vui lòng chạy setup.bat trước
    echo 💡 Hoặc tạo file .env với API credentials
    echo.
    pause
    exit /b 1
)

REM Kiểm tra Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ KHÔNG TÌM THẤY PYTHON!
    echo 📝 Vui lòng chạy setup.bat để cài đặt
    echo.
    pause
    exit /b 1
)

echo 🚀 Đang khởi động scanner cho PUBLIC CHANNEL...
echo 📋 Hỗ trợ format:
echo    - @channelname
echo    - https://t.me/channelname
echo    - channelname
echo.

python run.py

echo.
echo 📁 Kết quả được lưu trong thư mục 'output\'
echo 💡 Nhấn phím bất kỳ để thoát...
pause >nul
