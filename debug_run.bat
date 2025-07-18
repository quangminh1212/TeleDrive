@echo off
chcp 65001 >nul
echo ================================================================
echo                   TELEDRIVE DEBUG
echo ================================================================

echo [DEBUG] Checking config...
python check_config.py
set CONFIG_RESULT=%errorlevel%
echo [DEBUG] Config check result: %CONFIG_RESULT%

if %CONFIG_RESULT% equ 0 (
    echo [SUCCESS] Config is valid, starting web server...
    echo [INFO] Starting Flask app...
    python main.py
) else (
    echo [ERROR] Config validation failed!
    echo Please check your config.json file
    pause
)
