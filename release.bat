@echo off
setlocal enabledelayedexpansion
title TeleDrive Portable Builder

echo.
echo ========================================
echo     TeleDrive Portable Builder
echo ========================================
echo.

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

set "PYTHON_CMD=%PROJECT_DIR%\python311\python.exe"
set "RELEASE_DIR=%PROJECT_DIR%\release"
set "PORTABLE_DIR=%RELEASE_DIR%\TeleDrive-Portable"

:: ============================================
:: CHECK REQUIREMENTS
:: ============================================

echo [1/5] Kiem tra yeu cau...
echo.

:: Check Python
if not exist "%PYTHON_CMD%" (
    echo [ERROR] Python 3.11 portable khong tim thay!
    echo Vui long chay setup.bat truoc.
    pause
    exit /b 1
)
echo [OK] Python 3.11 portable

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js chua duoc cai dat!
    echo Vui long cai dat: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js

:: Check Rust
where cargo >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Rust chua duoc cai dat!
    echo Vui long cai dat: winget install Rustlang.Rustup
    echo hoac: https://rustup.rs/
    pause
    exit /b 1
)
echo [OK] Rust/Cargo

echo.

:: ============================================
:: CLEAN PREVIOUS BUILDS
:: ============================================

echo [2/5] Don dep build cu...
if exist "%PORTABLE_DIR%" rd /s /q "%PORTABLE_DIR%"
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"
mkdir "%PORTABLE_DIR%"
echo [OK] Da don dep
echo.

:: ============================================
:: BUILD FRONTEND
:: ============================================

echo [3/5] Build frontend...
pushd "%PROJECT_DIR%\frontend"

:: Install dependencies if needed
if not exist "node_modules" (
    echo Dang cai dat dependencies...
    call npm install --silent
)

:: Build frontend for production
echo Dang build frontend...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build frontend that bai!
    popd
    pause
    exit /b 1
)
popd
echo [OK] Frontend da build
echo.

:: ============================================
:: BUILD TAURI APP
:: ============================================

echo [4/5] Build Tauri app (co the mat vai phut)...
echo.
pushd "%PROJECT_DIR%\frontend"
call npm run tauri build
if errorlevel 1 (
    echo [ERROR] Build Tauri that bai!
    popd
    pause
    exit /b 1
)
popd
echo.
echo [OK] Tauri app da build
echo.

:: ============================================
:: CREATE PORTABLE PACKAGE
:: ============================================

echo [5/5] Tao ban portable...

:: Copy Tauri executable
set "TAURI_EXE=%PROJECT_DIR%\frontend\src-tauri\target\release\TeleDrive.exe"
if exist "%TAURI_EXE%" (
    copy /y "%TAURI_EXE%" "%PORTABLE_DIR%\TeleDrive.exe" >nul
    echo [OK] TeleDrive.exe
) else (
    echo [WARNING] Khong tim thay TeleDrive.exe trong target\release
    :: Try bundle location
    for /r "%PROJECT_DIR%\frontend\src-tauri\target\release\bundle" %%f in (TeleDrive.exe) do (
        copy /y "%%f" "%PORTABLE_DIR%\TeleDrive.exe" >nul
        echo [OK] TeleDrive.exe (from bundle)
    )
)

:: Copy Python portable
echo Dang copy Python portable...
xcopy /E /I /Q /Y "%PROJECT_DIR%\python311" "%PORTABLE_DIR%\python311" >nul
echo [OK] Python 3.11 portable

:: Copy backend files
echo Dang copy backend...
xcopy /E /I /Q /Y "%PROJECT_DIR%\app" "%PORTABLE_DIR%\app" >nul
copy /y "%PROJECT_DIR%\main.py" "%PORTABLE_DIR%\" >nul
copy /y "%PROJECT_DIR%\requirements.txt" "%PORTABLE_DIR%\" >nul
echo [OK] Backend files

:: Create data folders
mkdir "%PORTABLE_DIR%\data" 2>nul
mkdir "%PORTABLE_DIR%\logs" 2>nul
mkdir "%PORTABLE_DIR%\output" 2>nul
echo [OK] Data folders

:: Copy config template
if exist "%PROJECT_DIR%\.env.example" (
    copy /y "%PROJECT_DIR%\.env.example" "%PORTABLE_DIR%\.env.example" >nul
)
echo [OK] Config template

:: Create launcher script
echo @echo off > "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo setlocal >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo set "APP_DIR=%%~dp0" >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo if "%%APP_DIR:~-1%%"=="\" set "APP_DIR=%%APP_DIR:~0,-1%%" >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo. >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo :: Create folders if needed >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo if not exist "%%APP_DIR%%\data" mkdir "%%APP_DIR%%\data" >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo if not exist "%%APP_DIR%%\logs" mkdir "%%APP_DIR%%\logs" >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo if not exist "%%APP_DIR%%\output" mkdir "%%APP_DIR%%\output" >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo. >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo :: Start backend >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo start /B "" "%%APP_DIR%%\python311\python.exe" "%%APP_DIR%%\main.py" ^> "%%APP_DIR%%\logs\backend.log" 2^>^&1 >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo. >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo :: Wait for backend >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo timeout /t 2 /nobreak ^>nul >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo. >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo :: Start TeleDrive app >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo start "" "%%APP_DIR%%\TeleDrive.exe" >> "%PORTABLE_DIR%\Start-TeleDrive.bat"
echo [OK] Launcher script

:: Create README
echo TeleDrive Portable > "%PORTABLE_DIR%\README.txt"
echo ================== >> "%PORTABLE_DIR%\README.txt"
echo. >> "%PORTABLE_DIR%\README.txt"
echo De chay TeleDrive: >> "%PORTABLE_DIR%\README.txt"
echo   1. Double-click Start-TeleDrive.bat >> "%PORTABLE_DIR%\README.txt"
echo   2. Hoac chay TeleDrive.exe (can start backend truoc) >> "%PORTABLE_DIR%\README.txt"
echo. >> "%PORTABLE_DIR%\README.txt"
echo Luu y: >> "%PORTABLE_DIR%\README.txt"
echo   - Tao file .env voi API_ID va API_HASH tu my.telegram.org >> "%PORTABLE_DIR%\README.txt"
echo   - Data se duoc luu trong folder 'data' >> "%PORTABLE_DIR%\README.txt"
echo [OK] README

echo.
echo ========================================
echo     Build Complete!
echo ========================================
echo.
echo Output folder: %PORTABLE_DIR%
echo.
echo Files:
dir /b "%PORTABLE_DIR%"
echo.
echo De chay: Double-click Start-TeleDrive.bat
echo.

:: Open release folder
explorer "%RELEASE_DIR%"

pause
