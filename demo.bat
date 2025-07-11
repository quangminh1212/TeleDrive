@echo off
chcp 65001 >nul
title Telegram File Scanner - Demo & Help
color 0E

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               TELEGRAM FILE SCANNER - DEMO & HELP           ║
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

echo 🎯 DEMO & TROUBLESHOOTING GUIDE
echo 📚 Hướng dẫn chi tiết và giải quyết lỗi
echo.

python demo.py

echo.
echo 💡 Nhấn phím bất kỳ để thoát...
pause >nul
