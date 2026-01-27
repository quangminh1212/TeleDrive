@echo off
echo.
echo ========================================
echo   TEST AUTO INSTALL Python 3.11
echo ========================================
echo.

echo Kiem tra Python hien tai:
python --version 2>&1
echo.

echo Kiem tra Python 3.11:
py -3.11 --version 2>nul
if not errorlevel 1 (
    echo [OK] Python 3.11 da ton tai!
    exit /b 0
)

python3.11 --version 2>nul
if not errorlevel 1 (
    echo [OK] Python 3.11 da ton tai!
    exit /b 0
)

echo [INFO] Python 3.11 chua duoc cai dat
echo.
echo Bat dau auto install...
echo.

call auto_install_python311.bat

echo.
echo ========================================
echo   KET QUA
echo ========================================
echo.

py -3.11 --version 2>nul
if not errorlevel 1 (
    echo [SUCCESS] Python 3.11 da duoc cai dat thanh cong!
    py -3.11 --version
    echo.
    echo Ban co the chay: run.bat
) else (
    python3.11 --version 2>nul
    if not errorlevel 1 (
        echo [SUCCESS] Python 3.11 da duoc cai dat thanh cong!
        python3.11 --version
        echo.
        echo Ban co the chay: run.bat
    ) else (
        echo [INFO] Vui long dong va mo lai CMD, sau do chay: run.bat
    )
)

echo.
pause
