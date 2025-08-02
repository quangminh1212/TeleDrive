@echo off
chcp 65001 >nul
title TeleDrive - Telegram File Scanner with Detailed Logging
color 0B

echo.
echo ================================================================
echo                    TELEDRIVE PROJECT
echo              Telegram File Scanner ^& Manager
echo                   với Logging Chi tiết
echo ================================================================
echo.

echo [BUOC 1/7] Kiem tra cau hinh du an...
echo    ^> Kiem tra file config.json...
if not exist config.json (
    echo ❌ KHONG TIM THAY FILE config.json!
    echo.
    echo 🔧 Dang tao cau hinh mac dinh...
    python -c "from source.config import create_default_config; create_default_config(); print('✅ Da tao config.json mac dinh')" 2>nul
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
    python -c "from source.config import validate_configuration; result = validate_configuration(); exit(0 if result else 1)" 2>nul
    if not errorlevel 1 (
        echo.
        echo ✅ Cau hinh thuc te da hop le! Tiep tuc chay chuong trinh...
        goto :config_ok
    )
    echo.
    echo 📝 Huong dan cau hinh:
    echo    1. Chinh sua truc tiep file 'config.json'
    echo    2. Hoac cau hinh trong Web Interface Settings
    echo.
    echo 🔗 Lay API credentials tu: https://my.telegram.org/apps
    echo.
    echo ⚠️ Tiep tuc khoi dong voi cau hinh hien tai...
    echo 💡 Neu gap loi, hay cau hinh API trong Settings cua Web Interface
    timeout /t 3 >nul
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
python -c "from source.config import validate_configuration; result = validate_configuration(); print('✅ Cau hinh hop le' if result else '⚠️ Cau hinh co van de'); exit(0)" 2>nul
if errorlevel 1 (
    echo.
    echo ⚠️ CAU HINH CO VAN DE!
    echo 🔧 Dang thu dong bo cau hinh...

    REM Thu dong bo neu co file .env
    if exist .env (
        echo    ^> Tim thay file .env, dang dong bo...
        python -c "from source.config import sync_env_to_config; sync_env_to_config(); print('✅ Dong bo thanh cong')" 2>nul
        if not errorlevel 1 (
            echo ✅ Da dong bo cau hinh tu .env
        )
    )

    REM Kiem tra lai sau khi dong bo
    python -c "from source.config import validate_configuration; result = validate_configuration(); exit(0 if result else 1)" 2>nul
    if errorlevel 1 (
        echo ❌ Cau hinh van chua hop le sau khi dong bo!
        echo 🔧 Chinh sua 'config.json' de cau hinh thu cong
        pause
        exit /b 1
    )
) else (
    echo ✅ Cau hinh da hop le
)

echo.
echo [BUOC 4/7] Kiem tra dependencies...
echo    ^> Kiem tra cac thu vien Python can thiet...
python -c "import telethon, flask, sqlalchemy, flask_socketio, flask_login, flask_wtf; print('✅ Tat ca dependencies da san sang')" 2>nul
if errorlevel 1 (
    echo ⚠️ Thieu mot so dependencies!
    echo 🔧 Dang cai dat dependencies...
    pip install -r requirements.txt >nul 2>&1
    if errorlevel 1 (
        echo ❌ Khong the cai dat dependencies!
        echo.
        echo 🔧 Thu cac cach sau:
        echo    1. Cai dat thu cong: pip install -r requirements.txt
        echo    2. Kiem tra ket noi internet
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

echo    ^> Khoi tao he thong logging chi tiet...
python -c "from source.logger import setup_detailed_logging, log_step; import json; config = json.load(open('config.json', 'r', encoding='utf-8')); setup_detailed_logging(config.get('logging', {})); log_step('KHỞI TẠO HỆ THỐNG', 'TeleDrive đang khởi động với logging chi tiết'); print('✅ Detailed logging system ready')" 2>nul
if errorlevel 1 (
    echo ⚠️ Khong the khoi tao detailed logging (se su dung basic logging)
) else (
    echo ✅ He thong logging chi tiet da san sang
    echo    📊 Log files: logs/teledrive.log, logs/api.log, logs/files.log, logs/errors.log
)

echo.
echo [BUOC 6/7] Kiem tra ket noi Telegram...
echo    ^> Kiem tra session va credentials...
python -c "import json; config = json.load(open('config.json', 'r', encoding='utf-8')); telegram = config.get('telegram', {}); api_id = telegram.get('api_id', ''); api_hash = telegram.get('api_hash', ''); phone = telegram.get('phone_number', ''); print('✅ Credentials loaded successfully'); assert api_id and api_hash and phone, 'Missing credentials'" 2>nul
if errorlevel 1 (
    echo ❌ Loi khi load credentials!
    echo 🔧 Kiem tra lai cau hinh trong config.json
    pause
    exit /b 1
) else (
    echo ✅ Telegram credentials da san sang
)

echo.
echo [BUOC 7/8] Kill tat ca port va processes dang chay...
echo    ^> Dong tat ca port va processes de tranh xung dot...
echo    ^> Dieu nay dam bao TeleDrive chay tren port 3000 sach se

REM Kill tat ca port web server pho bien (1000-9999)
echo    ^> Dong tat ca port Flask/Node.js/Web servers...
for %%p in (1000 1001 1080 1337 2000 2001 2080 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 4000 4001 4200 4300 4400 4500 5000 5001 5173 5432 5500 5555 6000 6001 6379 7000 7001 7777 8000 8001 8080 8081 8888 8889 9000 9001 9090 9999) do (
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p "') do (
        if not "%%a"=="" (
            echo       - Dong port %%p (PID: %%a)
            taskkill /PID %%a /F >nul 2>&1
        )
    )
)

REM Kill tat ca Python processes dang chay
echo    ^> Dong tat ca Python processes...
taskkill /IM python.exe /F >nul 2>&1
taskkill /IM pythonw.exe /F >nul 2>&1

REM Kill tat ca Node.js processes dang chay
echo    ^> Dong tat ca Node.js processes...
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM nodejs.exe /F >nul 2>&1

REM Kill tat ca processes co ten chua "flask", "django", "fastapi"
echo    ^> Dong tat ca web framework processes...
tasklist | findstr /i "flask" >nul 2>&1 && taskkill /F /IM python.exe /FI "WINDOWTITLE eq *flask*" >nul 2>&1
tasklist | findstr /i "django" >nul 2>&1 && taskkill /F /IM python.exe /FI "WINDOWTITLE eq *django*" >nul 2>&1
tasklist | findstr /i "fastapi" >nul 2>&1 && taskkill /F /IM python.exe /FI "WINDOWTITLE eq *fastapi*" >nul 2>&1
tasklist | findstr /i "uvicorn" >nul 2>&1 && taskkill /F /IM python.exe /FI "WINDOWTITLE eq *uvicorn*" >nul 2>&1

REM Kill tat ca processes TeleDrive cu
echo    ^> Dong tat ca TeleDrive processes cu...
taskkill /F /FI "WINDOWTITLE eq *TeleDrive*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq *teledrive*" >nul 2>&1

REM Cho 2 giay de cac process ket thuc hoan toan
echo    ^> Cho 2 giay de cac process ket thuc...
timeout /t 2 >nul

echo ✅ Da dong tat ca port va processes

REM Hien thi thong ke
echo    ^> Thong ke: Da kill tat ca Python, Node.js, va Web server processes
echo    ^> Thong ke: Da kill tat ca port tu 1000-9999
echo    ^> Thong ke: Da kill tat ca TeleDrive processes cu

REM Kiem tra port 3000 co trong khong
echo    ^> Kiem tra port 3000 lan cuoi...
netstat -ano | findstr ":3000 " >nul 2>&1
if not errorlevel 1 (
    echo    ⚠️ Port 3000 van dang duoc su dung, thu kill lan cuoi...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 1 >nul
)

echo ✅ Port 3000 da san sang cho TeleDrive

echo.
echo [BUOC 8/8] Khoi dong Web Interface voi Logging...
echo ================================================================
echo 🌐 DANG KHOI DONG TELEDRIVE WEB INTERFACE...
echo ================================================================
echo.
echo 📱 TeleDrive - Modern Web Interface
echo 🎨 Google Drive-like Design
echo 🔐 Ho tro Private ^& Public Channels
echo 📊 Logging chi tiet cho tung buoc
echo.
echo 🌐 Truy cap tai: http://localhost:3000
echo 📊 Dashboard: http://localhost:3000
echo ⚙️  Settings: http://localhost:3000/settings
echo 🔍 Scanner: http://localhost:3000/scan
echo.
echo 📊 Theo doi logs:
echo    • Log chinh: logs/teledrive.log
echo    • Log API: logs/api.log
echo    • Log files: logs/files.log
echo    • Log loi: logs/errors.log
echo.
echo 💡 Meo:
echo    • Mo trinh duyet va truy cap http://localhost:3000
echo    • Cau hinh API credentials trong Settings
echo    • Su dung Scanner de quet channel
echo    • Xem ket qua trong Dashboard
echo    • Theo doi logs de debug
echo.
echo ⏹️  Nhan Ctrl+C de dung web server
echo ================================================================
echo.

REM Chay web interface
python start_server.py

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
echo    • Chay lai 'run.bat' de khoi dong lai Web Interface
echo    • Chinh sua 'config.json' de thay doi cau hinh
echo    • Xem file log de debug neu co loi
echo.
echo 🌐 Giao dien Web: http://localhost:3000
echo 💻 CLI: Chay 'python source/main.py' de su dung Command Line
echo 📊 Logs: Xem thu muc 'logs/' de theo doi chi tiet
echo.
echo Cam on ban da su dung TeleDrive! 🚀
echo.
echo Nhan phim bat ky de thoat...
pause >nul
