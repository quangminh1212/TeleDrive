@echo off
setlocal enabledelayedexpansion
title TeleDrive Release Builder

echo.
echo ========================================
echo     TeleDrive Release Builder
echo ========================================
echo.

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

:: Build configuration
set "BUILD_DIR=%PROJECT_DIR%\build_temp"
set "DIST_DIR=%PROJECT_DIR%\release"
set "APP_NAME=TeleDrive"
set "VERSION=1.0.0"

:: Create/Clean directories
if exist "%BUILD_DIR%" rd /s /q "%BUILD_DIR%"
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"
mkdir "%BUILD_DIR%"
mkdir "%BUILD_DIR%\data"
mkdir "%BUILD_DIR%\logs"
mkdir "%BUILD_DIR%\output"

:: ============================================
:: 1. Copy Python Runtime
:: ============================================
echo [1/5] Copying Python runtime...
if not exist "%PROJECT_DIR%\python311" (
    echo [ERROR] Python 3.11 portable not found!
    echo Please run setup.bat first.
    pause
    exit /b 1
)
xcopy /s /e /i /q "%PROJECT_DIR%\python311" "%BUILD_DIR%\python311" >nul

:: ============================================
:: 2. Copy Application Code
:: ============================================
echo [2/5] Copying application code...
xcopy /s /e /i /q "%PROJECT_DIR%\app" "%BUILD_DIR%\app" >nul
del /q "%BUILD_DIR%\app\*.pyc" 2>nul
rd /s /q "%BUILD_DIR%\app\__pycache__" 2>nul

xcopy /q "%PROJECT_DIR%\main.py" "%BUILD_DIR%\" >nul
xcopy /q "%PROJECT_DIR%\config.py" "%BUILD_DIR%\" 2>nul
xcopy /q "%PROJECT_DIR%\requirements.txt" "%BUILD_DIR%\" >nul
xcopy /q "%PROJECT_DIR%\README.md" "%BUILD_DIR%\" >nul
xcopy /q "%PROJECT_DIR%\README_VI.md" "%BUILD_DIR%\" >nul
xcopy /q "%PROJECT_DIR%\icon.ico" "%BUILD_DIR%\" >nul

:: Copy scripts
xcopy /q "%PROJECT_DIR%\run.bat" "%BUILD_DIR%\" >nul
xcopy /q "%PROJECT_DIR%\stop.bat" "%BUILD_DIR%\" >nul
xcopy /q "%PROJECT_DIR%\install_windows.bat" "%BUILD_DIR%\" >nul

:: ============================================
:: 3. Setup Frontend
:: ============================================
echo [3/5] Setting up Frontend...
:: In the future, if frontend is pre-built, copy dist to app/static
:: For now, we rely on the run.bat logic or user having Node.js. 
:: BUT for a portable release, we should probably Pre-build the frontend if possible.
:: However, since run.bat checks for Node.js and runs "npm run dev", this is a dev-mode runner.
:: To make it truly portable/production, we should build frontend artifacts.
:: Let's attempt to copy frontend source for now so it works as is.

xcopy /s /e /i /q "%PROJECT_DIR%\frontend" "%BUILD_DIR%\frontend" >nul
rd /s /q "%BUILD_DIR%\frontend\node_modules" 2>nul

:: ============================================
:: 4. Clean up junk
:: ============================================
echo [4/5] Cleaning up...
del /s /q "%BUILD_DIR%\*.pyc" 2>nul
del /s /q "%BUILD_DIR%\*.log" 2>nul
del /s /q "%BUILD_DIR%\*.tmp" 2>nul
rd /s /q "%BUILD_DIR%\.git" 2>nul
rd /s /q "%BUILD_DIR%\.vscode" 2>nul
rd /s /q "%BUILD_DIR%\.idea" 2>nul
rd /s /q "%BUILD_DIR%\__pycache__" 2>nul

:: Keep data/config.json if it exists (but sanitized in a real scenario)
:: For now, create a fresh config if needed or copy template
if exist "%PROJECT_DIR%\config.json" (
    echo [INFO] Copying config.json (ensure no secrets are shared if public!)
    xcopy /q "%PROJECT_DIR%\config.json" "%BUILD_DIR%\" >nul
)

:: ============================================
:: 5. Package
:: ============================================
echo [5/5] Packaging...

:: Method A: Create ZIP (Portable)
set "ZIP_FILE=%DIST_DIR%\%APP_NAME%_Portable_v%VERSION%.zip"
if exist "%ZIP_FILE%" del "%ZIP_FILE%"

echo Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%BUILD_DIR%\*' -DestinationPath '%ZIP_FILE%'"

if exist "%ZIP_FILE%" (
    echo [OK] Portable Release created: %ZIP_FILE%
) else (
    echo [ERROR] Failed to create ZIP file
)

:: Clean temp build
:: rd /s /q "%BUILD_DIR%"

echo.
echo ========================================
echo     Build Complete!
echo ========================================
echo.
echo Output: %DIST_DIR%
echo.
pause
