@echo off
chcp 65001 >nul
title Telegram File Scanner - Setup
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                 TELEGRAM FILE SCANNER - SETUP               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [1/4] Kiểm tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ KHÔNG TÌM THẤY PYTHON!
    echo 📥 Vui lòng tải Python từ: https://www.python.org/downloads/
    echo 💡 Nhớ check "Add Python to PATH" khi cài đặt
    echo.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python %PYTHON_VERSION% đã được cài đặt

echo.
echo [2/4] Cài đặt thư viện...
echo 📦 Đang cài đặt dependencies...
pip install -r requirements.txt --quiet --disable-pip-version-check
if errorlevel 1 (
    echo ❌ LỖI: Không thể cài đặt thư viện!
    echo 💡 Thử chạy: pip install -r requirements.txt
    pause
    exit /b 1
)
echo ✅ Đã cài đặt thành công tất cả thư viện

echo.
echo [3/4] Thiết lập cấu hình...
if not exist .env (
    copy .env.example .env >nul
    echo ✅ Đã tạo file .env từ template
) else (
    echo ✅ File .env đã tồn tại
)

echo.
echo [4/4] Tạo thư mục output...
if not exist output mkdir output
echo ✅ Đã tạo thư mục output

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        SETUP HOÀN TẤT!                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📋 BƯỚC TIẾP THEO:
echo.
echo 1️⃣  Chỉnh sửa file .env với thông tin API của bạn:
echo    - Truy cập: https://my.telegram.org/apps
echo    - Tạo app mới để lấy API_ID và API_HASH
echo    - Điền vào file .env
echo.
echo 2️⃣  Chạy chương trình:
echo    - Public channel:  run.bat
echo    - Private channel: private.bat
echo    - Demo/Help:       demo.bat
echo.
echo 💡 TIP: Nhấp đúp vào file .env để chỉnh sửa
echo.
pause
