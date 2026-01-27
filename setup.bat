@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo      TeleDrive - Initial Setup
echo ========================================
echo.

:: Check if Python is installed
echo [1/6] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo.
    echo Please install Python 3.8+ from https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo ✅ Python found
python --version
echo.

:: Check if we're in the correct directory
echo [2/6] Verifying project structure...
if not exist "app\app.py" (
    echo ❌ Please run this script from the TeleDrive project root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)
echo ✅ Project structure verified
echo.

:: Create virtual environment
echo [3/6] Creating virtual environment...
if exist ".venv" (
    echo ⚠️  Virtual environment already exists
    choice /C YN /M "Do you want to recreate it? (Y/N)"
    if errorlevel 2 (
        echo ℹ️  Keeping existing virtual environment
        goto :skip_venv_creation
    )
    echo 🗑️  Removing old virtual environment...
    rmdir /s /q .venv
)

python -m venv .venv
if errorlevel 1 (
    echo ❌ Failed to create virtual environment
    pause
    exit /b 1
)
echo ✅ Virtual environment created

:skip_venv_creation
echo.

:: Activate virtual environment
echo [4/6] Activating virtual environment...
if exist ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
    echo ✅ Virtual environment activated
) else (
    echo ❌ Virtual environment activation script not found
    pause
    exit /b 1
)
echo.

:: Upgrade pip
echo [5/6] Upgrading pip...
python -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo ⚠️  Failed to upgrade pip, continuing anyway...
) else (
    echo ✅ Pip upgraded
)
echo.

:: Install dependencies
echo [6/6] Installing dependencies...
echo This may take a few minutes...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    echo.
    echo Please check:
    echo - Your internet connection
    echo - requirements.txt file exists
    echo - No firewall blocking pip
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

:: Create necessary directories
echo Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\temp" mkdir data\temp
if not exist "data\backups" mkdir data\backups
if not exist "output" mkdir output
echo ✅ Directories created
echo.

:: Check for .env file
echo Checking configuration...
if not exist ".env" (
    if exist ".env.example" (
        echo ℹ️  Creating .env from .env.example...
        copy .env.example .env >nul
        echo ✅ .env file created
        echo.
        echo ⚠️  IMPORTANT: Please edit .env file if you need custom configuration
        echo    (Only required if not using Telegram Desktop auto-login)
    ) else (
        echo ℹ️  No .env file found (optional for Telegram Desktop users)
    )
) else (
    echo ✅ .env file exists
)
echo.

:: Check for Telegram Desktop
echo Checking for Telegram Desktop...
set TELEGRAM_FOUND=0

if exist "%APPDATA%\Telegram Desktop\tdata" (
    echo ✅ Telegram Desktop found at: %APPDATA%\Telegram Desktop
    set TELEGRAM_FOUND=1
) else if exist "%LOCALAPPDATA%\Telegram Desktop" (
    echo ✅ Telegram Desktop found at: %LOCALAPPDATA%\Telegram Desktop
    set TELEGRAM_FOUND=1
) else (
    echo ⚠️  Telegram Desktop not found
)
echo.

:: Summary
echo ========================================
echo      Setup Complete! 🎉
echo ========================================
echo.
echo ✅ Virtual environment created
echo ✅ Dependencies installed
echo ✅ Directories created
echo ✅ Configuration checked
echo.

if %TELEGRAM_FOUND%==1 (
    echo 🎉 GREAT NEWS!
    echo You have Telegram Desktop installed.
    echo You can use AUTO-LOGIN without API credentials!
    echo.
    echo Next steps:
    echo 1. Make sure Telegram Desktop is logged in
    echo 2. Run: run.bat
    echo 3. Access: http://localhost:3000
    echo 4. Enjoy auto-login! 🚀
) else (
    echo ℹ️  Telegram Desktop not found
    echo.
    echo You have 2 options:
    echo.
    echo Option 1 (Recommended - No API needed):
    echo 1. Install Telegram Desktop from: https://desktop.telegram.org/
    echo 2. Login to your Telegram account
    echo 3. Run: run.bat
    echo 4. Enjoy auto-login! 🚀
    echo.
    echo Option 2 (Manual login):
    echo 1. Get API credentials from: https://my.telegram.org
    echo 2. Edit .env file with your API_ID and API_HASH
    echo 3. Run: run.bat
    echo 4. Login with phone number + verification code
)

echo.
echo ========================================
pause
