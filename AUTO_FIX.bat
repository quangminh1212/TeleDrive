@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   AUTO FIX - Detecting Issues...
echo ========================================
echo.

:: Check if Python 3.11 is available
py -3.11 --version >nul 2>&1
if not errorlevel 1 (
    echo [OK] Python 3.11 found via py launcher
    echo.
    echo Auto-login should work!
    echo.
    echo If still having issues:
    echo 1. Make sure Telegram Desktop is open and logged in
    echo 2. Close and reopen CMD
    echo 3. Run: run.bat
    echo.
    pause
    exit /b 0
)

python3.11 --version >nul 2>&1
if not errorlevel 1 (
    echo [OK] Python 3.11 found
    echo.
    echo Auto-login should work!
    echo.
    echo If still having issues:
    echo 1. Make sure Telegram Desktop is open and logged in
    echo 2. Close and reopen CMD
    echo 3. Run: run.bat
    echo.
    pause
    exit /b 0
)

:: Check default Python version
python --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2" %%v in ('python --version 2^>^&1') do (
        set "ver=%%v"
        
        echo !ver! | findstr /r "3\.11\." >nul
        if not errorlevel 1 (
            echo [OK] Python 3.11 is default
            echo.
            echo Auto-login should work!
            echo.
            echo If still having issues:
            echo 1. Make sure Telegram Desktop is open and logged in
            echo 2. Run: run.bat
            echo.
            pause
            exit /b 0
        )
        
        echo !ver! | findstr /r "3\.1[2-9]\." >nul
        if not errorlevel 1 (
            echo.
            echo ========================================
            echo   ISSUE DETECTED
            echo ========================================
            echo.
            echo Current Python: !ver!
            echo Required: Python 3.11
            echo.
            echo Problem: OPENTELE only works with Python 3.11
            echo.
            echo SOLUTION: Install Python 3.11
            echo.
            echo Starting automatic installation...
            echo.
            timeout /t 3 /nobreak >nul
            
            call FIX_AUTO_LOGIN.bat
            exit /b 0
        )
    )
)

:: Python not found
echo.
echo ========================================
echo   PYTHON NOT FOUND
echo ========================================
echo.
echo Python is not installed or not in PATH
echo.
echo Installing Python 3.11...
echo.

call auto_install_python311.bat

if errorlevel 1 (
    echo.
    echo Installation failed!
    echo.
    echo Please install manually:
    echo https://www.python.org/downloads/release/python-31110/
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   INSTALLATION COMPLETE
echo ========================================
echo.
echo Please:
echo 1. Close this CMD window
echo 2. Open a new CMD window
echo 3. Run: run.bat
echo.
pause
exit /b 0
