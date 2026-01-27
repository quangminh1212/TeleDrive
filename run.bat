@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo     TeleDrive Desktop - Quick Start
echo ========================================
echo.

:: ============================================
:: BUOC 1: KIEM TRA VA TIM PYTHON TUONG THICH
:: ============================================

set "PYTHON_CMD="
set "PYTHON_VERSION="

:: Thu tim Python 3.11 (tot nhat)
py -3.11 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=py -3.11"
    set "PYTHON_VERSION=3.11"
    echo [OK] Tim thay Python 3.11 qua py launcher
    goto :python_found
)

python3.11 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=python3.11"
    set "PYTHON_VERSION=3.11"
    echo [OK] Tim thay Python 3.11
    goto :python_found
)

:: Thu tim Python 3.12 (tot)
py -3.12 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=py -3.12"
    set "PYTHON_VERSION=3.12"
    echo [OK] Tim thay Python 3.12 qua py launcher
    goto :python_found
)

python3.12 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=python3.12"
    set "PYTHON_VERSION=3.12"
    echo [OK] Tim thay Python 3.12
    goto :python_found
)

:: Kiem tra Python mac dinh
python --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2" %%v in ('python --version 2^>^&1') do (
        set "ver=%%v"
        echo !ver! | findstr /r "3\.1[12]\." >nul
        if not errorlevel 1 (
            set "PYTHON_CMD=python"
            set "PYTHON_VERSION=default"
            echo [OK] Tim thay Python tuong thich (default)
            goto :python_found
        )
        
        echo !ver! | findstr /r "3\.1[34]\." >nul
        if not errorlevel 1 (
            echo [WARNING] Python !ver! co the gap van de tuong thich
            echo.
            echo Khuyến nghị cài Python 3.11 hoặc 3.12
            echo Ban co muon cai dat Python 3.11 khong? (Y/N)
            choice /c YN /n /m "Chon Y de cai dat, N de tiep tuc voi Python hien tai: "
            if errorlevel 2 (
                set "PYTHON_CMD=python"
                set "PYTHON_VERSION=!ver!"
                echo [OK] Su dung Python !ver! (co the co loi)
                goto :python_found
            )
            echo.
            echo Dang cai dat Python 3.11...
            call install_python311.bat
            echo.
            echo Vui long chay lai run.bat sau khi cai dat xong
            pause
            exit /b 1
        )
    )
)

:: Khong tim thay Python tuong thich
echo.
echo [ERROR] Khong tim thay Python tuong thich!
echo.
echo TeleDrive can Python 3.11 hoac 3.12
echo.
echo Ban co muon cai dat Python 3.11 khong? (Y/N)
choice /c YN /n /m "Chon Y de cai dat, N de thoat: "
if errorlevel 2 (
    echo.
    echo Da huy. Vui long cai dat Python 3.11 thu cong.
    pause
    exit /b 1
)

echo.
echo Dang cai dat Python 3.11...
call install_python311.bat
echo.
echo Vui long chay lai run.bat sau khi cai dat xong
pause
exit /b 1

:python_found
%PYTHON_CMD% --version
echo.

:: ============================================
:: BUOC 2: KIEM TRA VA TAO VIRTUAL ENVIRONMENT
:: ============================================

if not exist ".venv" (
    echo Virtual environment chua ton tai
    echo Dang tao virtual environment moi...
    echo.
    
    %PYTHON_CMD% -m venv .venv
    
    if errorlevel 1 (
        echo [ERROR] Khong the tao virtual environment
        echo Dang thu voi virtualenv...
        %PYTHON_CMD% -m pip install virtualenv --user
        %PYTHON_CMD% -m virtualenv .venv
        
        if errorlevel 1 (
            echo [ERROR] Van gap loi khi tao virtual environment
            echo Vui long chay: setup_python311.bat
            pause
            exit /b 1
        )
    )
    
    echo [OK] Virtual environment da duoc tao
    echo.
)

:: Kich hoat virtual environment
echo Kich hoat virtual environment...
if exist ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
    if errorlevel 1 (
        echo [WARNING] Khong the kich hoat, thu manual PATH setup...
        set "PATH=%CD%\.venv\Scripts;%PATH%"
        set "VIRTUAL_ENV=%CD%\.venv"
    ) else (
        echo [OK] Virtual environment da kich hoat
    )
) else (
    echo [WARNING] Activation script khong ton tai, setup manual PATH...
    set "PATH=%CD%\.venv\Scripts;%PATH%"
    set "VIRTUAL_ENV=%CD%\.venv"
)
echo.

:: ============================================
:: BUOC 3: KIEM TRA VA CAI DAT DEPENDENCIES
:: ============================================

echo Kiem tra dependencies...

:: Kiem tra xem da cai dat dependencies chua
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Dependencies chua duoc cai dat
    echo Dang cai dat dependencies...
    echo.
    
    :: Nang cap pip
    python -m pip install --upgrade pip --quiet
    
    :: Cai dat dependencies
    pip install -r requirements.txt --quiet
    
    if errorlevel 1 (
        echo [WARNING] Mot so package co the bi loi
        echo Dang thu cai dat lai...
        pip install -r requirements.txt
    )
    
    echo [OK] Dependencies da duoc cai dat
    echo.
) else (
    echo [OK] Dependencies da san sang
    
    :: Kiem tra va update neu can
    pip install -r requirements.txt --quiet --upgrade >nul 2>&1
    echo.
)

:: ============================================
:: BUOC 4: CAI DAT WEBVIEW (NEU CAN)
:: ============================================

echo Kiem tra webview libraries...

python -c "import webview" >nul 2>&1
if errorlevel 1 (
    python -c "import tkinterweb" >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Chua co embedded webview
        echo Dang cai dat tkinterweb...
        pip install tkinterweb --quiet >nul 2>&1
        if errorlevel 1 (
            echo [WARNING] Khong cai duoc webview, se dung browser
        ) else (
            echo [OK] tkinterweb da duoc cai dat
        )
    ) else (
        echo [OK] tkinterweb da san sang
    )
) else (
    echo [OK] pywebview da san sang
)
echo.

:: ============================================
:: BUOC 5: CLEANUP PORTS
:: ============================================

echo Cleaning up ports...
for %%p in (3000 5000 8000) do (
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p "') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)
echo [OK] Port cleanup completed
echo.

:: ============================================
:: BUOC 6: TAO CAC THU MUC CAN THIET
:: ============================================

echo Tao cac thu muc can thiet...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\temp" mkdir data\temp
if not exist "data\backups" mkdir data\backups
if not exist "output" mkdir output
echo [OK] Cac thu muc da san sang
echo.

:: ============================================
:: BUOC 7: KIEM TRA DATABASE
:: ============================================

echo Kiem tra database...
if not exist "data\teledrive.db" (
    echo Database se duoc tao khi chay lan dau
) else (
    echo [OK] Database da ton tai
)
echo.

:: ============================================
:: BUOC 8: THIET LAP BIEN MOI TRUONG
:: ============================================

echo Thiet lap bien moi truong...
set "FLASK_APP=app.app"
set "FLASK_ENV=development"
set "PYTHONPATH=%CD%\app;%PYTHONPATH%"
set "PYTHONIOENCODING=utf-8"
echo [OK] Bien moi truong da duoc thiet lap
echo.

:: ============================================
:: BUOC 9: CHAY UNG DUNG
:: ============================================

echo.
echo ========================================
echo      Starting TeleDrive Desktop...
echo ========================================
echo.
echo Desktop Mode: Embedded webview or browser
echo Auto-login: %PYTHON_VERSION% compatible
echo.
echo Press Ctrl+C to stop the application
echo Logs: teledrive.log
echo.
echo ========================================
echo.

:: Chay ung dung voi embedded webview
python main_embedded.py

:: Neu ung dung dung
echo.
echo ========================================
echo      TeleDrive stopped
echo ========================================
echo.
echo To restart, run: run.bat
echo Check teledrive.log for details
echo.
pause
exit /b 0
