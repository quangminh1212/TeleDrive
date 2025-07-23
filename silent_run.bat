@echo off
color 0B
title TeleDrive Silent Launcher

echo ================================================================
echo        TELEDRIVE - CHAY NGAM (SILENT MODE)
echo ================================================================
echo.

REM Kiem tra pythonw ton tai
where pythonw >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Su dung pythonw de chay khong hien thi cua so...
    start "" /B pythonw main.py
) else (
    echo [INFO] Su dung python voi cua so an...
    start "" /B cmd /c "python main.py >nul 2>&1"
)

echo [OK] TeleDrive da khoi dong trong che do ngam
echo [OK] Khong co cua so console nao duoc hien thi
echo [INFO] Truy cap web interface tai: http://localhost:3000
echo.
echo De dung TeleDrive, hay dong tat ca cac tien trinh python trong Task Manager.
echo. 