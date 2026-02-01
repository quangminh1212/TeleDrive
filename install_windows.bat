@echo off
setlocal
title TeleDrive Installer

echo.
echo ========================================
echo      TeleDrive Installation
echo ========================================
echo.
echo This script will install TeleDrive to your local application data folder
echo and create a desktop shortcut.
echo.
echo Install location: %LOCALAPPDATA%\TeleDrive
echo.
pause

set "SOURCE_DIR=%~dp0"
set "INSTALL_DIR=%LOCALAPPDATA%\TeleDrive"

if exist "%INSTALL_DIR%" (
    echo.
    echo [INFO] Updating existing installation...
    echo Stopping any running instances...
    taskkill /f /fi "WINDOWTITLE eq TeleDrive Desktop" >nul 2>&1
) else (
    echo.
    echo [INFO] Creating installation directory...
    mkdir "%INSTALL_DIR%"
)

echo.
echo [1/3] Copying files...
xcopy /s /e /y /q "%SOURCE_DIR%*" "%INSTALL_DIR%\" >nul

echo.
echo [2/3] Creating Desktop Shortcut...
set "TARGET=%INSTALL_DIR%\run.bat"
set "SHORTCUT=%USERPROFILE%\Desktop\TeleDrive.lnk"
set "ICON=%INSTALL_DIR%\icon.ico"
set "WORKING_DIR=%INSTALL_DIR%"

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%WORKING_DIR%'; $s.IconLocation = '%ICON%'; $s.WindowStyle = 1; $s.Save()"

echo.
echo [3/3] Installation Complete!
echo.
echo You can now launch TeleDrive from your Desktop.
echo.
echo Press any key to launch TeleDrive now...
pause >nul

start "" "%TARGET%"
exit
