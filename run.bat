@echo off
title Telegram File Scanner
color 0D

echo.
echo ================================================================
echo                 TELEGRAM FILE SCANNER
echo ================================================================
echo.

echo [BUOC 1/6] Kiem tra file cau hinh .env...
REM Kiem tra file .env
set "ENV_CONFIGURED=0"
if exist .env (
    echo    ^> Tim thay file .env
    REM Kiem tra xem .env co cau hinh dung chua
    findstr /C:"your_api_id_here" .env >nul
    if not errorlevel 1 (
        echo    ^> Phat hien placeholder API_ID - chua cau hinh
        set "ENV_CONFIGURED=0"
    )

    findstr /C:"your_api_hash_here" .env >nul
    if not errorlevel 1 (
        echo    ^> Phat hien placeholder API_HASH - chua cau hinh
        set "ENV_CONFIGURED=0"
    )

    findstr /C:"+84xxxxxxxxx" .env >nul
    if not errorlevel 1 (
        echo    ^> Phat hien placeholder PHONE - chua cau hinh
        set "ENV_CONFIGURED=0"
    )

    REM Kiem tra xem co API_ID va API_HASH thuc su chua
    findstr /C:"TELEGRAM_API_ID=" .env | findstr /V /C:"your_api_id_here" >nul
    if not errorlevel 1 (
        echo    ^> Tim thay API_ID hop le
        findstr /C:"TELEGRAM_API_HASH=" .env | findstr /V /C:"your_api_hash_here" >nul
        if not errorlevel 1 (
            echo    ^> Tim thay API_HASH hop le
            findstr /C:"TELEGRAM_PHONE=" .env | findstr /V /C:"+84xxxxxxxxx" >nul
            if not errorlevel 1 (
                echo    ^> Tim thay PHONE hop le
                set "ENV_CONFIGURED=1"
            )
        )
    )
) else (
    echo    ^> KHONG tim thay file .env
)

if "%ENV_CONFIGURED%"=="0" (
    echo.
    echo ❌ CHUA CAU HINH API HOAC CAU HINH SAI!
    echo.
    echo 📝 Huong dan cau hinh:
    echo    1. Tao file .env moi tu .env.example
    echo    2. Dien API_ID, API_HASH va so dien thoai
    echo.
    if exist .env.example (
        copy .env.example .env >nul
        echo ✅ Da tao file .env moi. Vui long chinh sua thong tin API!
        echo.
        echo 🔗 Huong dan:
        echo    - Lay API_ID va API_HASH tu: https://my.telegram.org/apps
        echo    - Dien so dien thoai dang: +84xxxxxxxxx
    ) else (
        echo ❌ KHONG TIM THAY FILE .env.example!
    )
    pause
    exit /b 1
) else (
    echo ✅ File .env da duoc cau hinh hop le
)

echo.
echo [BUOC 2/6] Kiem tra Python...
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
echo [BUOC 3/6] Dong bo va kiem tra cau hinh chi tiet...
echo    ^> Dang dong bo tu .env sang config.json...
python -c "from src.teledrive.config.manager import ConfigManager; cm = ConfigManager(); cm.update_from_env(); print('✅ Dong bo thanh cong')" 2>nul
if errorlevel 1 (
    echo ❌ Loi dong bo cau hinh
    pause
    exit /b 1
)

echo    ^> Dang kiem tra tinh hop le cua cau hinh...
python -c "from src.teledrive.config.settings import validate_config; result = validate_config(); print('✅ Cau hinh hop le' if result else '❌ Cau hinh khong hop le'); exit(0 if result else 1)" 2>nul
if errorlevel 1 (
    echo.
    echo ❌ CAU HINH CHUA HOP LE!
    echo 🔧 Chay 'config.bat' de sua cau hinh
    echo.
    pause
    exit /b 1
)

echo.
echo [BUOC 4/6] Kiem tra dependencies...
echo    ^> Dang kiem tra cac thu vien Python...
python -c "import telethon, pandas, tqdm, aiofiles; print('✅ Tat ca dependencies da san sang')" 2>nul
if errorlevel 1 (
    echo ❌ Thieu dependencies! Dang tu dong cai dat...
    echo    ^> Chay pip install...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ Khong the cai dat dependencies!
        echo 🔧 Thu chay: setup.bat
        pause
        exit /b 1
    )
    echo ✅ Da cai dat dependencies thanh cong
)

echo.
echo [BUOC 5/6] Khoi tao he thong logging...
echo    ^> Tao thu muc logs neu chua co...
if not exist logs mkdir logs
echo    ^> Kiem tra cau hinh logging...
python -c "from src.teledrive.utils.logger import setup_logging; from src.teledrive.config.settings import CONFIG; setup_logging(CONFIG.get('logging', {})); print('✅ He thong logging da san sang')" 2>nul
if errorlevel 1 (
    echo ⚠️ Khong the khoi tao logging (se chay khong co log chi tiet)
)

echo.
echo [BUOC 6/6] Khoi dong Private Channel Scanner...
echo ================================================================
echo 🚀 DANG KHOI DONG SCANNER...
echo ================================================================
echo.
echo 📋 Ho tro cac format channel:
echo    • https://t.me/joinchat/xxxxx  (invite link cu)
echo    • https://t.me/+xxxxx          (invite link moi)
echo    • @privatechannel              (neu da join)
echo.
echo 📁 Ket qua se duoc luu trong thu muc 'output/'
echo 📊 Log chi tiet se duoc luu trong thu muc 'logs/'
echo.

python main.py

echo.
echo ================================================================
echo 🎉 HOAN THANH!
echo ================================================================
echo 📁 Ket qua duoc luu trong thu muc 'output/'
echo 📊 Log chi tiet trong thu muc 'logs/'
echo.
echo Nhan phim bat ky de thoat...
pause >nul
