@echo off
chcp 65001 >nul
echo ========================================
echo   TeleDrive - Kiểm Tra Cấu Hình Telegram
echo ========================================
echo.

REM Kích hoạt virtual environment nếu có
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

REM Kiểm tra session
echo 🔍 Kiểm tra session Telegram...
python scripts\check_telegram_session.py

if errorlevel 1 (
    echo.
    echo ========================================
    echo   ⚠️  CẦN THIẾT LẬP
    echo ========================================
    echo.
    choice /C YN /M "Bạn có muốn thiết lập ngay không? (Y/N)"
    if not errorlevel 2 (
        echo.
        call setup_telegram_auto_login.bat
    )
) else (
    echo.
    echo ========================================
    echo   ✅ SẴN SÀNG SỬ DỤNG
    echo ========================================
    echo.
    echo 🚀 Chạy ứng dụng: run.bat
    echo.
)

pause
