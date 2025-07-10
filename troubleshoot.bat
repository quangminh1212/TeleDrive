@echo off
chcp 65001 >nul
title TeleDrive - Troubleshooting

echo.
echo ========================================
echo      TeleDrive - Troubleshooting
echo ========================================
echo.

echo [INFO] Checking common issues...
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found
    echo [FIX] Run setup.bat to create configuration file
    echo.
    goto :end
)

REM Check phone number format
for /f "tokens=2 delims==" %%a in ('findstr "PHONE_NUMBER" .env') do set phone=%%a
echo Current phone number: %phone%

if "%phone%"=="+84123456789" (
    echo [WARNING] You are using the default phone number
    echo [FIX] Run change_phone.bat to set your real phone number
    echo.
)

REM Check for banned phone number error
echo [INFO] Testing Telegram connection...
python -c "
import asyncio
from telegram_client import TelegramClient
async def test():
    try:
        client = TelegramClient()
        await client.connect()
        print('[OK] Connection successful')
        await client.disconnect()
    except Exception as e:
        error_msg = str(e).lower()
        if 'banned' in error_msg:
            print('[ERROR] Phone number is banned by Telegram')
            print('[FIX] Use change_phone.bat to set a different number')
        elif 'phone code' in error_msg:
            print('[INFO] Phone number is valid, authentication required')
        elif 'network' in error_msg or 'connection' in error_msg:
            print('[ERROR] Network connection issue')
            print('[FIX] Check your internet connection')
        else:
            print(f'[ERROR] {e}')
asyncio.run(test())
"

echo.
echo ========================================
echo           Available Solutions
echo ========================================
echo.
echo 1. change_phone.bat    - Change phone number
echo 2. setup.bat          - Recreate configuration
echo 3. run.bat            - Try running again
echo 4. Manual fix         - Edit .env file directly
echo.

echo Common issues and fixes:
echo.
echo • Phone banned: Use different phone number
echo • Network error: Check internet connection  
echo • Config missing: Run setup.bat
echo • Session issues: Delete *.session files
echo.

:end
set /p action="Choose action (1-4) or press Enter to exit: "

if "%action%"=="1" (
    call change_phone.bat
) else if "%action%"=="2" (
    call setup.bat
) else if "%action%"=="3" (
    call run.bat
) else if "%action%"=="4" (
    echo [INFO] Opening .env file for manual editing...
    notepad .env
)

pause
