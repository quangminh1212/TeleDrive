@echo off
title TeleDrive - Telegram File Scanner
color 0B

echo.
echo ================================================================
echo                    TELEDRIVE PROJECT
echo              Telegram File Scanner ^& Manager
echo ================================================================
echo.

echo [INFO] Cau hinh da duoc thiet lap trong config.json
echo [INFO] Bo qua kiem tra cau hinh va khoi dong truc tiep...
echo.

echo [BUOC 1/4] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ KHONG TIM THAY PYTHON!
    echo.
    echo 📥 Vui long cai dat Python 3.8+ tu: https://python.org/downloads/
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo ✅ %%i da san sang
)

echo.
echo [BUOC 2/4] Kiem tra dependencies...
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
echo [BUOC 3/4] Khoi tao thu muc va he thong...
echo    ^> Tao cac thu muc can thiet...
if not exist output mkdir output
if not exist logs mkdir logs
if not exist data mkdir data
echo ✅ Cac thu muc da san sang

echo.
echo [BUOC 4/4] Chon giao dien...
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
    echo    • Dang nhap voi: admin / admin123
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
echo    • Chay lai 'run_direct.bat' de chon giao dien khac
echo    • Dung 'start.bat' de khoi dong truc tiep Web Interface
echo    • Dung 'config.bat' de thay doi cau hinh
echo    • Xem file log de debug neu co loi
echo.
echo 🌐 Giao dien Web: http://localhost:3000 (neu da chon Web Interface)
echo 💻 CLI: Chay lai run_direct.bat va chon option 2
echo.
echo Cam on ban da su dung TeleDrive! 🚀
echo.
echo Nhan phim bat ky de thoat...
pause >nul
