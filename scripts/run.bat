@echo off
REM TeleDrive Run Script
REM Khởi chạy ứng dụng TeleDrive với môi trường được cấu hình

echo ========================================
echo TeleDrive - Application Launcher
echo ========================================
echo.

REM Check if virtual environment exists
if not exist venv (
    echo ERROR: Virtual environment not found
    echo Please run scripts\setup.bat first
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)
echo ✅ Virtual environment activated
echo.

REM Check configuration
echo Checking configuration...
if not exist config.json (
    echo ERROR: config.json not found
    echo Please configure your Telegram API credentials
    echo.
    echo Creating default config.json...
    python -c "
from src.teledrive.config.manager import ConfigManager
try:
    manager = ConfigManager()
    manager.create_default_config()
    print('✅ Default config.json created')
    print('Please edit config.json with your Telegram API credentials')
except Exception as e:
    print(f'ERROR: Failed to create config: {e}')
    "
    pause
    exit /b 1
)

REM Validate configuration
python -c "
from src.teledrive.config.manager import ConfigManager
try:
    manager = ConfigManager()
    if manager.validate_telegram_config():
        print('✅ Configuration validated')
    else:
        print('ERROR: Invalid Telegram configuration')
        print('Please check your API credentials in config.json')
        exit(1)
except Exception as e:
    print(f'ERROR: Configuration validation failed: {e}')
    exit(1)
" >nul 2>&1

if errorlevel 1 (
    echo ❌ Configuration validation failed
    echo Please check your config.json file
    echo.
    echo Required fields:
    echo - telegram.api_id: Your Telegram API ID
    echo - telegram.api_hash: Your Telegram API Hash  
    echo - telegram.phone_number: Your phone number with country code
    echo.
    echo Get API credentials from: https://my.telegram.org/apps
    pause
    exit /b 1
)

echo ✅ Configuration validated
echo.

REM Create necessary directories
if not exist logs mkdir logs
if not exist output mkdir output
if not exist downloads mkdir downloads

REM Launch application
echo ========================================
echo Starting TeleDrive...
echo ========================================
echo.

REM Try to run with new structure first, fallback to old
python -m teledrive.cli.main 2>nul
if errorlevel 1 (
    echo Falling back to legacy main.py...
    python main.py
)

echo.
echo ========================================
echo TeleDrive session ended
echo ========================================
pause
