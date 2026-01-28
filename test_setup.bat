@echo off
echo.
echo ========================================
echo   Testing TeleDrive Setup
echo ========================================
echo.

set "PYTHON_CMD=python311\python.exe"

if not exist "%PYTHON_CMD%" (
    echo [ERROR] Python portable not found!
    echo Please run: setup_portable_python.bat
    pause
    exit /b 1
)

echo [1/5] Testing Python...
%PYTHON_CMD% --version
if errorlevel 1 (
    echo [FAIL] Python not working
    pause
    exit /b 1
)
echo [OK] Python working
echo.

echo [2/5] Testing setuptools...
%PYTHON_CMD% -c "import setuptools; print('setuptools:', setuptools.__version__)"
if errorlevel 1 (
    echo [FAIL] setuptools not working
    pause
    exit /b 1
)
echo [OK] setuptools working
echo.

echo [3/5] Testing core packages...
%PYTHON_CMD% -c "import telethon, flask, sqlalchemy; print('Core packages OK')"
if errorlevel 1 (
    echo [FAIL] Core packages not installed
    pause
    exit /b 1
)
echo [OK] Core packages installed
echo.

echo [4/5] Testing webview packages...
%PYTHON_CMD% -c "import webview; print('pywebview OK')" 2>nul
if errorlevel 1 (
    %PYTHON_CMD% -c "import tkinterweb; print('tkinterweb OK')" 2>nul
    if errorlevel 1 (
        echo [WARNING] No webview package, will use browser
    ) else (
        echo [OK] tkinterweb available
    )
) else (
    echo [OK] pywebview available
)
echo.

echo [5/5] Testing database...
if exist "data\teledrive.db" (
    echo [OK] Database exists
) else (
    echo [INFO] Database will be created on first run
)
echo.

echo ========================================
echo   ALL TESTS PASSED!
echo ========================================
echo.
echo Setup is complete and ready to use.
echo.
echo To start the application:
echo   run.bat
echo.
pause
