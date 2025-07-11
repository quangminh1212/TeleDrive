@echo off
echo ========================================
echo    TELEGRAM FILE SCANNER - INSTALLER
echo ========================================
echo.

echo [1/3] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python first.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo Python found!

echo.
echo [2/3] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [3/3] Setting up configuration...
if not exist .env (
    copy .env.example .env
    echo Created .env file from template
    echo.
    echo IMPORTANT: Please edit .env file with your Telegram API credentials
    echo 1. Go to https://my.telegram.org/apps
    echo 2. Create new app to get API_ID and API_HASH
    echo 3. Edit .env file with your credentials
    echo.
) else (
    echo .env file already exists
)

echo.
echo ========================================
echo    INSTALLATION COMPLETED!
echo ========================================
echo.
echo Next steps:
echo 1. Edit .env file with your Telegram API credentials
echo 2. For public channels: python run.py
echo 3. For private channels: python private_channel_scanner.py
echo 4. For demo/help: python demo_private.py
echo.
pause
