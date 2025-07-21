@echo off
setlocal enabledelayedexpansion
title TeleDrive - Simple Launcher
color 0D

REM Kiem tra tham so dau vao
if "%1"=="silent" goto SILENT_MODE
if "%1"=="clean" goto CLEAN_MODE

echo.
echo ================================================================
echo                    TELEDRIVE - SIMPLE LAUNCHER
echo ================================================================
echo.
echo [INFO] Tuy chon:
echo    run_simple.bat         - Chay web interface (mac dinh)
echo    run_simple.bat silent  - Chay khong co log (sach se nhat)
echo    run_simple.bat clean   - Chay voi log toi gian
echo.

:MAIN_START
echo [BUOC 1/3] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] KHONG TIM THAY PYTHON!
    echo [INFO] Tai Python tu: https://python.org/downloads/
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
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Khong the cai dat thu vien!
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
echo.
echo ================================================================
echo                    TELEDRIVE - SILENT MODE
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
    pip install -r requirements.txt >nul 2>&1
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
echo.
echo ================================================================
echo                    TELEDRIVE - CLEAN MODE
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
    pip install -r requirements.txt >nul 2>&1
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

:END
echo.
echo ================================================================
echo [INFO] TELEDRIVE DA DUNG
echo ================================================================
echo.
echo Cam on ban da su dung TeleDrive!
echo.
pause
