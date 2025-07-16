@echo off
title Telegram Scanner - Run Config Manager
color 0E

:MENU
cls
echo.
echo ================================================================
echo              TELEGRAM SCANNER - RUN CONFIG MANAGER
echo ================================================================
echo.
echo QUAN LY CAU HINH THAM SO DAU VAO CHO RUN.BAT
echo.
echo 1. Xem cau hinh hien tai
echo 2. Ap dung cau hinh vao config.json
echo 3. Chinh sua cau hinh nhanh
echo 4. Reset ve cau hinh mac dinh
echo 5. Thoat
echo.
echo ================================================================

set /p choice="Nhap lua chon (1-5): "

if "%choice%"=="1" (
    echo.
    echo Dang hien thi cau hinh hien tai...
    echo.
    
    REM Kiem tra Python
    python --version >nul 2>&1
    if errorlevel 1 (
        echo KHONG TIM THAY PYTHON!
        echo Tai Python tu: https://python.org/downloads/
        pause
        goto MENU
    )
    
    python run_config_manager.py show
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto MENU
)

if "%choice%"=="2" (
    echo.
    echo Dang ap dung cau hinh vao config.json...
    echo.
    
    python --version >nul 2>&1
    if errorlevel 1 (
        echo KHONG TIM THAY PYTHON!
        pause
        goto MENU
    )
    
    python run_config_manager.py apply
    if errorlevel 1 (
        echo.
        echo Co loi xay ra khi ap dung cau hinh!
    ) else (
        echo.
        echo Da ap dung cau hinh thanh cong!
        echo Ban co the chay run.bat de su dung cau hinh moi.
    )
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto MENU
)

if "%choice%"=="3" (
    echo.
    echo ================================================================
    echo                 CHINH SUA CAU HINH NHANH
    echo ================================================================
    echo.
    
    echo Chon thiet lap muon thay doi:
    echo.
    echo 1. Channel mac dinh
    echo 2. So tin nhan toi da
    echo 3. Loai file can quet
    echo 4. Dinh dang dau ra
    echo 5. Quay lai menu chinh
    echo.
    
    set /p edit_choice="Nhap lua chon (1-5): "
    
    if "!edit_choice!"=="1" (
        echo.
        echo Nhap channel mac dinh moi:
        echo Vi du: @duongtinhchat92 hoac https://t.me/+xxxxx
        echo.
        set /p new_channel="Channel: "
        
        if not "!new_channel!"=="" (
            echo Dang cap nhat channel mac dinh...
            python -c "import json; config=json.load(open('run_config.json','r',encoding='utf-8')); config['channel']='!new_channel!'; json.dump(config,open('run_config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)"
            echo Da cap nhat channel: !new_channel!
        )
    )
    
    if "!edit_choice!"=="2" (
        echo.
        echo Nhap so tin nhan toi da can quet:
        echo Vi du: 1000 (hoac 0 cho khong gioi han^)
        echo.
        set /p max_msg="So tin nhan: "
        
        if not "!max_msg!"=="" (
            echo Dang cap nhat so tin nhan toi da...
            python -c "import json; config=json.load(open('run_config.json','r',encoding='utf-8')); config['max_messages']=int('!max_msg!') if '!max_msg!'!='0' else None; json.dump(config,open('run_config.json','w',encoding='utf-8'),indent=2,ensure_ascii=False)"
            echo Da cap nhat: !max_msg! tin nhan
        )
    )
    
    if "!edit_choice!"=="5" (
        goto MENU
    )
    
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto MENU
)

if "%choice%"=="4" (
    echo.
    echo ================================================================
    echo                 RESET CAU HINH MAC DINH
    echo ================================================================
    echo.
    echo CANH BAO: Thao tac nay se xoa tat ca cau hinh hien tai!
    echo.
    set /p confirm="Ban co chac chan muon reset? (y/n): "
    
    if /i "!confirm!"=="y" (
        echo.
        echo Dang reset cau hinh ve mac dinh...
        
        if exist run_config.json (
            copy run_config.json run_config.json.backup >nul
            echo Da backup file cu thanh run_config.json.backup
        )
        
        REM Tao lai file config mac dinh
        python -c "import json; default_config={'channel': '@duongtinhchat92', 'max_messages': 1000, 'batch_size': 50, 'file_types': {'documents': True, 'photos': True, 'videos': True, 'audio': True}, 'output_formats': {'csv': True, 'json': True, 'excel': True}, 'show_progress': True, 'language': 'vi'}; json.dump(default_config, open('run_config.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False); print('Da reset cau hinh ve mac dinh!')"
        
        echo.
        echo Da reset thanh cong!
    ) else (
        echo Huy bo reset.
    )
    
    echo.
    echo Nhan phim bat ky de quay lai menu...
    pause >nul
    goto MENU
)

if "%choice%"=="5" (
    echo.
    echo Cam on ban da su dung Run Config Manager!
    timeout /t 2 >nul
    exit
)

echo Lua chon khong hop le!
timeout /t 2 >nul
goto MENU
