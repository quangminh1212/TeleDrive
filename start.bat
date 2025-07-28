@echo off
title TeleDrive - Web Interface
color 0B

echo.
echo ================================================================
echo                    TELEDRIVE WEB INTERFACE
echo              Modern Google Drive-like Interface
echo ================================================================
echo.

echo [BUOC 1/5] Kiem tra cau hinh du an...
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

echo.
echo [BUOC 2/5] Kiem tra Python...
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
echo [BUOC 3/5] Kiem tra dependencies...
echo    ^> Kiem tra cac thu vien Python can thiet...
python -c "import flask, flask_socketio, eventlet; print('✅ Web dependencies da san sang')" 2>nul
if errorlevel 1 (
    echo ⚠️ Thieu web dependencies!
    echo    ^> Dang tu dong cai dat...
    echo.
    pip install flask flask-socketio eventlet --quiet
    if errorlevel 1 (
        echo ❌ Khong the cai dat web dependencies!
        echo.
        echo 🔧 Thu cac cach sau:
        echo    1. Chay: setup.bat
        echo    2. Cai dat thu cong: pip install -r requirements.txt
        echo    3. Kiem tra ket noi internet
        echo.
        pause
        exit /b 1
    )
    echo ✅ Da cai dat web dependencies thanh cong
) else (
    echo ✅ Web dependencies da san sang
)

echo.
echo [BUOC 4/5] Khoi tao thu muc va he thong...
echo    ^> Tao cac thu muc can thiet...
if not exist output mkdir output
if not exist logs mkdir logs
if not exist data mkdir data
if not exist templates mkdir templates
if not exist static mkdir static
if not exist static\css mkdir static\css
if not exist static\js mkdir static\js
echo ✅ Cac thu muc da san sang

echo.
echo [BUOC 5/5] Khoi dong Web Interface...
echo ================================================================
echo 🌐 DANG KHOI DONG TELEDRIVE WEB INTERFACE...
echo ================================================================
echo.
echo 📱 TeleDrive - Modern Web Interface
echo 🎨 Google Drive-like Design
echo 🔐 Ho tro Private ^& Public Channels
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
echo    • Xem ket qua trong Dashboard
echo.
echo ⏹️  Nhan Ctrl+C de dung web server
echo ================================================================
echo.

REM Chay web interface
python app.py

echo.
echo ================================================================
echo 🎉 TELEDRIVE WEB INTERFACE DA DONG!
echo ================================================================
echo.
echo 💡 Cam on ban da su dung TeleDrive Web Interface!
echo.
echo Nhan phim bat ky de thoat...
pause >nul
