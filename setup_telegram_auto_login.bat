@echo off
chcp 65001 >nul
echo ========================================
echo   TeleDrive - Thiết Lập Đăng Nhập Tự Động
echo ========================================
echo.

REM Kiểm tra Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python chưa được cài đặt!
    echo Vui lòng cài đặt Python từ: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python đã được cài đặt
echo.

REM Kiểm tra virtual environment
if not exist ".venv" (
    echo 📦 Tạo virtual environment...
    python -m venv .venv
    echo ✅ Đã tạo virtual environment
    echo.
)

REM Kích hoạt virtual environment
echo 🔄 Kích hoạt virtual environment...
call .venv\Scripts\activate.bat

REM Cài đặt dependencies
echo 📦 Cài đặt thư viện cần thiết...
pip install --upgrade pip >nul 2>&1
pip install opentele telethon python-dotenv >nul 2>&1

if errorlevel 1 (
    echo ❌ Lỗi cài đặt thư viện!
    pause
    exit /b 1
)

echo ✅ Đã cài đặt thư viện
echo.

REM Kiểm tra Telegram Desktop
echo 🔍 Kiểm tra Telegram Desktop...

set TELEGRAM_FOUND=0

if exist "%LOCALAPPDATA%\Telegram Desktop\Telegram.exe" (
    set TELEGRAM_PATH=%LOCALAPPDATA%\Telegram Desktop\Telegram.exe
    set TELEGRAM_FOUND=1
)

if exist "%PROGRAMFILES%\Telegram Desktop\Telegram.exe" (
    set TELEGRAM_PATH=%PROGRAMFILES%\Telegram Desktop\Telegram.exe
    set TELEGRAM_FOUND=1
)

if exist "%PROGRAMFILES(X86)%\Telegram Desktop\Telegram.exe" (
    set TELEGRAM_PATH=%PROGRAMFILES(X86)%\Telegram Desktop\Telegram.exe
    set TELEGRAM_FOUND=1
)

if %TELEGRAM_FOUND%==0 (
    echo ❌ Không tìm thấy Telegram Desktop!
    echo.
    echo 📝 HƯỚNG DẪN:
    echo 1. Tải Telegram Desktop từ: https://desktop.telegram.org/
    echo 2. Cài đặt và đăng nhập
    echo 3. Chạy lại script này
    echo.
    pause
    exit /b 1
)

echo ✅ Tìm thấy Telegram Desktop: %TELEGRAM_PATH%
echo.

REM Kiểm tra Telegram Desktop có đang chạy không
tasklist /FI "IMAGENAME eq Telegram.exe" 2>NUL | find /I /N "Telegram.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ⚠️  Telegram Desktop đang chạy!
    echo.
    echo 📝 VUI LÒNG:
    echo 1. Đóng Telegram Desktop
    echo 2. Chạy lại script này
    echo.
    pause
    exit /b 1
)

echo ✅ Telegram Desktop không chạy (OK)
echo.

REM Kiểm tra session đã tồn tại chưa
if exist "data\session.session" (
    echo ⚠️  Session đã tồn tại!
    echo.
    choice /C YN /M "Bạn có muốn import lại session không? (Y/N)"
    if errorlevel 2 (
        echo.
        echo ✅ Giữ nguyên session hiện tại
        echo 🚀 Bạn có thể chạy ứng dụng ngay: run.bat
        echo.
        pause
        exit /b 0
    )
    echo.
    echo 🗑️  Xóa session cũ...
    del /F /Q "data\session.session" 2>nul
    del /F /Q "data\session.session-journal" 2>nul
)

REM Tạo thư mục data nếu chưa có
if not exist "data" (
    mkdir data
)

REM Import session
echo 🔄 Đang import session từ Telegram Desktop...
echo.
python scripts\import_telegram_desktop_session.py

if errorlevel 1 (
    echo.
    echo ❌ Import session thất bại!
    echo.
    echo 📝 KHẮC PHỤC:
    echo 1. Mở Telegram Desktop
    echo 2. Đăng nhập vào tài khoản
    echo 3. Đóng Telegram Desktop
    echo 4. Chạy lại script này
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ THIẾT LẬP THÀNH CÔNG!
echo ========================================
echo.
echo 🎉 Session đã được import thành công!
echo 📁 File: data\session.session
echo.
echo 🚀 CHẠY ỨNG DỤNG:
echo    run.bat
echo.
echo 📖 XEM HƯỚNG DẪN CHI TIẾT:
echo    docs\HUONG_DAN_DANG_NHAP_TELEGRAM.md
echo.
echo ========================================
pause
