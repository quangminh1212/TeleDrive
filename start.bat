@echo off
setlocal enabledelayedexpansion
title TeleDrive - Quick Start
color 0D

echo.
echo ================================================================
echo                    TELEDRIVE - QUICK START
echo ================================================================
echo.
echo [INFO] Tuy chon:
echo    start.bat         - Chay web interface (mac dinh)
echo    start.bat silent  - Chay khong co log (sach se nhat)
echo    start.bat clean   - Chay voi log toi gian
echo    start.bat debug   - Chay voi debug mode (log thong minh)
echo.

REM Kiem tra tham so dau vao
if "%1"=="silent" goto SILENT_MODE
if "%1"=="clean" goto CLEAN_MODE
if "%1"=="debug" goto DEBUG_MODE

:MAIN_START
echo [BUOC 1/3] Kiem tra Python...
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
echo [BUOC 2/3] Kiem tra thu vien...
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Cai dat thu vien can thiet...
    pip install flask flask-cors flask-login flask-sqlalchemy sqlalchemy telethon pandas tqdm aiofiles openpyxl pillow python-magic redis psutil waitress cryptography pydantic click
    if errorlevel 1 (
        echo [ERROR] Khong the cai dat thu vien!
        echo [INFO] Thu chay: pip install -r requirements.txt
        pause
        exit /b 1
    )
) else (
    echo [OK] Thu vien da san sang
)

echo.
echo [BUOC 3/3] Khoi dong TeleDrive...
echo.
echo ^> Dang khoi dong TeleDrive...
echo ^> Truy cap: http://localhost:5000
echo ^> Nhan Ctrl+C de dung server
echo.

python main.py
goto END

:SILENT_MODE
echo [BUOC 1/3] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] KHONG TIM THAY PYTHON!
    pause
    exit /b 1
) else (
    echo [OK] Python da san sang
)

echo.
echo [BUOC 2/3] Kiem tra thu vien...
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Cai dat thu vien...
    pip install flask flask-cors flask-login flask-sqlalchemy sqlalchemy telethon pandas tqdm aiofiles openpyxl pillow python-magic redis psutil waitress cryptography pydantic click >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Khong the cai dat thu vien!
        pause
        exit /b 1
    )
) else (
    echo [OK] Thu vien da san sang
)

echo.
echo [BUOC 3/3] Khoi dong TeleDrive Silent Mode...
echo.
python run_silent.py
goto END

:CLEAN_MODE
echo [BUOC 1/3] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] KHONG TIM THAY PYTHON!
    pause
    exit /b 1
) else (
    echo [OK] Python da san sang
)

echo.
echo [BUOC 2/3] Kiem tra thu vien...
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Cai dat thu vien...
    pip install flask flask-cors flask-login flask-sqlalchemy sqlalchemy telethon pandas tqdm aiofiles openpyxl pillow python-magic redis psutil waitress cryptography pydantic click >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Khong the cai dat thu vien!
        pause
        exit /b 1
    )
) else (
    echo [OK] Thu vien da san sang
)

echo.
echo [BUOC 3/3] Khoi dong TeleDrive Clean Mode...
echo.
python clean.py
goto END

:DEBUG_MODE
echo.
echo ================================================================
echo                    TELEDRIVE - DEBUG MODE
echo ================================================================
echo.

echo [BUOC 1/3] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] KHONG TIM THAY PYTHON!
    pause
    exit /b 1
) else (
    echo [OK] Python da san sang
)

echo.
echo [BUOC 2/3] Kiem tra thu vien...
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Cai dat thu vien...
    pip install flask flask-cors flask-login flask-sqlalchemy sqlalchemy telethon pandas tqdm aiofiles openpyxl pillow python-magic redis psutil waitress cryptography pydantic click >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Khong the cai dat thu vien!
        pause
        exit /b 1
    )
) else (
    echo [OK] Thu vien da san sang
)

echo.
echo [BUOC 3/3] Khoi dong TeleDrive Debug Mode...
echo.
python run_debug.py
goto END

:END
echo.
echo ================================================================
echo [INFO] TELEDRIVE DA DUNG
echo ================================================================
echo.
echo Cam on ban da su dung TeleDrive!
echo.
pause
