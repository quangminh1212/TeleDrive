@echo off
chcp 65001 >nul
cls

echo ================================================================
echo                   TELEDRIVE WEB INTERFACE
echo ================================================================
echo.
echo [INFO] Mac dinh: Chay web interface tai http://localhost:5000
echo [INFO] Tuy chon:
echo    run_simple.bat          - Chay web interface (mac dinh)
echo    run_simple.bat scanner  - Chay scanner CLI
echo    run_simple.bat config   - Menu cau hinh
echo.

REM Check arguments
if "%1"=="scanner" goto SCANNER
if "%1"=="config" goto CONFIG_MENU

echo [BUOC 1/3] Kiem tra cau hinh Telegram API...
python check_config.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] CHUA CAU HINH API TELEGRAM!
    echo.
    echo [INFO] Huong dan cau hinh:
    echo    1. Chinh sua file config.json
    echo    2. Dien API_ID, API_HASH va so dien thoai
    echo    3. Lay API tu: https://my.telegram.org/apps
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Cau hinh Telegram API hop le
)

echo.
echo [BUOC 2/3] Kiem tra Python dependencies...
python -c "import telethon, flask, pandas" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Thieu dependencies! Dang cai dat...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Khong the cai dat dependencies!
        pause
        exit /b 1
    )
    echo [OK] Da cai dat dependencies thanh cong
) else (
    echo [OK] Dependencies da san sang
)

echo.
echo [BUOC 3/3] Khoi dong web server...
echo ================================================================
echo [INFO] DANG KHOI DONG WEB INTERFACE...
echo ================================================================
echo.
echo [INFO] Web interface se chay tai: http://localhost:5000
echo [INFO] Nhan Ctrl+C de dung server
echo.

python main.py

echo.
echo ================================================================
echo [INFO] WEB INTERFACE DA DUNG
echo ================================================================
echo.
pause
goto END

:SCANNER
echo ================================================================
echo                 TELEGRAM FILE SCANNER (CLI MODE)
echo ================================================================
echo.
echo [INFO] CHAY SCANNER COMMAND LINE...
echo.

python src/core/main.py

echo.
echo ================================================================
echo [INFO] SCANNER HOAN THANH!
echo ================================================================
echo.
pause
goto END

:CONFIG_MENU
echo ================================================================
echo                    CAU HINH TELEDRIVE
echo ================================================================
echo.
echo [1] Xem cau hinh hien tai
echo [2] Cau hinh channel Telegram
echo [3] Quay lai menu chinh
echo.
set /p choice="Lua chon (1-3): "

if "%choice%"=="1" (
    echo.
    echo Cau hinh hien tai:
    echo ================================================================
    python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); print('Channel:', config.get('channels',{}).get('default_channel','Chua cau hinh')); print('API_ID:', config.get('telegram',{}).get('api_id','Chua cau hinh')); print('Phone:', config.get('telegram',{}).get('phone_number','Chua cau hinh'))"
    echo.
    pause
    goto CONFIG_MENU
)

if "%choice%"=="2" (
    echo.
    echo Nhap channel URL hoac username:
    set /p new_channel="Channel: "
    
    if not "!new_channel!"=="" (
        echo Dang cap nhat channel...
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['channels']['default_channel']='!new_channel!'; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)"
        echo [OK] Da cap nhat channel: !new_channel!
    )
    echo.
    pause
    goto CONFIG_MENU
)

if "%choice%"=="3" goto START

goto CONFIG_MENU

:END
echo.
echo Cam on ban da su dung TeleDrive!
exit /b 0
