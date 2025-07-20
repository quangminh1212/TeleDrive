@echo off
echo ================================================================
echo                    TEST RUN.BAT
echo ================================================================
echo.
echo [TEST] Dang test file run.bat moi...
echo [TEST] Working directory: %CD%
echo [TEST] Script location: %~dp0
echo.

echo [1/3] Kiem tra Python...
python --version
if errorlevel 1 (
    echo [ERROR] Python khong tim thay!
    pause
    exit /b 1
) else (
    echo [OK] Python da san sang
)

echo.
echo [2/3] Kiem tra config file...
if exist "config\config.json" (
    echo [OK] Tim thay config.json
) else (
    echo [ERROR] Khong tim thay config.json
)

echo.
echo [3/3] Kiem tra scripts...
if exist "scripts\check_config.py" (
    echo [OK] Tim thay check_config.py
) else (
    echo [ERROR] Khong tim thay check_config.py
)

echo.
echo [TEST] Test hoan thanh!
echo [INFO] File run.bat moi da hoat dong dung!
echo.
pause
