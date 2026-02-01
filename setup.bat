@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Setup Portable Python 3.11
echo ========================================
echo.

set "PYTHON_DIR=%~dp0python311"
set "PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"
set "PYTHON_ZIP=%TEMP%\python-3.11.9-embed.zip"
set "GET_PIP_URL=https://bootstrap.pypa.io/get-pip.py"

:: Check if already exists
if exist "%PYTHON_DIR%\python.exe" (
    echo [OK] Python 3.11 portable da ton tai!
    "%PYTHON_DIR%\python.exe" --version
    echo.
    echo Folder: %PYTHON_DIR%
    echo.
    pause
    exit /b 0
)

echo Dang download Python 3.11 embeddable...
echo URL: %PYTHON_URL%
echo.

:: Download Python embeddable
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_ZIP%' -UseBasicParsing}"

if not exist "%PYTHON_ZIP%" (
    echo [ERROR] Khong the download Python!
    echo.
    echo Vui long thu lai hoac download thu cong:
    echo %PYTHON_URL%
    echo.
    pause
    exit /b 1
)

echo [OK] Download thanh cong!
echo.

:: Extract
echo Dang giai nen Python...
powershell -Command "Expand-Archive -Path '%PYTHON_ZIP%' -DestinationPath '%PYTHON_DIR%' -Force"

if not exist "%PYTHON_DIR%\python.exe" (
    echo [ERROR] Khong the giai nen Python!
    pause
    exit /b 1
)

echo [OK] Giai nen thanh cong!
echo.

:: Enable pip by modifying python311._pth
echo Dang cau hinh pip...
if exist "%PYTHON_DIR%\python311._pth" (
    powershell -Command "(Get-Content '%PYTHON_DIR%\python311._pth') -replace '#import site', 'import site' | Set-Content '%PYTHON_DIR%\python311._pth'"
)

:: Download and install pip
echo Dang cai dat pip...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%GET_PIP_URL%' -OutFile '%PYTHON_DIR%\get-pip.py' -UseBasicParsing}"

if not exist "%PYTHON_DIR%\get-pip.py" (
    echo [ERROR] Khong the download get-pip.py!
    pause
    exit /b 1
)

echo Dang chay get-pip.py...
"%PYTHON_DIR%\python.exe" "%PYTHON_DIR%\get-pip.py" --no-warn-script-location

if errorlevel 1 (
    echo [ERROR] Khong the cai dat pip!
    pause
    exit /b 1
)

del "%PYTHON_DIR%\get-pip.py"

:: Cleanup
if exist "%PYTHON_ZIP%" del /f /q "%PYTHON_ZIP%"

echo [OK] pip da duoc cai dat!
echo.

:: Upgrade pip first
echo Dang nang cap pip...
"%PYTHON_DIR%\python.exe" -m pip install --upgrade pip
if errorlevel 1 (
    echo [WARNING] Khong the nang cap pip, tiep tuc voi phien ban hien tai
)
echo.

:: Install setuptools and wheel (CRITICAL for embeddable Python)
:: Must install to python311\Lib\site-packages for embeddable Python
echo Dang cai dat setuptools va wheel (bat buoc cho Python embeddable)...
"%PYTHON_DIR%\python.exe" -m pip install --target "%PYTHON_DIR%\Lib\site-packages" setuptools wheel

if errorlevel 1 (
    echo [ERROR] Khong the cai dat setuptools!
    echo Dang thu lai voi verbose output...
    echo.
    "%PYTHON_DIR%\python.exe" -m pip install --target "%PYTHON_DIR%\Lib\site-packages" setuptools wheel -v
    
    if errorlevel 1 (
        echo.
        echo [ERROR] Van gap loi khi cai setuptools
        echo.
        echo Vui long kiem tra:
        echo   1. Ket noi internet
        echo   2. Quyen ghi file trong folder python311
        echo   3. Antivirus/Firewall co chan khong
        echo.
        pause
        exit /b 1
    )
)

echo [OK] setuptools va wheel da duoc cai dat!
echo.

:: Verify installation
echo Kiem tra setuptools...
"%PYTHON_DIR%\python.exe" -c "import setuptools; print('setuptools version:', setuptools.__version__)"
if errorlevel 1 (
    echo [ERROR] setuptools khong hoat dong dung!
    pause
    exit /b 1
)
echo [OK] setuptools hoat dong tot!
echo.

echo Dang cai dat dependencies...
echo (Co the mat vai phut...)
echo.

:: Install dependencies with better error handling
"%PYTHON_DIR%\python.exe" -m pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo [WARNING] Mot so package co the bi loi
    echo Dang thu cai dat lai tung package...
    echo.
    
    :: Try installing packages one by one, skip comments and empty lines
    for /f "usebackq tokens=* delims=" %%p in ("requirements.txt") do (
        set "line=%%p"
        :: Skip empty lines and comments
        echo !line! | findstr /r "^#" >nul
        if errorlevel 1 (
            echo !line! | findstr /r "^$" >nul
            if errorlevel 1 (
                echo Installing %%p...
                "%PYTHON_DIR%\python.exe" -m pip install "%%p"
                if errorlevel 1 (
                    echo [WARNING] Failed to install %%p - skipping
                )
            )
        )
    )
)

echo.
echo Kiem tra cac package quan trong...
"%PYTHON_DIR%\python.exe" -c "import telethon; import flask; import sqlalchemy; print('[OK] Core packages installed')"
if errorlevel 1 (
    echo [ERROR] Mot so package quan trong chua duoc cai dat!
    echo Vui long chay lai script hoac cai thu cong
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ALL DONE!
echo ========================================
echo.
echo Python 3.11 portable + dependencies da san sang!
echo.
echo Location: %PYTHON_DIR%
echo.
"%PYTHON_DIR%\python.exe" --version
echo.
echo Installed packages:
"%PYTHON_DIR%\python.exe" -m pip list
echo.
echo Chay ung dung:
echo   run.bat
echo.
pause
exit /b 0
