@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM TeleDrive Desktop - Release Build Script
REM Builds both Portable and Installer versions
REM ============================================================================

echo.
echo ============================================================================
echo TeleDrive Desktop - Release Builder
echo ============================================================================
echo.

REM Configuration
set VERSION=2.0.0
set APP_NAME=TeleDrive
set RELEASE_DIR=release
set PORTABLE_DIR=%RELEASE_DIR%\%APP_NAME%-Portable-v%VERSION%
set INSTALLER_DIR=%RELEASE_DIR%

REM Colors (if supported)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "RESET=[0m"

REM ============================================================================
REM Step 1: Pre-flight checks
REM ============================================================================
echo [1/8] Checking prerequisites...
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo %RED%Error: Python not found!%RESET%
    echo Please install Python 3.11 or higher
    pause
    exit /b 1
)
echo   [OK] Python found

REM Check if virtual environment exists
if not exist ".venv\" (
    echo %YELLOW%Warning: Virtual environment not found%RESET%
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo %RED%Error: Failed to create virtual environment%RESET%
        pause
        exit /b 1
    )
)
echo   [OK] Virtual environment ready

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Check PyInstaller
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%Installing PyInstaller...%RESET%
    pip install pyinstaller
)
echo   [OK] PyInstaller ready

REM Check Pillow for icon
pip show Pillow >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%Installing Pillow...%RESET%
    pip install Pillow
)
echo   [OK] Pillow ready

echo.
echo %GREEN%All prerequisites OK!%RESET%
echo.
pause

REM ============================================================================
REM Step 2: Clean previous builds
REM ============================================================================
echo [2/8] Cleaning previous builds...
echo.

if exist "build\" (
    echo   Removing build/
    rmdir /s /q build
)

if exist "dist\" (
    echo   Removing dist/
    rmdir /s /q dist
)

if exist "%RELEASE_DIR%\" (
    echo   Removing %RELEASE_DIR%/
    rmdir /s /q %RELEASE_DIR%
)

if exist "TeleDrive.spec" (
    echo   Removing TeleDrive.spec
    del TeleDrive.spec
)

echo.
echo %GREEN%Cleanup complete!%RESET%
echo.

REM ============================================================================
REM Step 3: Create/verify icon
REM ============================================================================
echo [3/8] Preparing application icon...
echo.

if not exist "icon.ico" (
    echo   Creating icon...
    python create_icon.py
    if errorlevel 1 (
        echo %YELLOW%Warning: Icon creation failed, continuing without icon%RESET%
    ) else (
        echo   [OK] Icon created
    )
) else (
    echo   [OK] Icon already exists
)

echo.

REM ============================================================================
REM Step 4: Build executable
REM ============================================================================
echo [4/8] Building executable with PyInstaller...
echo.
echo This may take 5-10 minutes...
echo.

python build.py
if errorlevel 1 (
    echo.
    echo %RED%Error: Build failed!%RESET%
    echo Check the output above for errors
    pause
    exit /b 1
)

echo.
echo %GREEN%Build successful!%RESET%
echo.

REM ============================================================================
REM Step 5: Create release directory structure
REM ============================================================================
echo [5/8] Creating release directory structure...
echo.

mkdir "%RELEASE_DIR%" 2>nul
mkdir "%PORTABLE_DIR%" 2>nul

echo   [OK] Release directories created
echo.

REM ============================================================================
REM Step 6: Package Portable version
REM ============================================================================
echo [6/8] Packaging Portable version...
echo.

REM Copy executable and dependencies
echo   Copying application files...
xcopy "dist\TeleDrive\*" "%PORTABLE_DIR%\" /E /I /Y /Q >nul
if errorlevel 1 (
    echo %RED%Error: Failed to copy application files%RESET%
    pause
    exit /b 1
)

REM Copy documentation
echo   Copying documentation...
copy ".env.example" "%PORTABLE_DIR%\" >nul
copy "README.md" "%PORTABLE_DIR%\" >nul
copy "CHANGELOG.md" "%PORTABLE_DIR%\" >nul
copy "PORTABLE_README.txt" "%PORTABLE_DIR%\README.txt" >nul

REM Create data directories
echo   Creating data directories...
mkdir "%PORTABLE_DIR%\data" 2>nul
mkdir "%PORTABLE_DIR%\data\uploads" 2>nul
mkdir "%PORTABLE_DIR%\data\temp" 2>nul
mkdir "%PORTABLE_DIR%\data\backups" 2>nul
mkdir "%PORTABLE_DIR%\logs" 2>nul

REM Create portable marker
echo PORTABLE=1 > "%PORTABLE_DIR%\.portable"

REM Create ZIP archive
echo   Creating ZIP archive...
cd "%RELEASE_DIR%"
powershell -Command "Compress-Archive -Path '%APP_NAME%-Portable-v%VERSION%' -DestinationPath '%APP_NAME%-Portable-v%VERSION%-Windows.zip' -Force"
if errorlevel 1 (
    echo %YELLOW%Warning: ZIP creation failed%RESET%
    cd ..
) else (
    echo   [OK] ZIP created: %APP_NAME%-Portable-v%VERSION%-Windows.zip
    cd ..
)

echo.
echo %GREEN%Portable version ready!%RESET%
echo Location: %PORTABLE_DIR%
echo.

REM ============================================================================
REM Step 7: Build Installer (if Inno Setup available)
REM ============================================================================
echo [7/8] Building Installer...
echo.

REM Check if Inno Setup is installed
set "INNO_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist "%INNO_PATH%" (
    set "INNO_PATH=C:\Program Files\Inno Setup 6\ISCC.exe"
)

if exist "%INNO_PATH%" (
    echo   Found Inno Setup, building installer...
    "%INNO_PATH%" "installer.iss"
    if errorlevel 1 (
        echo %YELLOW%Warning: Installer build failed%RESET%
    ) else (
        echo.
        echo %GREEN%Installer created successfully!%RESET%
        echo Location: %INSTALLER_DIR%\%APP_NAME%-Setup-v%VERSION%.exe
    )
) else (
    echo %YELLOW%Inno Setup not found - Skipping installer build%RESET%
    echo.
    echo To build installer:
    echo 1. Install Inno Setup from: https://jrsoftware.org/isdl.php
    echo 2. Run this script again
    echo.
    echo Or manually compile installer.iss with Inno Setup
)

echo.

REM ============================================================================
REM Step 8: Generate checksums
REM ============================================================================
echo [8/8] Generating checksums...
echo.

cd "%RELEASE_DIR%"

REM Generate SHA256 checksums
echo Generating SHA256 checksums...
(
    echo TeleDrive v%VERSION% - SHA256 Checksums
    echo Generated: %DATE% %TIME%
    echo.
    echo ============================================================================
    echo.
) > checksums.txt

REM Checksum for portable ZIP
if exist "%APP_NAME%-Portable-v%VERSION%-Windows.zip" (
    for /f "skip=1 tokens=*" %%a in ('certutil -hashfile "%APP_NAME%-Portable-v%VERSION%-Windows.zip" SHA256') do (
        if not "%%a"=="" (
            echo %APP_NAME%-Portable-v%VERSION%-Windows.zip >> checksums.txt
            echo SHA256: %%a >> checksums.txt
            echo. >> checksums.txt
            goto :checksum_installer
        )
    )
)

:checksum_installer
REM Checksum for installer
if exist "%APP_NAME%-Setup-v%VERSION%.exe" (
    for /f "skip=1 tokens=*" %%a in ('certutil -hashfile "%APP_NAME%-Setup-v%VERSION%.exe" SHA256') do (
        if not "%%a"=="" (
            echo %APP_NAME%-Setup-v%VERSION%.exe >> checksums.txt
            echo SHA256: %%a >> checksums.txt
            echo. >> checksums.txt
            goto :checksum_done
        )
    )
)

:checksum_done
echo ============================================================================ >> checksums.txt

cd ..

echo   [OK] Checksums saved to %RELEASE_DIR%\checksums.txt
echo.

REM ============================================================================
REM Summary
REM ============================================================================
echo.
echo ============================================================================
echo BUILD COMPLETE!
echo ============================================================================
echo.
echo Version: %VERSION%
echo.
echo Output files:
echo.

if exist "%PORTABLE_DIR%" (
    echo   %GREEN%[OK]%RESET% Portable folder: %PORTABLE_DIR%\
)

if exist "%RELEASE_DIR%\%APP_NAME%-Portable-v%VERSION%-Windows.zip" (
    for %%A in ("%RELEASE_DIR%\%APP_NAME%-Portable-v%VERSION%-Windows.zip") do (
        echo   %GREEN%[OK]%RESET% Portable ZIP: %%~nxA (%%~zA bytes^)
    )
)

if exist "%INSTALLER_DIR%\%APP_NAME%-Setup-v%VERSION%.exe" (
    for %%A in ("%INSTALLER_DIR%\%APP_NAME%-Setup-v%VERSION%.exe") do (
        echo   %GREEN%[OK]%RESET% Installer: %%~nxA (%%~zA bytes^)
    )
)

if exist "%RELEASE_DIR%\checksums.txt" (
    echo   %GREEN%[OK]%RESET% Checksums: checksums.txt
)

echo.
echo Release directory: %RELEASE_DIR%\
echo.
echo ============================================================================
echo.
echo Next steps:
echo   1. Test the portable version
echo   2. Test the installer (if built)
echo   3. Create GitHub release
echo   4. Upload files to release
echo.
echo ============================================================================
echo.

REM Deactivate virtual environment
deactivate

REM Open release folder
echo Opening release folder...
start "" "%RELEASE_DIR%"

pause
