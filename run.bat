@echo off
setlocal enabledelayedexpansion
title TeleDrive Desktop

:: Chuyen den thu muc chua script
pushd "%~dp0"
set "PROJECT_DIR=%~dp0"
:: Remove trailing backslash
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo.
echo ========================================
echo     TeleDrive Desktop - Smart Start
echo ========================================
echo.

:: ============================================
:: BUOC 0: DUNG CAC PROCESS CU (TICH HOP TU STOP.BAT)
:: ============================================

echo [CLEANUP] Dang dung cac process TeleDrive cu...

:: Kill Python processes on ports 5000, 8000
for %%p in (5000 8000) do (
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p "') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)

:: Kill Node.js on port 1420, 3000
for %%p in (1420 3000) do (
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p "') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)

:: Kill any cmd.exe running npm or vite
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq cmd.exe" /v 2^>nul ^| findstr /i "npm vite"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [OK] Cleanup completed
echo.

:: ============================================
:: BUOC 1: TIM VA KIEM TRA PYTHON
:: ============================================

set "PYTHON_CMD="
set "PYTHON_VERSION="
set "PORTABLE_PYTHON=%PROJECT_DIR%\python311\python.exe"

:: UU TIEN 1: Kiem tra Python portable trong folder du an
if exist "%PORTABLE_PYTHON%" (
    set "PYTHON_CMD="%PORTABLE_PYTHON%""
    set "PYTHON_VERSION=3.11-portable"
    echo [OK] Tim thay Python 3.11 portable trong du an
    goto :verify_python
)

:: UU TIEN 2: Thu tim Python 3.11 system-wide
py -3.11 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=py -3.11"
    set "PYTHON_VERSION=3.11"
    echo [OK] Tim thay Python 3.11 qua py launcher
    goto :verify_python
)

python3.11 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=python3.11"
    set "PYTHON_VERSION=3.11"
    echo [OK] Tim thay Python 3.11
    goto :verify_python
)

:: Kiem tra trong cac thu muc mac dinh
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python311\python.exe""
    set "PYTHON_VERSION=3.11"
    echo [OK] Tim thay Python 3.11 trong LocalAppData
    goto :verify_python
)

if exist "C:\Python311\python.exe" (
    set "PYTHON_CMD="C:\Python311\python.exe""
    set "PYTHON_VERSION=3.11"
    echo [OK] Tim thay Python 3.11 trong C:\Python311
    goto :verify_python
)

:: Khong tim thay Python 3.11
echo.
echo ========================================
echo   PYTHON 3.11 REQUIRED
echo ========================================
echo.
echo [ERROR] Khong tim thay Python 3.11!
echo.
echo TeleDrive CAN Python 3.11 (KHONG PHAI 3.12+)
echo.
echo Dang tu dong cai dat Python 3.11 portable...
echo.

call setup.bat

if errorlevel 1 (
    echo.
    echo [ERROR] Khong the cai dat Python 3.11
    echo.
    echo Vui long cai dat thu cong:
    echo   1. Chay: setup.bat
    echo   2. Hoac download: https://www.python.org/downloads/release/python-31110/
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Python 3.11 portable da duoc cai dat!
echo Chay lai: run.bat
echo.
pause
exit /b 0

:verify_python
%PYTHON_CMD% --version
echo.

:: ============================================
:: BUOC 2: KIEM TRA VA CAI DAT SETUPTOOLS
:: ============================================

echo Kiem tra setuptools...
%PYTHON_CMD% -c "import setuptools" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] setuptools chua duoc cai dat
    echo Dang cai dat setuptools va wheel...
    
    if "%PYTHON_VERSION%"=="3.11-portable" (
        :: For portable Python, install to Lib\site-packages
        %PYTHON_CMD% -m pip install --target "%PROJECT_DIR%\python311\Lib\site-packages" setuptools wheel --quiet
    ) else (
        :: For system Python, install normally
        %PYTHON_CMD% -m pip install setuptools wheel --quiet
    )
    
    if errorlevel 1 (
        echo [ERROR] Khong the cai dat setuptools
        echo Vui long chay: setup.bat
        pause
        exit /b 1
    )
    
    echo [OK] setuptools da duoc cai dat
) else (
    echo [OK] setuptools da san sang
)
echo.

:: ============================================
:: BUOC 3: SU DUNG PYTHON TRUC TIEP (KHONG DUNG VENV)
:: ============================================

:: For portable Python, we don't need venv - use it directly
if "%PYTHON_VERSION%"=="3.11-portable" (
    echo [INFO] Su dung Python portable truc tiep (khong can venv)
    echo.
    goto :skip_venv
)

:: For system Python, use venv
if not exist ".venv" (
    echo Virtual environment chua ton tai
    echo Dang tao virtual environment moi...
    echo.
    
    %PYTHON_CMD% -m venv .venv
    
    if errorlevel 1 (
        echo [ERROR] Khong the tao virtual environment
        echo Dang thu voi virtualenv...
        %PYTHON_CMD% -m pip install virtualenv --user --quiet
        %PYTHON_CMD% -m virtualenv .venv
        
        if errorlevel 1 (
            echo [ERROR] Van gap loi khi tao virtual environment
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
        set "PATH=%PROJECT_DIR%\.venv\Scripts;%PATH%"
        set "VIRTUAL_ENV=%PROJECT_DIR%\.venv"
    ) else (
        echo [OK] Virtual environment da kich hoat
    )
) else (
    echo [WARNING] Activation script khong ton tai, setup manual PATH...
    set "PATH=%PROJECT_DIR%\.venv\Scripts;%PATH%"
    set "VIRTUAL_ENV=%PROJECT_DIR%\.venv"
)
echo.

:skip_venv

:: ============================================
:: BUOC 4: KIEM TRA VA CAI DAT DEPENDENCIES
:: ============================================

echo Kiem tra dependencies...

:: Use the correct Python command
set "PIP_CMD=%PYTHON_CMD% -m pip"

:: Kiem tra xem da cai dat dependencies chua
%PYTHON_CMD% -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Dependencies chua duoc cai dat
    echo Dang cai dat dependencies...
    echo (Co the mat vai phut...)
    echo.
    
    :: Nang cap pip
    %PIP_CMD% install --upgrade pip --quiet
    
    :: Cai dat dependencies
    %PIP_CMD% install -r requirements.txt --quiet
    
    if errorlevel 1 (
        echo [WARNING] Mot so package co the bi loi
        echo Dang thu cai dat lai...
        %PIP_CMD% install -r requirements.txt
        
        if errorlevel 1 (
            echo.
            echo [ERROR] Khong the cai dat dependencies
            echo Vui long kiem tra:
            echo   1. Ket noi internet
            echo   2. File requirements.txt
            echo   3. Quyen ghi file
            echo.
            pause
            exit /b 1
        )
    )
    
    echo [OK] Dependencies da duoc cai dat
    echo.
) else (
    echo [OK] Dependencies da san sang
    
    :: Kiem tra va update neu can (silent)
    %PIP_CMD% install -r requirements.txt --quiet --upgrade >nul 2>&1
    echo.
)

:: ============================================
:: BUOC 5: KIEM TRA OPTIONAL PACKAGES
:: ============================================

echo Kiem tra optional packages...

:: Check webview
%PYTHON_CMD% -c "import webview" >nul 2>&1
if errorlevel 1 (
    %PYTHON_CMD% -c "import tkinterweb" >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Chua co embedded webview
        echo Dang cai dat tkinterweb...
        %PIP_CMD% install tkinterweb --quiet >nul 2>&1
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

:: Check cryptg (performance)
%PYTHON_CMD% -c "import cryptg" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Chua co cryptg (performance optimization)
    echo Dang cai dat cryptg...
    %PIP_CMD% install cryptg --quiet >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Khong cai duoc cryptg, se dung Python encryption (cham hon)
    ) else (
        echo [OK] cryptg da duoc cai dat (encryption 10x nhanh hon!)
    )
) else (
    echo [OK] cryptg da san sang
)
echo.

:: ============================================
:: BUOC 6: CLEANUP PORTS
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
:: BUOC 7: TAO CAC THU MUC CAN THIET
:: ============================================

echo Tao cac thu muc can thiet...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\temp" mkdir data\temp
if not exist "data\backups" mkdir data\backups
if not exist "output" mkdir output

:: Xoa log cu
echo Cleaning old logs...
if exist "logs\teledrive.log" del /q "logs\teledrive.log"
echo [OK] Cac thu muc da san sang
echo.

:: ============================================
:: BUOC 8: KIEM TRA DATABASE
:: ============================================

echo Kiem tra database...
if not exist "data\teledrive.db" (
    echo Database se duoc tao khi chay lan dau
) else (
    echo [OK] Database da ton tai
)
echo.

:: ============================================
:: BUOC 9: THIET LAP BIEN MOI TRUONG
:: ============================================

echo Thiet lap bien moi truong...
set "FLASK_APP=app.app"
set "FLASK_ENV=development"
set "DEV_MODE=1"
set "PYTHONPATH=%PROJECT_DIR%\app;%PYTHONPATH%"
set "PYTHONIOENCODING=utf-8"
echo [OK] Bien moi truong da duoc thiet lap (DEV_MODE=1 - Auto-reload enabled)
echo.

:: ============================================
:: BUOC 10: KIEM TRA VA KHOI CHAY FRONTEND
:: ============================================

echo Kiem tra Node.js cho frontend...
where node >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Node.js chua duoc cai dat
    echo Frontend se khong hoat dong. Vui long cai Node.js tu: https://nodejs.org/
    echo Tiep tuc chi voi Backend API...
    goto :skip_frontend
)

node --version
echo [OK] Node.js da san sang
echo.

:: Kiem tra va cai dat frontend dependencies
if exist "%PROJECT_DIR%\frontend\package.json" (
    echo Kiem tra frontend dependencies...
    if not exist "%PROJECT_DIR%\frontend\node_modules" (
        echo Dang cai dat frontend dependencies...
        echo (Co the mat vai phut...)
        pushd "%PROJECT_DIR%\frontend"
        call npm install --silent
        if errorlevel 1 (
            echo [WARNING] Khong the cai dat frontend dependencies
            popd
            goto :skip_frontend
        )
        popd
        echo [OK] Frontend dependencies da duoc cai dat
    ) else (
        echo [OK] Frontend dependencies da san sang
    )
    echo.
    
    echo Khoi chay Frontend Vite dev server...
    :: Chay frontend an trong nen (hoan toan an)
    powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c cd /d %PROJECT_DIR%\\frontend && npm run dev' -WindowStyle Hidden"
    
    :: Cho frontend khoi dong
    echo Dang cho frontend khoi dong...
    timeout /t 5 /nobreak >nul
    echo [OK] Frontend da khoi dong tai http://localhost:1420
    echo.
) else (
    echo [WARNING] Khong tim thay frontend\package.json
    goto :skip_frontend
)

:skip_frontend

:: ============================================
:: BUOC 11: CHAY UNG DUNG BACKEND
:: ============================================

echo.
echo ========================================
echo      Starting TeleDrive Desktop...
echo ========================================
echo.
echo Backend API: http://127.0.0.1:5000
echo Frontend:    http://localhost:1420
echo Python: %PYTHON_VERSION%
echo.
echo Press Ctrl+C to stop the application
echo Logs: teledrive.log
echo.
echo ========================================
echo.

:: Chay Backend API
%PYTHON_CMD% main.py

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
