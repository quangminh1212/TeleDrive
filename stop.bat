@echo off
echo.
echo ========================================
echo      TeleDrive - Stop All Processes
echo ========================================
echo.

echo Dang dung cac process cua TeleDrive...
echo.

:: Stop Python processes (main.py, app.py)
echo [1/4] Dung Python backend...
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq python.exe" /v 2^>nul ^| findstr /i "main.py app.py teledrive flask"') do (
    taskkill /f /pid %%a >nul 2>&1
)
:: Kill all python.exe that might be from this project
taskkill /f /im python.exe >nul 2>&1
echo [OK] Python processes stopped

:: Stop Node.js processes (frontend dev server)
echo [2/4] Dung Frontend dev server...
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /v 2^>nul ^| findstr /i "vite npm"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo [OK] Node.js processes stopped

:: Kill processes on specific ports
echo [3/4] Giai phong ports (3000, 5000, 8000, 1420)...
for %%p in (3000 5000 8000 1420) do (
    for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p "') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)
echo [OK] Ports cleared

:: Clean up any remaining processes
echo [4/4] Don dep cac process con lai...
:: Kill any cmd.exe running npm or vite
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq cmd.exe" /v 2^>nul ^| findstr /i "npm vite"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo [OK] Cleanup completed

echo.
echo ========================================
echo      TeleDrive da dung hoan toan!
echo ========================================
echo.
echo De khoi dong lai, chay: run.bat
echo.
pause
