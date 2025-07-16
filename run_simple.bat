@echo off
title TeleDrive v2.0 - Advanced Telegram File Scanner

echo.
echo ===============================================
echo        TELEDRIVE v2.0 - FILE SCANNER
echo ===============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found in PATH
    echo [INFO] Please install Python from https://python.org
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Cannot create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Cannot activate virtual environment
    pause
    exit /b 1
)

REM Install/update dependencies
echo [INFO] Installing dependencies...
pip install -r requirements.txt --quiet --upgrade
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

REM Check if config.json exists
if not exist "config.json" (
    echo [WARNING] config.json not found, creating default...
    python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.save_config()"
)

REM Validate configuration
echo [INFO] Validating configuration...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); exit(0 if cm.validate_configuration() else 1)" 2>nul
if errorlevel 1 (
    echo [WARNING] Configuration incomplete or invalid
    echo [INFO] Opening configuration setup...
    python config_setup.py
    if errorlevel 1 (
        echo [ERROR] Configuration setup failed
        pause
        exit /b 1
    )
)

REM Create necessary directories
echo [INFO] Creating necessary directories...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.ensure_directories()"

REM Check for enabled channels
echo [INFO] Checking configured channels...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); channels = cm.get_enabled_channels(); exit(0 if channels else 1)" 2>nul
if errorlevel 1 (
    echo [WARNING] No channels enabled for scanning
    echo [INFO] Please configure at least one channel
    python config_setup.py
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

REM Check Telegram API configuration
echo [INFO] Checking Telegram API configuration...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); tg = cm.get_config('telegram'); exit(0 if tg.get('api_id') and tg.get('api_hash') and tg.get('phone_number') else 1)" 2>nul
if errorlevel 1 (
    echo [WARNING] Telegram API configuration incomplete
    echo [INFO] Please configure API ID, API Hash and phone number
    python config_setup.py
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

:menu
REM Show configuration summary
echo.
echo ===============================================
echo           CONFIGURATION INFO
echo ===============================================
python -c "from config_manager import ConfigManager; cm = ConfigManager(); print('Telegram: ' + str(cm.get_config('telegram').get('phone_number', 'N/A'))); channels = cm.get_enabled_channels(); print('Enabled channels: ' + str(len(channels))); print('Output directory: ' + str(cm.get_config('output').get('directory', 'output'))); ui = cm.get_config('ui'); print('UI: ' + ('Enabled' if ui.get('enabled') else 'Disabled') + ' (Port: ' + str(ui.get('server', {}).get('port', 8080)) + ')')"
echo.

REM Ask user what to do
echo ===============================================
echo             SELECT ACTION
echo ===============================================
echo 1. Scan channels/groups (Scanner)
echo 2. Start Web UI
echo 3. Reconfigure
echo 4. View statistics
echo 0. Exit
echo.
set /p choice="Choose (0-4): "

if "%choice%"=="1" goto :scanner
if "%choice%"=="2" goto :ui
if "%choice%"=="3" goto :config
if "%choice%"=="4" goto :stats
if "%choice%"=="0" goto :exit
goto :invalid

:scanner
echo.
echo ===============================================
echo             STARTING SCANNER
echo ===============================================
python main.py
goto :end

:ui
echo.
echo ===============================================
echo             STARTING WEB UI
echo ===============================================
echo UI will be available at: http://127.0.0.1:8080
echo Press Ctrl+C to stop server
python -c "print('Web UI will be implemented in next version!')"
pause
goto :menu

:config
echo.
echo ===============================================
echo           OPENING CONFIGURATION
echo ===============================================
python config_setup.py
goto :menu

:stats
echo.
echo ===============================================
echo            SYSTEM STATISTICS
echo ===============================================
python -c "from config_manager import ConfigManager; import os; cm = ConfigManager(); print('Directories:'); dirs = ['output', 'logs', 'downloads', 'data']; [print('  ' + d + ': ' + ('OK' if os.path.exists(d) else 'MISSING')) for d in dirs]; print('Channels:'); channels = cm.get_config('channels').get('list', []); print('  Total: ' + str(len(channels))); print('  Enabled: ' + str(len([c for c in channels if c.get('enabled')])))"
pause
goto :menu

:invalid
echo [ERROR] Invalid choice!
pause
goto :menu

:end
REM Check exit code
if errorlevel 1 (
    echo.
    echo [ERROR] Application ended with error
    echo [INFO] Check logs for more details
) else (
    echo.
    echo [SUCCESS] Application completed successfully
)

echo.
echo Results saved in 'output' directory
echo Logs saved in 'logs' directory
echo Database saved in 'data' directory
echo.
pause
goto :menu

:exit
echo Goodbye!
exit /b 0
