@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   FIX AUTO-LOGIN - Install Python 3.11
echo ========================================
echo.

:: Check current Python version
python --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2" %%v in ('python --version 2^>^&1') do (
        set "ver=%%v"
        echo Current Python: !ver!
        
        echo !ver! | findstr /r "3\.11\." >nul
        if not errorlevel 1 (
            echo.
            echo [OK] Ban da dung Python 3.11!
            echo Auto-login se hoat dong.
            echo.
            echo Neu van gap loi, vui long:
            echo 1. Dong Telegram Desktop
            echo 2. Mo Telegram Desktop va dang nhap
            echo 3. Chay lai: run.bat
            echo.
            pause
            exit /b 0
        )
        
        echo !ver! | findstr /r "3\.1[2-9]\." >nul
        if not errorlevel 1 (
            echo.
            echo [PROBLEM] Python !ver! KHONG tuong thich voi opentele!
            echo.
            echo OPENTELE chi hoat dong voi Python 3.11
            echo Python 3.12+ khong duoc ho tro
            echo.
            echo Dang tu dong cai dat Python 3.11...
            echo.
            goto :install_python
        )
    )
)

:install_python
echo ========================================
echo   Installing Python 3.11...
echo ========================================
echo.

:: Call auto install script
call auto_install_python311.bat

if errorlevel 1 (
    echo.
    echo ========================================
    echo   AUTO INSTALL FAILED
    echo ========================================
    echo.
    echo Khong the cai dat Python 3.11 tu dong!
    echo.
    echo Vui long cai dat thu cong:
    echo.
    echo BUOC 1: Download Python 3.11
    echo   https://www.python.org/downloads/release/python-31110/
    echo   Chon: Windows installer (64-bit)
    echo.
    echo BUOC 2: Cai dat
    echo   - Tick "Add Python 3.11 to PATH"
    echo   - Click "Install Now"
    echo.
    echo BUOC 3: Sau khi cai xong
    echo   - Dong cua so CMD nay
    echo   - Mo CMD moi
    echo   - Chay: run.bat
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   PYTHON 3.11 INSTALLED SUCCESSFULLY!
echo ========================================
echo.
echo Vui long lam theo cac buoc sau:
echo.
echo BUOC 1: DONG cua so CMD nay
echo.
echo BUOC 2: MO CMD moi (de reload PATH)
echo.
echo BUOC 3: Chay lai:
echo   run.bat
echo.
echo BUOC 4: Auto-login se hoat dong!
echo.
echo ========================================
echo.
pause
exit /b 0
