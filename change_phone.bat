@echo off
chcp 65001 >nul
title TeleDrive - Change Phone Number

echo.
echo ========================================
echo    TeleDrive - Change Phone Number
echo ========================================
echo.

echo [WARNING] Current phone number appears to be banned by Telegram
echo.
echo Possible solutions:
echo 1. Use a different phone number
echo 2. Contact Telegram support if you believe this is an error
echo 3. Check https://www.telegram.org/faq_spam for more information
echo.

set /p new_phone="Enter new phone number (with country code, e.g., +84987654321): "

if "%new_phone%"=="" (
    echo [ERROR] Phone number cannot be empty
    pause
    exit /b 1
)

echo.
echo [INFO] Updating phone number to: %new_phone%

REM Update phone number in .env file using PowerShell
powershell -Command "(Get-Content .env) -replace 'PHONE_NUMBER=.*', 'PHONE_NUMBER=%new_phone%' | Set-Content .env"

if errorlevel 1 (
    echo [ERROR] Failed to update .env file
    pause
    exit /b 1
)

echo [OK] Phone number updated successfully

REM Delete old session files to force re-authentication
echo.
echo [INFO] Cleaning old session files...
if exist "*.session" (
    del *.session
    echo [OK] Old session files deleted
)
if exist "*.session-journal" (
    del *.session-journal
    echo [OK] Session journal files deleted
)

echo.
echo [INFO] Testing new configuration...
python setup_check.py

if errorlevel 1 (
    echo.
    echo [WARNING] Configuration test failed with new phone number
    echo Please check if the phone number is valid and not banned
    pause
    exit /b 1
)

echo.
echo ========================================
echo     Phone Number Updated Successfully!
echo ========================================
echo.
echo New phone number: %new_phone%
echo Old session files have been cleared
echo.
set /p start="Start TeleDrive now? (Y/N): "
if /i "%start%"=="Y" (
    echo.
    echo Starting TeleDrive...
    python main.py
)

pause
