@echo off
chcp 65001 >nul
title TeleDrive - Cài đặt

echo.
echo ╔══════════════════════════════════════╗
echo ║       🚀 TeleDrive Installer         ║
echo ║     Telegram File Manager            ║
echo ╚══════════════════════════════════════╝
echo.

echo 📦 Đang cài đặt các thư viện cần thiết...
echo.

pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ❌ Lỗi cài đặt thư viện!
    echo 💡 Hãy kiểm tra:
    echo    - Python đã được cài đặt
    echo    - pip đã được cài đặt
    echo    - Kết nối internet ổn định
    pause
    exit /b 1
)

echo.
echo ✅ Cài đặt thành công!
echo.
echo 📋 Bước tiếp theo:
echo    1. Chỉnh sửa file .env với thông tin API Telegram
echo    2. Chạy: run.bat để khởi động ứng dụng
echo.
pause
