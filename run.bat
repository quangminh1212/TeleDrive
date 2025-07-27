@echo off
setlocal enabledelayedexpansion
title Telegram File Scanner
color 0D

REM Kiem tra tham so dau vao
if "%1"=="config" goto CONFIG_MENU
if "%1"=="web" goto WEB_MODE
if "%1"=="web-setup" goto WEB_SETUP
if "%1"=="scanner" goto SCANNER_MODE
if "%1"=="production" goto PRODUCTION_MODE

echo.
echo ================================================================
echo                    TELEDRIVE WEB INTERFACE
echo ================================================================
echo.
echo [INFO] Mac dinh: Chay web interface tai http://localhost:5000
echo [INFO] Tuy chon:
echo    run.bat            - Chay web interface (mac dinh)
echo    run.bat production - Chay production server
echo    run.bat scanner    - Chay scanner CLI
echo    run.bat config     - Menu cau hinh
echo.

:MAIN_START
echo [BUOC 1/5] Kiem tra cau hinh Telegram API...
echo    ^> Kiem tra config.json...
python check_config.py >nul
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
echo [BUOC 2/5] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] KHONG TIM THAY PYTHON!
    echo [INFO] Tai Python tu: https://python.org/downloads/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo [OK] %%i da san sang
)

echo.
echo [BUOC 3/5] Kiem tra va tao cau hinh...
echo    ^> Kiem tra config.json...
if not exist config.json (
    echo [ERROR] File config.json khong ton tai!
    pause
    exit /b 1
) else (
    echo [OK] Tim thay config.json
)

echo    ^> Kiem tra config.json...
python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); channel=config.get('channels',{}).get('default_channel',''); exit(0 if channel and channel not in ['', '@your_channel_here'] else 1)" 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] CHUA CAU HINH CHANNEL!
    echo [INFO] Chay: run.bat config de cau hinh channel
    echo.
    pause
    exit /b 1
)

echo    ^> Config.json da san sang

echo    ^> Dang kiem tra tinh hop le cua cau hinh...
python check_config.py >nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] CAU HINH CHUA HOP LE!
    echo [INFO] Chay: run.bat config
    echo.
    pause
    exit /b 1
)

echo.
echo [BUOC 4/5] Kiem tra dependencies...
echo    ^> Dang kiem tra cac thu vien Python...
python -c "import telethon, pandas, tqdm, aiofiles; print('[OK] Tat ca dependencies da san sang')" 2>nul
if errorlevel 1 (
    echo [ERROR] Thieu dependencies! Dang tu dong cai dat...
    echo    ^> Chay pip install...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Khong the cai dat dependencies!
        echo [INFO] Thu chay: setup.bat
        pause
        exit /b 1
    )
    echo [OK] Da cai dat dependencies thanh cong
)

echo.
echo [BUOC 5/5] Khoi tao he thong logging...
echo    ^> Tao thu muc logs neu chua co...
if not exist logs mkdir logs
echo    ^> Kiem tra cau hinh logging...
python -c "import sys; import os; sys.path.insert(0, 'src'); from utils.logger import setup_detailed_logging; import json; config = json.load(open('config.json', 'r', encoding='utf-8')); setup_detailed_logging(config.get('logging', {})); print('[OK] He thong logging da san sang')" 2>nul
if errorlevel 1 (
    echo [WARNING] Khong the khoi tao logging (se chay khong co log chi tiet)
)

echo.
echo [BUOC 6/6] Khoi dong TeleDrive Web Interface...
echo ================================================================
echo [INFO] DANG KHOI DONG WEB INTERFACE TU DONG...
echo ================================================================
echo.
echo [INFO] Web interface se chay tai: http://localhost:5000
echo [INFO] Nhan Ctrl+C de dung server
echo [INFO] Du lieu hien thi tu thu muc: output/
echo.
echo [INFO] Luu y:
echo    - Giu cua so nay mo de server tiep tuc chay
echo    - Lan dau su dung: truy cap /setup de tao admin
echo    - Neu muon chay scanner CLI: run.bat scanner
echo.

python main.py

echo.
echo ================================================================
echo [INFO] WEB INTERFACE DA DUNG
echo ================================================================
echo.
echo [INFO] Neu muon chay lai: run.bat
echo [INFO] Du lieu trong thu muc: output/
echo [INFO] Log chi tiet trong thu muc: logs/
echo.
echo Nhan phim bat ky de thoat...
pause >nul
goto END

:CONFIG_MENU
cls
echo.
echo ================================================================
echo                    CAU HINH NHANH
echo ================================================================
echo.
echo 1. Xem cau hinh hien tai
echo 2. Thay doi channel
echo 3. Thay doi so tin nhan toi da
echo 4. Thay doi loai file
echo 5. Thay doi dinh dang dau ra
echo 6. Reset ve mac dinh
echo 7. Chay scanner CLI
echo 8. Khoi dong web interface (mac dinh)
echo 9. Thoat
echo.
echo ================================================================

set /p choice="Nhap lua chon (1-9): "

if "%choice%"=="1" (
    echo.
    echo Cau hinh hien tai:
    echo ================================================================
    python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); print('Channel:', config.get('channels',{}).get('default_channel','Chua cau hinh')); print('Max messages:', config.get('scanning',{}).get('max_messages','Khong gioi han')); print('Batch size:', config.get('scanning',{}).get('batch_size',50)); file_types=config.get('scanning',{}).get('file_types',{}); enabled=[k for k,v in file_types.items() if v]; print('File types:', ', '.join(enabled) if enabled else 'Tat ca'); output_formats=config.get('output',{}).get('formats',{}); enabled_formats=[k for k,v in output_formats.items() if v.get('enabled',False)]; print('Output formats:', ', '.join(enabled_formats) if enabled_formats else 'Khong co')" 2>nul
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto CONFIG_MENU
)

if "%choice%"=="2" (
    echo.
    echo Nhap channel moi:
    echo Vi du: @duongtinhchat92 hoac https://t.me/+xxxxx
    echo.
    set /p new_channel="Channel: "

    if not "!new_channel!"=="" (
        echo Dang cap nhat channel...
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['channels']['default_channel']='!new_channel!'; config['channels']['use_default_channel']=True; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        if errorlevel 1 (
            echo [ERROR] Loi cap nhat channel
        ) else (
            echo [OK] Da cap nhat channel: !new_channel!
        )
    )
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto CONFIG_MENU
)

if "%choice%"=="3" (
    echo.
    echo Nhap so tin nhan toi da:
    echo Vi du: 1000 (hoac 0 cho khong gioi han^)
    echo.
    set /p max_msg="So tin nhan: "

    if not "!max_msg!"=="" (
        echo Dang cap nhat so tin nhan...
        if "!max_msg!"=="0" (
            python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['scanning']['max_messages']=None; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        ) else (
            python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['scanning']['max_messages']=int('!max_msg!'); json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        )
        if errorlevel 1 (
            echo [ERROR] Loi cap nhat so tin nhan
        ) else (
            echo [OK] Da cap nhat: !max_msg! tin nhan
        )
    )
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto CONFIG_MENU
)

if "%choice%"=="4" (
    echo.
    echo Chon loai file can quet:
    echo 1. Tat ca (documents, photos, videos, audio^)
    echo 2. Chi documents
    echo 3. Chi photos va videos
    echo 4. Chi audio
    echo.
    set /p file_choice="Lua chon (1-4): "

    if "!file_choice!"=="1" (
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['scanning']['file_types']={'documents':True,'photos':True,'videos':True,'audio':True}; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        echo [OK] Da chon tat ca loai file
    )
    if "!file_choice!"=="2" (
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['scanning']['file_types']={'documents':True,'photos':False,'videos':False,'audio':False}; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        echo [OK] Da chon chi documents
    )
    if "!file_choice!"=="3" (
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['scanning']['file_types']={'documents':False,'photos':True,'videos':True,'audio':False}; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        echo [OK] Da chon photos va videos
    )
    if "!file_choice!"=="4" (
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['scanning']['file_types']={'documents':False,'photos':False,'videos':False,'audio':True}; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        echo [OK] Da chon chi audio
    )
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto CONFIG_MENU
)

if "%choice%"=="5" (
    echo.
    echo Chon dinh dang dau ra:
    echo 1. Tat ca (CSV, JSON, Excel^)
    echo 2. Chi CSV
    echo 3. Chi JSON
    echo 4. Chi Excel
    echo.
    set /p format_choice="Lua chon (1-4): "

    if "!format_choice!"=="1" (
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['output']['formats']['csv']['enabled']=True; config['output']['formats']['json']['enabled']=True; config['output']['formats']['excel']['enabled']=True; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        echo [OK] Da chon tat ca dinh dang
    )
    if "!format_choice!"=="2" (
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['output']['formats']['csv']['enabled']=True; config['output']['formats']['json']['enabled']=False; config['output']['formats']['excel']['enabled']=False; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        echo [OK] Da chon chi CSV
    )
    if "!format_choice!"=="3" (
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['output']['formats']['csv']['enabled']=False; config['output']['formats']['json']['enabled']=True; config['output']['formats']['excel']['enabled']=False; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        echo [OK] Da chon chi JSON
    )
    if "!format_choice!"=="4" (
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['output']['formats']['csv']['enabled']=False; config['output']['formats']['json']['enabled']=False; config['output']['formats']['excel']['enabled']=True; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        echo [OK] Da chon chi Excel
    )
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto CONFIG_MENU
)

if "%choice%"=="6" (
    echo.
    echo CANH BAO: Reset ve cau hinh mac dinh?
    set /p confirm="Xac nhan (y/n): "

    if /i "!confirm!"=="y" (
        echo Dang reset...
        python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); config['channels']['default_channel']='@your_channel_here'; config['channels']['use_default_channel']=True; config['scanning']['max_messages']=1000; config['scanning']['batch_size']=50; config['scanning']['file_types']={'documents':True,'photos':True,'videos':True,'audio':True}; config['output']['formats']['csv']['enabled']=True; config['output']['formats']['json']['enabled']=True; config['output']['formats']['excel']['enabled']=True; json.dump(config,open('config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)" 2>nul
        echo [OK] Da reset ve cau hinh mac dinh
    ) else (
        echo Huy bo reset
    )
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto CONFIG_MENU
)

if "%choice%"=="7" (
    echo.
    echo Dang khoi dong scanner CLI...
    timeout /t 2 >nul
    goto SCANNER_MODE
)

if "%choice%"=="8" (
    echo.
    echo Dang khoi dong web interface...
    timeout /t 2 >nul
    goto WEB_MODE
)

if "%choice%"=="9" (
    echo.
    echo Cam on ban da su dung!
    timeout /t 2 >nul
    goto END
)

echo Lua chon khong hop le!
timeout /t 2 >nul
goto CONFIG_MENU

:WEB_SETUP
cls
echo.
echo ================================================================
echo                    WEB INTERFACE SETUP
echo ================================================================
echo.
echo [1/2] Kiem tra virtual environment...
if not exist "venv\" (
    echo [ERROR] Virtual environment khong ton tai!
    echo [INFO] Chay setup.bat truoc de tao virtual environment
    pause
    exit /b 1
) else (
    echo [OK] Virtual environment da san sang
)

echo.
echo [2/2] Cai dat Flask dependencies...
call venv\Scripts\activate.bat
python -c "import flask" 2>nul
if errorlevel 1 (
    echo    ^> Dang cai dat Flask va Flask-CORS...
    pip install flask flask-cors
    if errorlevel 1 (
        echo [ERROR] Khong the cai dat Flask dependencies!
        pause
        exit /b 1
    )
    echo [OK] Da cai dat Flask dependencies thanh cong
) else (
    echo [OK] Flask dependencies da san sang
)

echo.
echo ================================================================
echo [INFO] WEB INTERFACE SETUP HOAN TAT!
echo ================================================================
echo.
echo Ban co the chay web interface bang cach:
echo - run.bat web
echo - Hoac chon tuy chon 8 trong menu cau hinh
echo.
pause
goto END

:WEB_MODE
cls
echo.
echo ================================================================
echo                 TELEDRIVE WEB INTERFACE
echo ================================================================
echo.

echo [1/4] Kiem tra virtual environment...
if not exist "venv\" (
    echo [ERROR] Virtual environment khong ton tai!
    echo [INFO] Chay: run.bat web-setup de cai dat
    pause
    exit /b 1
) else (
    echo [OK] Virtual environment da san sang
)

echo.
echo [2/4] Kich hoat virtual environment...
call venv\Scripts\activate.bat
echo [OK] Da kich hoat virtual environment

echo.
echo [3/4] Kiem tra Flask dependencies...
python -c "import flask" 2>nul
if errorlevel 1 (
    echo [ERROR] Flask chua duoc cai dat!
    echo [INFO] Chay: run.bat web-setup de cai dat dependencies
    pause
    exit /b 1
) else (
    echo [OK] Flask dependencies da san sang
)

echo.
echo [4/4] Kiem tra du lieu scan...
if not exist "output\" (
    echo [WARNING] Thu muc output khong ton tai!
    echo [INFO] Chay scanner truoc de tao du lieu
    echo.
) else (
    REM Check if any JSON files exist
    dir /b output\*_telegram_files.json >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Khong tim thay du lieu scan trong thu muc output!
        echo [INFO] Chay scanner truoc de tao du lieu
        echo.
        echo Ban van co the khoi dong web interface, nhung se trong
        echo.
        set /p web_choice="Ban co muon tiep tuc? (y/n): "
        if /i not "!web_choice!"=="y" (
            echo Huy bo khoi dong web interface
            pause
            exit /b 0
        )
    ) else (
        echo [OK] Tim thay du lieu scan trong thu muc output
    )
)

echo.
echo ================================================================
echo [INFO] DANG KHOI DONG WEB INTERFACE...
echo ================================================================
echo.
echo [INFO] Web interface se chay tai: http://localhost:5000
echo [INFO] Nhan Ctrl+C de dung server
echo [INFO] Du lieu hien thi tu thu muc: output/
echo.
echo [INFO] Luu y: Giu cua so nay mo de server tiep tuc chay
echo.

python main.py

echo.
echo ================================================================
echo [INFO] WEB INTERFACE DA DUNG
echo ================================================================
echo.
pause
goto END

:SCANNER_MODE
cls
echo.
echo ================================================================
echo                 TELEGRAM FILE SCANNER (CLI MODE)
echo ================================================================
echo.
echo [INFO] CHAY SCANNER COMMAND LINE...
echo.
echo  Su dung channel tu config:
python -c "import json; config=json.load(open('config.json','r',encoding='utf-8')); print('   ', config.get('channels',{}).get('default_channel','Chua cau hinh'))" 2>nul
echo.
echo [INFO] Ket qua se duoc luu trong thu muc 'output/'
echo [INFO] Log chi tiet se duoc luu trong thu muc 'logs/'
echo.
echo [INFO] Luu y: Scanner se chay tu dong ma khong can nhap gi them
echo.

python src/core/main.py

echo.
echo ================================================================
echo [INFO] SCANNER HOAN THANH!
echo ================================================================
echo [INFO] Ket qua duoc luu trong thu muc 'output/'
echo [INFO] Log chi tiet trong thu muc 'logs/'
echo.
echo Nhan phim bat ky de thoat...
pause >nul
goto END

:PRODUCTION_MODE
echo.
echo ================================================================
echo                 TELEDRIVE PRODUCTION SERVER
echo ================================================================
echo.
echo [INFO] Chay production server voi Gunicorn
echo [INFO] Phu hop cho production deployment
echo.

echo [BUOC 1/5] Kiem tra cau hinh Telegram API...
python check_config.py >nul
if %errorlevel% neq 0 (
    echo [ERROR] CHUA CAU HINH API TELEGRAM!
    echo Vui long chay: run.bat config
    pause
    goto END
)
echo [OK] Cau hinh Telegram API hop le

echo.
echo [BUOC 2/5] Kiem tra Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python khong duoc cai dat hoac khong co trong PATH
    pause
    goto END
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python !PYTHON_VERSION! da san sang

echo.
echo [BUOC 3/5] Kiem tra dependencies...
python -c "import flask, telethon, pandas, openpyxl" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Thieu dependencies. Dang cai dat...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Khong the cai dat dependencies
        pause
        goto END
    )
)
echo [OK] Tat ca dependencies da san sang

echo.
echo [BUOC 4/5] Khoi tao he thong logging...
if not exist logs mkdir logs
echo [OK] He thong logging da san sang

echo.
echo [BUOC 5/5] Khoi dong Production Server...
echo ================================================================
echo [INFO] DANG KHOI DONG PRODUCTION SERVER...
echo ================================================================
echo.
echo [INFO] Production server se chay tai: http://localhost:5000
echo [INFO] Nhan Ctrl+C de dung server
echo [INFO] Access logs: logs/access.log
echo [INFO] Error logs: logs/error.log
echo.

python run_production.py

echo.
echo ================================================================
echo [INFO] PRODUCTION SERVER DA DUNG
echo ================================================================
echo.
echo [INFO] Neu muon chay lai: run.bat production
echo [INFO] Logs trong thu muc: logs/
echo.
echo Nhan phim bat ky de thoat...
pause >nul
goto END

:END
