@echo off
echo ========================================
echo   Cai dat Python 3.11 cho TeleDrive
echo ========================================
echo.

:: Check if Python 3.11 already exists
py -3.11 --version >nul 2>&1
if not errorlevel 1 (
    echo Python 3.11 da duoc cai dat!
    py -3.11 --version
    echo.
    echo Ban co the chay: run.bat
    pause
    exit /b 0
)

python3.11 --version >nul 2>&1
if not errorlevel 1 (
    echo Python 3.11 da duoc cai dat!
    python3.11 --version
    echo.
    echo Ban co the chay: run.bat
    pause
    exit /b 0
)

:: Check if winget is available
echo Kiem tra winget...
winget --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [INFO] Winget khong kha dung
    echo Dang mo trang download Python...
    echo.
    start https://www.python.org/downloads/release/python-31110/
    echo.
    echo ========================================
    echo   HUONG DAN CAI DAT THU CONG
    echo ========================================
    echo.
    echo 1. Tai Python 3.11.10 (Windows installer 64-bit)
    echo 2. Chay installer
    echo 3. QUAN TRONG: Tick "Add Python 3.11 to PATH"
    echo 4. Chon "Install Now"
    echo 5. Sau khi cai xong, chay lai: run.bat
    echo.
    pause
    exit /b 0
)

echo [OK] Winget kha dung
echo.
echo Dang cai dat Python 3.11 qua winget...
echo (Co the mat vai phut, vui long doi...)
echo.

winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements

if errorlevel 1 (
    echo.
    echo [WARNING] Cai dat qua winget gap loi
    echo Dang mo trang download...
    echo.
    start https://www.python.org/downloads/release/python-31110/
    echo.
    echo Vui long cai dat thu cong va chay lai: run.bat
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Python 3.11 da duoc cai dat!
echo ========================================
echo.

:: Verify installation
timeout /t 2 /nobreak >nul

py -3.11 --version >nul 2>&1
if not errorlevel 1 (
    echo [OK] Xac nhan cai dat thanh cong:
    py -3.11 --version
    echo.
    echo Buoc tiep theo: Chay run.bat
    echo.
    pause
    exit /b 0
)

echo.
echo [INFO] Python 3.11 da duoc cai dat
echo Vui long dong cua so nay va chay lai: run.bat
echo.
pause
