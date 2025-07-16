@echo off
title Test TeleDrive Configuration

echo.
echo ===============================================
echo        TEST TELEDRIVE CONFIGURATION
echo ===============================================
echo.

REM Test Python availability
echo [TEST 1] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Python not found
    goto :end
) else (
    echo [PASS] Python is available
)

REM Test config_manager import
echo [TEST 2] Testing config_manager import...
python -c "from config_manager import ConfigManager; print('[PASS] config_manager imported successfully')" 2>nul
if errorlevel 1 (
    echo [FAIL] Cannot import config_manager
    goto :end
)

REM Test config.json existence and validity
echo [TEST 3] Testing config.json...
if not exist "config.json" (
    echo [INFO] config.json not found, creating default...
    python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.save_config()"
)

python -c "from config_manager import ConfigManager; cm = ConfigManager(); print('[PASS] config.json loaded successfully')" 2>nul
if errorlevel 1 (
    echo [FAIL] config.json is invalid
    goto :end
)

REM Test configuration validation
echo [TEST 4] Testing configuration validation...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); result = cm.validate_configuration(); print('[PASS] Configuration validation completed' if result else '[WARNING] Configuration has issues')" 2>nul

REM Test directory creation
echo [TEST 5] Testing directory creation...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.ensure_directories(); print('[PASS] Directories created successfully')" 2>nul
if errorlevel 1 (
    echo [FAIL] Cannot create directories
    goto :end
)

REM Test channel management
echo [TEST 6] Testing channel management...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); channels = cm.get_config('channels'); print('[PASS] Channel configuration accessible')" 2>nul
if errorlevel 1 (
    echo [FAIL] Cannot access channel configuration
    goto :end
)

REM Show configuration summary
echo [TEST 7] Configuration summary...
python -c "from config_manager import ConfigManager; cm = ConfigManager(); tg = cm.get_config('telegram'); print('Telegram API ID: ' + str(tg.get('api_id', 'Not configured'))); print('Phone number: ' + str(tg.get('phone_number', 'Not configured'))); channels = cm.get_enabled_channels(); print('Enabled channels: ' + str(len(channels))); print('Output directory: ' + str(cm.get_config('output').get('directory', 'output')))"

echo.
echo ===============================================
echo             TEST COMPLETED
echo ===============================================
echo.

:end
pause
