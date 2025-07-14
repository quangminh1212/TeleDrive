@echo off
title Telegram Login
color 0B

echo.
echo ================================================================
echo                    TELEGRAM LOGIN
echo ================================================================
echo.

echo [BUOC 1/4] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ KHONG TIM THAY PYTHON!
    echo 📥 Tai Python tu: https://python.org/downloads/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo ✅ %%i da san sang
)

echo.
echo [BUOC 2/4] Kiem tra cau hinh...
echo    ^> Dang kiem tra config.json...
if not exist config.json (
    echo ❌ KHONG TIM THAY config.json!
    echo 🔧 Chay setup.bat truoc
    pause
    exit /b 1
)

python -c "import config; print('✅ Config hop le')" 2>nul
if errorlevel 1 (
    echo ❌ Cau hinh khong hop le!
    echo 🔧 Kiem tra lai config.json
    pause
    exit /b 1
)

echo.
echo [BUOC 3/4] Kiem tra dependencies...
python -c "import telethon; print('✅ Telethon da san sang')" 2>nul
if errorlevel 1 (
    echo ❌ Thieu Telethon! Dang cai dat...
    pip install telethon
    if errorlevel 1 (
        echo ❌ Khong the cai dat Telethon!
        pause
        exit /b 1
    )
)

echo.
echo [BUOC 4/4] Bat dau dang nhap...
echo ================================================================
echo 🔐 DANG NHAP TELEGRAM
echo ================================================================
echo.
echo 💡 LUU Y:
echo    - Telegram se gui ma xac thuc den dien thoai cua ban
echo    - Nhap ma xac thuc khi duoc yeu cau
echo    - Neu co 2FA, nhap mat khau 2FA
echo.

python login_telegram.py

echo.
echo ================================================================
if errorlevel 1 (
    echo ❌ DANG NHAP THAT BAI!
    echo.
    echo 💡 Thu lai:
    echo    1. Kiem tra so dien thoai trong config.json
    echo    2. Kiem tra ket noi internet
    echo    3. Chay lai login.bat
) else (
    echo ✅ DANG NHAP THANH CONG!
    echo.
    echo 💡 Bay gio ban co the:
    echo    - Chay: run.bat
    echo    - Hoac: python main.py
)
echo ================================================================
echo.
echo Nhan phim bat ky de thoat...
pause >nul
