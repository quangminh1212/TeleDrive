@echo off
chcp 65001 >nul
title Telegram File Scanner - Private Channel
color 0D

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║             TELEGRAM FILE SCANNER - PRIVATE CHANNEL         ║
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

echo 🔐 Đang khởi động scanner cho PRIVATE CHANNEL...
echo 📋 Hỗ trợ format:
echo    - https://t.me/joinchat/xxxxx
echo    - https://t.me/+xxxxx
echo    - @privatechannel (nếu đã join)
echo.
echo 💡 Script sẽ tự động join nếu bạn có invite link
echo.

python private.py

echo.
echo 📁 Kết quả được lưu trong thư mục 'output\'
echo 💡 Nhấn phím bất kỳ để thoát...
pause >nul
