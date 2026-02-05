@echo off
setlocal enabledelayedexpansion
title TeleDrive Single-EXE Builder

echo.
echo ========================================
echo    TeleDrive Single-EXE Builder
echo ========================================
echo.

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

set "PYTHON_CMD=%PROJECT_DIR%\python311\python.exe"

:: ============================================
:: CHECK REQUIREMENTS
:: ============================================

echo [1/5] Kiem tra yeu cau...

if not exist "%PYTHON_CMD%" (
    echo [ERROR] Python 3.11 portable khong tim thay!
    pause
    exit /b 1
)
echo [OK] Python 3.11

:: Check/install PyInstaller
"%PYTHON_CMD%" -c "import PyInstaller" 2>nul
if errorlevel 1 (
    echo [INFO] Cai dat PyInstaller...
    "%PYTHON_CMD%" -m pip install pyinstaller --quiet
)
echo [OK] PyInstaller

echo.

:: ============================================
:: BUILD TAURI FRONTEND
:: ============================================

echo [2/5] Build Tauri frontend...
pushd "%PROJECT_DIR%\frontend"

if not exist "node_modules" (
    echo Cai dat npm dependencies...
    call npm install --silent
)

echo Build frontend...
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build that bai!
    popd
    pause
    exit /b 1
)

echo Build Tauri...
call npm run tauri build
if errorlevel 1 (
    echo [ERROR] Tauri build that bai!
    popd
    pause
    exit /b 1
)
popd

:: Copy Tauri exe to project root
copy /y "%PROJECT_DIR%\frontend\src-tauri\target\release\TeleDrive.exe" "%PROJECT_DIR%\TeleDrive-UI.exe" >nul
echo [OK] Tauri frontend

echo.

:: ============================================
:: BUILD SINGLE EXE
:: ============================================

echo [3/5] Build single portable EXE...
echo (Co the mat 2-5 phut...)
echo.

"%PYTHON_CMD%" -m PyInstaller --clean --noconfirm single-exe.spec

if errorlevel 1 (
    echo [ERROR] PyInstaller build that bai!
    pause
    exit /b 1
)

echo.
echo [OK] Build thanh cong!

:: ============================================
:: COPY TO RELEASE
:: ============================================

echo.
echo [4/5] Copy to release folder...

if not exist "%PROJECT_DIR%\release" mkdir "%PROJECT_DIR%\release"
copy /y "%PROJECT_DIR%\dist\TeleDrive-Portable.exe" "%PROJECT_DIR%\release\" >nul

echo [OK] Copied

:: ============================================
:: SHOW RESULT
:: ============================================

echo.
echo [5/5] Ket qua...
echo.

set "OUTPUT=%PROJECT_DIR%\release\TeleDrive-Portable.exe"
if exist "%OUTPUT%" (
    echo ========================================
    echo         BUILD COMPLETE!
    echo ========================================
    echo.
    echo File: %OUTPUT%
    echo.
    for %%A in ("%OUTPUT%") do (
        set "SIZE=%%~zA"
        set /a "SIZE_MB=!SIZE!/1048576"
        echo Size: !SIZE_MB! MB
    )
    echo.
    echo Chi can 1 file nay de chay TeleDrive!
    echo Khong can cai dat them bat cu thu gi.
    echo.
    explorer /select,"%OUTPUT%"
) else (
    echo [ERROR] Khong tim thay output file!
)

echo.
pause
