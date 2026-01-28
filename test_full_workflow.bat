@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   TeleDrive Full Workflow Test
echo ========================================
echo.

set "PYTHON_CMD=python311\python.exe"
set "PASS=0"
set "FAIL=0"

:: Test 1: Python exists
echo [TEST 1/8] Python portable exists...
if exist "%PYTHON_CMD%" (
    echo [PASS] Python found
    set /a PASS+=1
) else (
    echo [FAIL] Python not found - run setup_portable_python.bat
    set /a FAIL+=1
)
echo.

:: Test 2: Python version
echo [TEST 2/8] Python version...
%PYTHON_CMD% --version 2>nul | findstr "3.11" >nul
if errorlevel 1 (
    echo [FAIL] Wrong Python version
    set /a FAIL+=1
) else (
    echo [PASS] Python 3.11 detected
    set /a PASS+=1
)
echo.

:: Test 3: setuptools
echo [TEST 3/8] setuptools installed...
%PYTHON_CMD% -c "import setuptools" 2>nul
if errorlevel 1 (
    echo [FAIL] setuptools not found
    set /a FAIL+=1
) else (
    echo [PASS] setuptools OK
    set /a PASS+=1
)
echo.

:: Test 4: Core packages
echo [TEST 4/8] Core packages (telethon, flask, sqlalchemy)...
%PYTHON_CMD% -c "import telethon, flask, sqlalchemy" 2>nul
if errorlevel 1 (
    echo [FAIL] Core packages missing
    set /a FAIL+=1
) else (
    echo [PASS] Core packages OK
    set /a PASS+=1
)
echo.

:: Test 5: Database packages
echo [TEST 5/8] Database packages...
%PYTHON_CMD% -c "import flask_sqlalchemy, flask_migrate, alembic" 2>nul
if errorlevel 1 (
    echo [FAIL] Database packages missing
    set /a FAIL+=1
) else (
    echo [PASS] Database packages OK
    set /a PASS+=1
)
echo.

:: Test 6: Auth packages
echo [TEST 6/8] Auth packages...
%PYTHON_CMD% -c "import flask_login, bcrypt, flask_wtf" 2>nul
if errorlevel 1 (
    echo [FAIL] Auth packages missing
    set /a FAIL+=1
) else (
    echo [PASS] Auth packages OK
    set /a PASS+=1
)
echo.

:: Test 7: Telegram packages
echo [TEST 7/8] Telegram packages...
%PYTHON_CMD% -c "import opentele, cryptg" 2>nul
if errorlevel 1 (
    echo [FAIL] Telegram packages missing
    set /a FAIL+=1
) else (
    echo [PASS] Telegram packages OK
    set /a PASS+=1
)
echo.

:: Test 8: Webview packages
echo [TEST 8/8] Webview packages...
%PYTHON_CMD% -c "import pywebview" 2>nul
if not errorlevel 1 (
    echo [PASS] pywebview available
    set /a PASS+=1
    goto :test_done
)

%PYTHON_CMD% -c "import tkinterweb" 2>nul
if not errorlevel 1 (
    echo [PASS] tkinterweb available
    set /a PASS+=1
    goto :test_done
)

echo [WARN] No webview package - will use browser
set /a PASS+=1

:test_done
echo.

:: Summary
echo ========================================
echo   Test Summary
echo ========================================
echo.
echo Passed: %PASS%/8
echo Failed: %FAIL%/8
echo.

if %FAIL% GTR 0 (
    echo [RESULT] FAILED - Some tests did not pass
    echo.
    echo Please run:
    echo   setup_portable_python.bat
    echo.
    pause
    exit /b 1
)

echo [RESULT] SUCCESS - All tests passed!
echo.
echo ========================================
echo   System Ready
echo ========================================
echo.
echo Your TeleDrive setup is complete and ready to use.
echo.
echo To start the application:
echo   run.bat
echo.
echo To test the application:
echo   python311\python.exe main_embedded.py
echo.
pause
exit /b 0
