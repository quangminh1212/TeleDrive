@echo off
echo ========================================
echo   Cai dat Python 3.11 cho TeleDrive
echo ========================================
echo.

:: Check if winget is available
winget --version >nul 2>&1
if errorlevel 1 (
    echo Winget khong kha dung. Dang mo trang download Python...
    start https://www.python.org/downloads/release/python-31110/
    echo.
    echo Vui long:
    echo 1. Tai Python 3.11.10 (Windows installer 64-bit)
    echo 2. Chay installer
    echo 3. QUAN TRONG: Tick "Add Python 3.11 to PATH"
    echo 4. Chon "Install Now"
    echo.
    pause
    exit /b 0
)

echo Dang cai dat Python 3.11 qua winget...
echo.

winget install Python.Python.3.11

if errorlevel 1 (
    echo.
    echo Loi khi cai dat qua winget. Dang mo trang download...
    start https://www.python.org/downloads/release/python-31110/
    echo.
    echo Vui long cai dat thu cong va chay lai setup.bat
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Python 3.11 da duoc cai dat!
echo ========================================
echo.
echo Buoc tiep theo:
echo 1. Dong cua so CMD nay
echo 2. Mo CMD moi
echo 3. Chay: setup.bat
echo.
pause
