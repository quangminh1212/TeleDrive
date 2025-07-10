@echo off
chcp 65001 >nul
title TeleDrive - Telegram File Manager

echo.
echo ╔══════════════════════════════════════╗
echo ║          🚀 TeleDrive v1.0           ║
echo ║     Telegram File Manager            ║
echo ╚══════════════════════════════════════╝
echo.

if "%1"=="cmd" (
    echo Đang khởi động giao diện dòng lệnh...
    python cmd.py %2 %3 %4 %5 %6
) else (
    echo Đang khởi động ứng dụng desktop...
    python app.py
)

if errorlevel 1 (
    echo.
    echo ❌ Lỗi khởi động ứng dụng!
    echo 💡 Hãy kiểm tra:
    echo    - Python đã được cài đặt
    echo    - Các thư viện đã được cài: pip install -r requirements.txt
    echo    - File .env đã được cấu hình đúng
    pause
)
