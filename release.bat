@echo off
setlocal enabledelayedexpansion
title TeleDrive EXE Builder

echo.
echo ========================================
echo     TeleDrive EXE Builder
echo ========================================
echo.

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

set "PYTHON_CMD=%PROJECT_DIR%\python311\python.exe"
set "DIST_DIR=%PROJECT_DIR%\release"

:: Check Python
if not exist "%PYTHON_CMD%" (
    echo [ERROR] Python 3.11 portable not found!
    echo Please run setup.bat first.
    pause
    exit /b 1
)

:: Check PyInstaller
echo [1/4] Checking PyInstaller...
"%PYTHON_CMD%" -c "import PyInstaller" >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    "%PYTHON_CMD%" -m pip install pyinstaller --quiet
    if errorlevel 1 (
        echo [ERROR] Failed to install PyInstaller
        pause
        exit /b 1
    )
)
echo [OK] PyInstaller ready
echo.

:: Clean previous builds
echo [2/4] Cleaning previous builds...
if exist "%PROJECT_DIR%\build" rd /s /q "%PROJECT_DIR%\build"
if exist "%PROJECT_DIR%\dist" rd /s /q "%PROJECT_DIR%\dist"
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"
echo [OK] Cleaned
echo.

:: Build EXE
echo [3/4] Building EXE (this may take several minutes)...
echo.

"%PYTHON_CMD%" -m PyInstaller --clean --noconfirm teledrive.spec

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    echo Check the output above for errors.
    pause
    exit /b 1
)

echo.
echo [OK] EXE built successfully!
echo.

:: Copy to release folder
echo [4/4] Copying to release folder...

if exist "%PROJECT_DIR%\dist\TeleDrive.exe" (
    copy /y "%PROJECT_DIR%\dist\TeleDrive.exe" "%DIST_DIR%\TeleDrive.exe" >nul
    
    :: Create a launcher batch file for the EXE (for data folder setup)
    echo @echo off > "%DIST_DIR%\TeleDrive_Launcher.bat"
    echo setlocal >> "%DIST_DIR%\TeleDrive_Launcher.bat"
    echo set "APP_DIR=%%~dp0" >> "%DIST_DIR%\TeleDrive_Launcher.bat"
    echo if not exist "%%APP_DIR%%data" mkdir "%%APP_DIR%%data" >> "%DIST_DIR%\TeleDrive_Launcher.bat"
    echo if not exist "%%APP_DIR%%logs" mkdir "%%APP_DIR%%logs" >> "%DIST_DIR%\TeleDrive_Launcher.bat"
    echo if not exist "%%APP_DIR%%output" mkdir "%%APP_DIR%%output" >> "%DIST_DIR%\TeleDrive_Launcher.bat"
    echo start "" "%%APP_DIR%%TeleDrive.exe" >> "%DIST_DIR%\TeleDrive_Launcher.bat"
    
    :: Also copy config template
    if exist "%PROJECT_DIR%\config.json" (
        copy /y "%PROJECT_DIR%\config.json" "%DIST_DIR%\config.json.example" >nul
    )
    
    :: Copy icon
    if exist "%PROJECT_DIR%\icon.ico" (
        copy /y "%PROJECT_DIR%\icon.ico" "%DIST_DIR%\icon.ico" >nul
    )
    
    echo [OK] Files copied to release folder
) else (
    echo [ERROR] TeleDrive.exe not found in dist folder!
    pause
    exit /b 1
)

echo.
echo ========================================
echo     Build Complete!
echo ========================================
echo.
echo Output files:
echo   - %DIST_DIR%\TeleDrive.exe
echo   - %DIST_DIR%\TeleDrive_Launcher.bat
echo.
echo To run: Double-click TeleDrive.exe or TeleDrive_Launcher.bat
echo.
pause
