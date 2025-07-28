@echo off
title TeleDrive - Telegram File Scanner
color 0B

echo.
echo ================================================================
echo                    TELEDRIVE PROJECT
echo              Telegram File Scanner ^& Manager
echo ================================================================
echo.

echo [BUOC 1/7] Kiem tra cau hinh du an...
echo    ^> Kiem tra file config.json...
if not exist config.json (
    echo ❌ KHONG TIM THAY FILE config.json!
    echo.
    echo 🔧 Dang tao cau hinh mac dinh...
    python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.create_default_config(); print('✅ Da tao config.json mac dinh')" 2>nul
    if errorlevel 1 (
        echo ❌ Khong the tao cau hinh mac dinh!
        echo 🔧 Chay setup.bat truoc khi su dung
        pause
        exit /b 1
    )
) else (
    echo ✅ Tim thay file config.json
)

echo    ^> Kiem tra cau hinh Telegram API...
python -c "import json; config = json.load(open('config.json', 'r', encoding='utf-8')); api_id = config.get('telegram', {}).get('api_id', ''); phone = config.get('telegram', {}).get('phone_number', ''); configured = bool(api_id and phone and phone != '+84xxxxxxxxx'); print('✅ API da duoc cau hinh' if configured else '⚠️ API chua duoc cau hinh'); exit(0 if configured else 1)" 2>nul
if errorlevel 1 (
    echo.
    echo ⚠️ TELEGRAM API CHUA DUOC CAU HINH!
    echo.
    echo 🔍 Dang kiem tra lai cau hinh chi tiet...
    python -c "from config_manager import ConfigManager; cm = ConfigManager(); result = cm.validate_configuration(); exit(0 if result else 1)" 2>nul
    if not errorlevel 1 (
        echo.
        echo ✅ Cau hinh thuc te da hop le! Tiep tuc chay chuong trinh...
        goto :config_ok
    )
    echo.
    echo 📝 Huong dan cau hinh:
    echo    1. Chay 'config.bat' de cau hinh API
    echo    2. Hoac chinh sua truc tiep file 'config.json'
    echo    3. Hoac su dung 'run_direct.bat' de bo qua kiem tra
    echo.
    echo 🔗 Lay API credentials tu: https://my.telegram.org/apps
    echo.
    echo Ban co muon cau hinh ngay bay gio khong? (Y/N)
    set /p choice="Lua chon: "
    if /i "%choice%"=="Y" (
        echo.
        echo 🔧 Mo config manager...
        call config.bat
        echo.
        echo Quay lai run.bat...
        pause
        goto :start_check
    ) else (
        echo.
        echo ❌ Khong the chay ma khong co cau hinh API!
        echo 💡 Thu chay 'run_direct.bat' neu ban chac chan cau hinh da dung!
        pause
        exit /b 1
    )
) else (
    echo ✅ Telegram API da duoc cau hinh
)

:config_ok

:start_check

echo.
echo [BUOC 2/7] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ KHONG TIM THAY PYTHON!
    echo.
    echo 📥 Vui long cai dat Python 3.8+ tu: https://python.org/downloads/
    echo 🔧 Hoac chay setup.bat de cai dat tu dong
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo ✅ %%i da san sang
)

echo.
echo [BUOC 3/7] Kiem tra va dong bo cau hinh...
echo    ^> Kiem tra tinh hop le cua cau hinh...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); result = cm.validate_configuration(); print('✅ Cau hinh hop le' if result else '⚠️ Cau hinh co van de'); exit(0 if result else 1)" 2>nul
if errorlevel 1 (
    echo.
    echo ⚠️ CAU HINH CO VAN DE!
    echo 🔧 Dang thu dong bo cau hinh...

    REM Thu dong bo neu co file .env
    if exist .env (
        echo    ^> Tim thay file .env, dang dong bo...
        python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.sync_env_to_config(); print('✅ Dong bo thanh cong')" 2>nul
        if not errorlevel 1 (
            echo ✅ Da dong bo cau hinh tu .env
        )
    )

    REM Kiem tra lai sau khi dong bo
    python -c "from config_manager import ConfigManager; cm = ConfigManager(); result = cm.validate_configuration(); exit(0 if result else 1)" 2>nul
    if errorlevel 1 (
        echo ❌ Cau hinh van chua hop le sau khi dong bo!
        echo 🔧 Chay 'config.bat' de cau hinh thu cong
        pause
        exit /b 1
    )
) else (
    echo ✅ Cau hinh da hop le
)

echo.
echo [BUOC 4/7] Kiem tra dependencies...
echo    ^> Kiem tra cac thu vien Python can thiet...
python -c "import telethon, pandas, tqdm, aiofiles, openpyxl; print('✅ Tat ca dependencies da san sang')" 2>nul
if errorlevel 1 (
    echo ⚠️ Thieu mot so dependencies!
    echo    ^> Dang tu dong cai dat...
    echo.
    pip install -r requirements.txt --quiet
    if errorlevel 1 (
        echo ❌ Khong the cai dat dependencies!
        echo.
        echo 🔧 Thu cac cach sau:
        echo    1. Chay: setup.bat
        echo    2. Cai dat thu cong: pip install -r requirements.txt
        echo    3. Kiem tra ket noi internet
        echo.
        pause
        exit /b 1
    )
    echo ✅ Da cai dat dependencies thanh cong
) else (
    echo ✅ Tat ca dependencies da san sang
)

echo.
echo [BUOC 5/7] Khoi tao thu muc va he thong...
echo    ^> Tao cac thu muc can thiet...
if not exist output mkdir output
if not exist logs mkdir logs
if not exist data mkdir data
echo ✅ Cac thu muc da san sang

echo    ^> Khoi tao he thong logging...
python -c "from logger import setup_detailed_logging; import json; config = json.load(open('config.json', 'r', encoding='utf-8')); setup_detailed_logging(config.get('logging', {})); print('✅ Logging system ready')" 2>nul
if errorlevel 1 (
    echo ⚠️ Khong the khoi tao detailed logging (se su dung basic logging)
) else (
    echo ✅ He thong logging chi tiet da san sang
)

echo.
echo [BUOC 6/7] Kiem tra ket noi Telegram...
echo    ^> Kiem tra session va credentials...
python -c "import json; config = json.load(open('config.json', 'r', encoding='utf-8')); telegram = config.get('telegram', {}); api_id = telegram.get('api_id', ''); api_hash = telegram.get('api_hash', ''); phone = telegram.get('phone_number', ''); assert api_id and api_hash and phone, 'Missing credentials'; print('✅ Credentials loaded successfully')" 2>nul
if errorlevel 1 (
    echo ❌ Loi khi load credentials!
    echo 🔧 Kiem tra lai cau hinh trong config.json
    pause
    exit /b 1
) else (
    echo ✅ Telegram credentials da san sang
)

echo.
echo [BUOC 7/7] Chon giao dien...
echo ================================================================
echo 🚀 CHON GIAO DIEN TELEDRIVE
echo ================================================================
echo.
echo 📱 TeleDrive - Telegram File Scanner ^& Manager
echo 🔐 Ho tro Private ^& Public Channels
echo.
echo 🎯 Chon giao dien ban muon su dung:
echo.
echo    1. 🌐 WEB INTERFACE (Khuyến nghị)
echo       • Giao diện hiện đại như Google Drive
echo       • Dễ sử dụng với chuột và bàn phím
echo       • Theo dõi tiến trình real-time
echo       • Truy cập: http://localhost:3000
echo.
echo    2. 💻 COMMAND LINE INTERFACE
echo       • Giao diện dòng lệnh truyền thống
echo       • Phù hợp cho người dùng nâng cao
echo       • Chạy trực tiếp trong terminal
echo.
echo    3. ❌ Thoát
echo.
set /p choice="Nhap lua chon (1/2/3): "

if "%choice%"=="1" (
    echo.
    echo 🌐 Khoi dong Web Interface...
    echo ================================================================
    echo 🚀 DANG KHOI DONG TELEDRIVE WEB INTERFACE...
    echo ================================================================
    echo.
    echo 🌐 Truy cap tai: http://localhost:3000
    echo 📊 Dashboard: http://localhost:3000
    echo ⚙️  Settings: http://localhost:3000/settings
    echo 🔍 Scanner: http://localhost:3000/scan
    echo.
    echo 💡 Meo:
    echo    • Mo trinh duyet va truy cap http://localhost:3000
    echo    • Cau hinh API credentials trong Settings
    echo    • Su dung Scanner de quet channel
    echo.
    echo ⏹️  Nhan Ctrl+C de dung web server
    echo ================================================================
    echo.

    REM Chay web interface
    python app.py

) else if "%choice%"=="2" (
    echo.
    echo 💻 Khoi dong Command Line Interface...
    echo ================================================================
    echo 🚀 DANG KHOI DONG TELEDRIVE CLI...
    echo ================================================================
    echo.
    echo 📋 Cac dinh dang channel ho tro:
    echo    • @channelname                 (public channel)
    echo    • https://t.me/channelname     (public channel link)
    echo    • https://t.me/joinchat/xxxxx  (private invite - old format)
    echo    • https://t.me/+xxxxx          (private invite - new format)
    echo.
    echo 📁 Ket qua luu tai: 'output/' (JSON, CSV, Excel)
    echo 📊 Log chi tiet tai: 'logs/' (realtime ^& archived)
    echo 🔧 Cau hinh tai: 'config.json' ^& 'config.bat'
    echo.
    echo ⏹️  Nhan Ctrl+C de dung chuong trinh
    echo ================================================================
    echo.

    REM Chay chuong trinh CLI
    python main.py

) else if "%choice%"=="3" (
    echo.
    echo ❌ Thoat chuong trinh...
    timeout /t 2 >nul
    exit /b 0

) else (
    echo.
    echo ❌ Lua chon khong hop le! Vui long chon 1, 2 hoac 3.
    timeout /t 3 >nul
    goto :start_check
)

echo.
echo ================================================================
echo 🎉 TELEDRIVE DA HOAN THANH!
echo ================================================================
echo.
echo 📊 Thong ke phien lam viec:
if exist output (
    for /f %%i in ('dir /b output\*.json 2^>nul ^| find /c /v ""') do echo    • File JSON: %%i
    for /f %%i in ('dir /b output\*.csv 2^>nul ^| find /c /v ""') do echo    • File CSV: %%i
    for /f %%i in ('dir /b output\*.xlsx 2^>nul ^| find /c /v ""') do echo    • File Excel: %%i
)
echo.
echo 📁 Ket qua duoc luu trong: 'output/'
echo 📊 Log chi tiet trong: 'logs/'
echo 🔧 Cau hinh trong: 'config.json'
echo.
echo 💡 Meo:
echo    • Chay lai 'run.bat' de chon giao dien khac
echo    • Dung 'start.bat' de khoi dong truc tiep Web Interface
echo    • Dung 'config.bat' de thay doi cau hinh
echo    • Xem file log de debug neu co loi
echo.
echo 🌐 Giao dien Web: http://localhost:3000 (neu da chon Web Interface)
echo 💻 CLI: Chay lai run.bat va chon option 2
echo.
echo Cam on ban da su dung TeleDrive! 🚀
echo.
echo Nhan phim bat ky de thoat...
pause >nul
