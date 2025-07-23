@echo off
color 0A
title TeleDrive Quick Launcher

echo ================================================================
echo        TELEDRIVE - KHOI DONG NHANH (KHONG BI TREO)
echo ================================================================
echo.

REM Khoi dong TeleDrive trong cua so rieng va ngat ket noi
start "TeleDrive" cmd /c "cd /d %~dp0 && python main.py"

echo [OK] TeleDrive da khoi dong trong tien trinh rieng
echo [OK] Ban co the dong cua so nay va tiep tuc su dung Cursor
echo [INFO] Truy cap web interface tai: http://localhost:3000
echo.
echo Ban co the dong cua so nay an toan. 