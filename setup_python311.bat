@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   TeleDrive - Setup voi Python 3.11
echo ========================================
echo.

:: Tim Python 3.11
set "PYTHON311="

:: Check py launcher
py -3.11 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON311=py -3.11"
    echo Tim thay Python 3.11 qua py launcher
    py -3.11 --version
    goto :found_python
)

:: Check python3.11 command
python3.11 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON311=python3.11"
    echo Tim thay Python 3.11
    python3.11 --version
    goto :found_python
)

:: Check default python
python --version 2>&1 | findstr "3.11" >nul
if not errorlevel 1 (
    set "PYTHON311=python"
    echo Tim thay Python 3.11 (default)
    python --version
    goto :found_python
)

:: Not found
echo.
echo KHONG TIM THAY PYTHON 3.11!
echo.
echo Vui long chay: install_python311.bat
echo.
pause
exit /b 1

:found_python
echo.

:: Xoa virtual environment cu neu co
if exist ".venv" (
    echo Xoa virtual environment cu...
    rmdir /s /q .venv
    echo.
)

:: Tao virtual environment moi voi Python 3.11
echo Tao virtual environment moi voi Python 3.11...
%PYTHON311% -m venv .venv

if errorlevel 1 (
    echo.
    echo Loi khi tao virtual environment!
    echo Dang thu cai dat python-venv...
    %PYTHON311% -m pip install --upgrade pip
    %PYTHON311% -m pip install virtualenv
    %PYTHON311% -m virtualenv .venv
    
    if errorlevel 1 (
        echo.
        echo Van gap loi. Vui long cai dat lai Python 3.11
        pause
        exit /b 1
    )
)

echo Virtual environment da duoc tao
echo.

:: Kich hoat virtual environment
echo Kich hoat virtual environment...
call .venv\Scripts\activate.bat

if errorlevel 1 (
    echo Loi khi kich hoat virtual environment
    pause
    exit /b 1
)

echo.

:: Nang cap pip
echo Nang cap pip...
python -m pip install --upgrade pip
echo.

:: Cai dat dependencies
echo Cai dat dependencies...
pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo Mot so package co the bi loi, nhung du an van co the chay duoc
    echo.
)

:: Cai dat pywebview (co the fail nhung khong sao)
echo.
echo Cai dat pywebview cho embedded webview...
pip install pywebview 2>nul
if errorlevel 1 (
    echo pywebview khong cai duoc (binh thuong), se dung fallback
)

:: Cai dat tkinterweb (fallback)
echo Cai dat tkinterweb (fallback)...
pip install tkinterweb 2>nul
if errorlevel 1 (
    echo tkinterweb khong cai duoc, se dung browser
)

echo.
echo ========================================
echo   Setup hoan tat!
echo ========================================
echo.
echo Python version:
python --version
echo.
echo Cac buoc tiep theo:
echo 1. Chay: run.bat
echo.
pause
