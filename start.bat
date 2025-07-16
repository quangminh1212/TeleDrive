@echo off
title TeleDrive v2.0

echo.
echo ===============================================
echo        TELEDRIVE v2.0 - FILE SCANNER
echo ===============================================
echo.

REM Check Python
python --version
if errorlevel 1 (
    echo [ERROR] Python not found
    pause
    exit /b 1
)

REM Test config manager
python -c "from config_manager import ConfigManager; print('[OK] Config manager ready')"
if errorlevel 1 (
    echo [ERROR] Config manager not working
    echo [INFO] Please run setup_simple.bat first
    pause
    exit /b 1
)

REM Create directories
if not exist "output" mkdir output
if not exist "logs" mkdir logs
if not exist "downloads" mkdir downloads
if not exist "data" mkdir data

REM Check config
if not exist "config.json" (
    echo [INFO] Creating default config...
    python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.save_config()"
)

:menu
echo.
echo ===============================================
echo             SELECT ACTION
echo ===============================================
echo 1. Scan channels/groups
echo 2. Configure settings
echo 3. View statistics
echo 4. Test configuration
echo 0. Exit
echo.
set /p choice="Choose (0-4): "

if "%choice%"=="1" goto :scan
if "%choice%"=="2" goto :config
if "%choice%"=="3" goto :stats
if "%choice%"=="4" goto :test
if "%choice%"=="0" goto :exit
echo [ERROR] Invalid choice!
goto :menu

:scan
echo.
echo [INFO] Starting scanner...
python main.py
pause
goto :menu

:config
echo.
echo [INFO] Opening configuration...
python config_setup.py
goto :menu

:stats
echo.
echo [INFO] System statistics...
python -c "from config_manager import ConfigManager; import os; cm = ConfigManager(); print('Directories:'); dirs = ['output', 'logs', 'downloads', 'data']; [print('  ' + d + ': ' + ('OK' if os.path.exists(d) else 'MISSING')) for d in dirs]; channels = cm.get_config('channels').get('list', []); print('Channels: ' + str(len(channels)) + ' total, ' + str(len([c for c in channels if c.get('enabled')])) + ' enabled')"
pause
goto :menu

:test
echo.
echo [INFO] Testing configuration...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); result = cm.validate_configuration(); print('Configuration: ' + ('VALID' if result else 'INVALID'))"
pause
goto :menu

:exit
echo Goodbye!
exit /b 0
