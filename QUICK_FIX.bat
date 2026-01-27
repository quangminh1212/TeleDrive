@echo off
echo.
echo ========================================
echo   QUICK FIX - Cai Python 3.11
echo ========================================
echo.

echo Ban dang dung Python 3.14 - KHONG TUONG THICH!
echo.
python --version
echo.

echo Dang cai dat Python 3.11...
echo.

:: Try winget first
winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements 2>nul

if errorlevel 1 (
    echo.
    echo Winget khong thanh cong, dang mo trang download...
    start https://www.python.org/downloads/release/python-31110/
    echo.
    echo ========================================
    echo   HUONG DAN CAI DAT
    echo ========================================
    echo.
    echo 1. Tai: Windows installer (64-bit)
    echo 2. Chay installer
    echo 3. TICK: "Add Python 3.11 to PATH"
    echo 4. Click: "Install Now"
    echo 5. Sau khi xong, chay: run.bat
    echo.
    pause
    exit /b 0
)

echo.
echo ========================================
echo   Python 3.11 da duoc cai dat!
echo ========================================
echo.

timeout /t 3 /nobreak >nul

echo Xac nhan cai dat:
py -3.11 --version 2>nul
if errorlevel 1 (
    python3.11 --version 2>nul
    if errorlevel 1 (
        echo.
        echo [WARNING] Chua phat hien Python 3.11
        echo Vui long dong cua so nay va mo lai CMD moi
        echo Sau do chay: run.bat
        echo.
        pause
        exit /b 0
    )
)

echo.
echo [OK] Python 3.11 san sang!
echo.
echo Buoc tiep theo:
echo 1. Dong cua so nay
echo 2. Mo CMD moi (de load PATH moi)
echo 3. Chay: run.bat
echo.
pause
