@echo off
setlocal

echo.
echo ========================================
echo   AUTO INSTALL Python 3.11
echo ========================================
echo.

:: Check if already installed
py -3.11 --version >nul 2>&1
if not errorlevel 1 (
    echo [OK] Python 3.11 da duoc cai dat!
    py -3.11 --version
    exit /b 0
)

python3.11 --version >nul 2>&1
if not errorlevel 1 (
    echo [OK] Python 3.11 da duoc cai dat!
    python3.11 --version
    exit /b 0
)

echo [INFO] Dang cai dat Python 3.11...
echo.

:: Method 1: Try winget (silent install)
echo [1/3] Thu cai dat qua winget...
winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements --disable-interactivity >nul 2>&1

if not errorlevel 1 (
    echo [OK] Cai dat thanh cong qua winget!
    timeout /t 3 /nobreak >nul
    
    :: Verify
    py -3.11 --version >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Xac nhan: Python 3.11 da san sang
        py -3.11 --version
        exit /b 0
    )
    
    python3.11 --version >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Xac nhan: Python 3.11 da san sang
        python3.11 --version
        exit /b 0
    )
)

:: Method 2: Try Chocolatey
echo [2/3] Thu cai dat qua Chocolatey...
where choco >nul 2>&1
if not errorlevel 1 (
    choco install python311 -y --force >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Cai dat thanh cong qua Chocolatey!
        timeout /t 3 /nobreak >nul
        
        py -3.11 --version >nul 2>&1
        if not errorlevel 1 (
            echo [OK] Xac nhan: Python 3.11 da san sang
            py -3.11 --version
            exit /b 0
        )
    )
)

:: Method 3: Download and install silently
echo [3/3] Dang download va cai dat tu python.org...
echo.

set "PYTHON_URL=https://www.python.org/ftp/python/3.11.10/python-3.11.10-amd64.exe"
set "INSTALLER=%TEMP%\python-3.11.10-installer.exe"

echo Downloading Python 3.11.10...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%INSTALLER%' -UseBasicParsing}" 2>nul

if not exist "%INSTALLER%" (
    echo [ERROR] Khong the download Python installer
    echo.
    echo Vui long cai dat thu cong:
    echo 1. Truy cap: https://www.python.org/downloads/release/python-31110/
    echo 2. Tai: Windows installer (64-bit)
    echo 3. Chay installer, tick "Add to PATH"
    echo.
    exit /b 1
)

echo [OK] Download thanh cong
echo.
echo Dang cai dat Python 3.11 (silent mode)...
echo (Co the mat 2-3 phut, vui long doi...)
echo.

:: Install silently with all options
"%INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0 Include_pip=1 Include_launcher=1

if errorlevel 1 (
    echo [WARNING] Cai dat gap van de, thu lai voi admin rights...
    
    :: Try with admin rights
    powershell -Command "Start-Process '%INSTALLER%' -ArgumentList '/quiet','InstallAllUsers=0','PrependPath=1','Include_test=0','Include_pip=1','Include_launcher=1' -Verb RunAs -Wait" 2>nul
)

:: Wait for installation to complete
timeout /t 5 /nobreak >nul

:: Cleanup
if exist "%INSTALLER%" del /f /q "%INSTALLER%" >nul 2>&1

:: Verify installation
echo.
echo Kiem tra cai dat...
echo.

:: Refresh environment variables
call :RefreshEnv

py -3.11 --version >nul 2>&1
if not errorlevel 1 (
    echo [OK] Python 3.11 da duoc cai dat thanh cong!
    py -3.11 --version
    echo.
    exit /b 0
)

python3.11 --version >nul 2>&1
if not errorlevel 1 (
    echo [OK] Python 3.11 da duoc cai dat thanh cong!
    python3.11 --version
    echo.
    exit /b 0
)

:: Check in default location
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    echo [OK] Python 3.11 da duoc cai dat!
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" --version
    echo.
    echo [INFO] Vui long dong va mo lai CMD de su dung Python 3.11
    exit /b 0
)

echo.
echo [WARNING] Cai dat hoan tat nhung chua phat hien Python 3.11
echo Vui long:
echo 1. Dong cua so CMD nay
echo 2. Mo CMD moi
echo 3. Chay: run.bat
echo.
exit /b 0

:RefreshEnv
:: Refresh environment variables without restarting CMD
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "UserPath=%%b"
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SystemPath=%%b"
set "PATH=%UserPath%;%SystemPath%"
goto :eof
