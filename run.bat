@echo off
title TeleDrive v2.0 - Advanced Telegram File Scanner

echo.
echo ===============================================
echo        TELEDRIVE v2.0 - FILE SCANNER
echo ===============================================
echo.

<<<<<<< HEAD
REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found in PATH
    echo [INFO] Please install Python from https://python.org
=======
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
py --version >nul 2>&1
if errorlevel 1 (
    echo ❌ KHONG TIM THAY PYTHON!
    echo 📥 Tai Python tu: https://python.org/downloads/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('py --version 2^>^&1') do echo ✅ %%i da san sang
)

echo.
echo [BUOC 3/6] Dong bo va kiem tra cau hinh chi tiet...
echo    ^> Dang dong bo tu .env sang config.json...
py -c "from config import config_manager; config_manager.update_from_env(); print('✅ Dong bo thanh cong')" 2>nul
if errorlevel 1 (
    echo ❌ Loi dong bo cau hinh
>>>>>>> bcfe1649917bae643a4c35c8cd621d1685a26574
    pause
    exit /b 1
)

<<<<<<< HEAD
REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
=======
echo    ^> Dang kiem tra tinh hop le cua cau hinh...
py -c "from config import config_manager; result = config_manager.validate_configuration(); print('✅ Cau hinh hop le' if result else '❌ Cau hinh khong hop le'); exit(0 if result else 1)" 2>nul
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
py -c "import telethon, pandas, tqdm, aiofiles; print('✅ Tat ca dependencies da san sang')" 2>nul
if errorlevel 1 (
    echo ❌ Thieu dependencies! Dang tu dong cai dat...
    echo    ^> Chay pip install...
    pip install -r requirements.txt
>>>>>>> bcfe1649917bae643a4c35c8cd621d1685a26574
    if errorlevel 1 (
        echo [ERROR] Cannot create virtual environment
        pause
        exit /b 1
    )
    echo [INFO] Virtual environment created successfully
)

<<<<<<< HEAD
REM Activate virtual environment
echo [INFO] Activating virtual environment...
if exist "venv\Scripts\activate.bat" (
    call "venv\Scripts\activate.bat"
    if errorlevel 1 (
        echo [WARNING] Virtual environment activation failed, continuing without venv
    ) else (
        echo [INFO] Virtual environment activated successfully
    )
) else (
    echo [WARNING] Virtual environment not found, running without venv
)

REM Install/update dependencies
echo [INFO] Installing dependencies...
pip install -r requirements.txt --quiet --upgrade
=======
echo.
echo [BUOC 5/6] Khoi tao he thong logging...
echo    ^> Tao thu muc logs neu chua co...
if not exist logs mkdir logs
echo    ^> Kiem tra cau hinh logging...
py -c "from logger import setup_detailed_logging; import json; config = json.load(open('config.json', 'r', encoding='utf-8')); setup_detailed_logging(config.get('logging', {})); print('✅ He thong logging da san sang')" 2>nul
>>>>>>> bcfe1649917bae643a4c35c8cd621d1685a26574
if errorlevel 1 (
    echo [WARNING] Some dependencies may not be installed properly
    echo [INFO] Trying to install essential packages...
    pip install telethon pandas tqdm aiofiles openpyxl --quiet
    if errorlevel 1 (
        echo [ERROR] Failed to install essential dependencies
        echo [INFO] Please run: pip install -r requirements.txt
        pause
        exit /b 1
    )
)

REM Check if config.json exists
if not exist "config.json" (
    echo [WARNING] config.json not found, creating default...
    python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.save_config()"
)

REM Validate configuration
echo [INFO] Validating configuration...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); exit(0 if cm.validate_configuration() else 1)" 2>nul
if errorlevel 1 (
    echo [WARNING] Configuration incomplete or invalid
    echo [INFO] Opening configuration setup...
    python config_setup.py
    if errorlevel 1 (
        echo [ERROR] Configuration setup failed
        pause
        exit /b 1
    )
)

REM Create necessary directories
echo [INFO] Creating necessary directories...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.ensure_directories()"

REM Check for enabled channels
echo [INFO] Checking configured channels...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); channels = cm.get_enabled_channels(); exit(0 if channels else 1)" 2>nul
if errorlevel 1 (
    echo [WARNING] No channels enabled for scanning
    echo [INFO] Please configure at least one channel
    python config_setup.py
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

REM Check Telegram API configuration
echo [INFO] Checking Telegram API configuration...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); tg = cm.get_config('telegram'); exit(0 if tg.get('api_id') and tg.get('api_hash') and tg.get('phone_number') else 1)" 2>nul
if errorlevel 1 (
    echo [WARNING] Telegram API configuration incomplete
    echo [INFO] Please configure API ID, API Hash and phone number
    python config_setup.py
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

:menu
REM Show configuration summary
echo.
echo ===============================================
echo           CONFIGURATION INFO
echo ===============================================
python -c "from config_manager import ConfigManager; cm = ConfigManager(); print('Telegram: ' + str(cm.get_config('telegram').get('phone_number', 'N/A'))); channels = cm.get_enabled_channels(); print('Enabled channels: ' + str(len(channels))); print('Output directory: ' + str(cm.get_config('output').get('directory', 'output'))); ui = cm.get_config('ui'); print('UI: ' + ('Enabled' if ui.get('enabled') else 'Disabled') + ' (Port: ' + str(ui.get('server', {}).get('port', 8080)) + ')')"
echo.

REM Ask user what to do
echo ===============================================
echo             SELECT ACTION
echo ===============================================
echo 1. Scan channels/groups (Scanner)
echo 2. Start Web UI
echo 3. Reconfigure
echo 4. View statistics
echo 0. Exit
echo.
set /p choice="Choose (0-4): "

if "%choice%"=="1" goto :scanner
if "%choice%"=="2" goto :ui
if "%choice%"=="3" goto :config
if "%choice%"=="4" goto :stats
if "%choice%"=="0" goto :exit
goto :invalid

:scanner
echo.
echo ===============================================
echo             STARTING SCANNER
echo ===============================================
python main.py
goto :end

:ui
echo.
echo ===============================================
echo             STARTING WEB UI
echo ===============================================
echo UI will be available at: http://127.0.0.1:8080
echo Press Ctrl+C to stop server
python -c "print('Web UI will be implemented in next version!')"
pause
goto :menu

:config
echo.
echo ===============================================
echo           OPENING CONFIGURATION
echo ===============================================
python config_setup.py
goto :menu

:stats
echo.
echo ===============================================
echo            SYSTEM STATISTICS
echo ===============================================
python -c "from config_manager import ConfigManager; import os; cm = ConfigManager(); print('Directories:'); dirs = ['output', 'logs', 'downloads', 'data']; [print('  ' + d + ': ' + ('OK' if os.path.exists(d) else 'MISSING')) for d in dirs]; print('Channels:'); channels = cm.get_config('channels').get('list', []); print('  Total: ' + str(len(channels))); print('  Enabled: ' + str(len([c for c in channels if c.get('enabled')])))"
pause
goto :menu

:invalid
echo [ERROR] Invalid choice!
pause
goto :menu

:end
REM Check exit code
if errorlevel 1 (
    echo.
    echo [ERROR] Application ended with error
    echo [INFO] Check logs for more details
) else (
    echo.
    echo [SUCCESS] Application completed successfully
)

echo.
echo Results saved in 'output' directory
echo Logs saved in 'logs' directory
echo Database saved in 'data' directory
echo.
pause
goto :menu

<<<<<<< HEAD
:exit
echo Goodbye!
exit /b 0
=======
py main.py

echo.
echo ================================================================
echo 🎉 HOAN THANH!
echo ================================================================
echo 📁 Ket qua duoc luu trong thu muc 'output/'
echo 📊 Log chi tiet trong thu muc 'logs/'
echo.
echo Nhan phim bat ky de thoat...
pause >nul
>>>>>>> bcfe1649917bae643a4c35c8cd621d1685a26574
