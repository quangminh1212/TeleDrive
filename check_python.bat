@echo off
echo.
echo ========================================
echo   Kiem tra Python versions
echo ========================================
echo.

echo Python hien tai:
python --version 2>&1
echo.

echo Kiem tra Python 3.11:
py -3.11 --version 2>nul
if errorlevel 1 (
    python3.11 --version 2>nul
    if errorlevel 1 (
        echo [X] Khong tim thay Python 3.11
        echo.
        echo De cai dat Python 3.11, chay:
        echo   install_python311.bat
    ) else (
        echo [OK] Tim thay python3.11
    )
) else (
    echo [OK] Tim thay Python 3.11 qua py launcher
)

echo.
echo Kiem tra Python 3.12:
py -3.12 --version 2>nul
if errorlevel 1 (
    python3.12 --version 2>nul
    if errorlevel 1 (
        echo [X] Khong tim thay Python 3.12
    ) else (
        echo [OK] Tim thay python3.12
    )
) else (
    echo [OK] Tim thay Python 3.12 qua py launcher
)

echo.
echo Kiem tra Python 3.13:
py -3.13 --version 2>nul
if errorlevel 1 (
    python3.13 --version 2>nul
    if errorlevel 1 (
        echo [X] Khong tim thay Python 3.13
    ) else (
        echo [OK] Tim thay python3.13
    )
) else (
    echo [OK] Tim thay Python 3.13 qua py launcher
)

echo.
echo Kiem tra Python 3.14:
py -3.14 --version 2>nul
if errorlevel 1 (
    python3.14 --version 2>nul
    if errorlevel 1 (
        echo [X] Khong tim thay Python 3.14
    ) else (
        echo [OK] Tim thay python3.14
    )
) else (
    echo [OK] Tim thay Python 3.14 qua py launcher
)

echo.
echo ========================================
echo   Khuyến nghị
echo ========================================
echo.
echo Python 3.11 hoac 3.12: Tuong thich tot nhat
echo Python 3.13: Co the gap mot so loi
echo Python 3.14: Nhieu package chua ho tro
echo.
echo De cai dat Python 3.11:
echo   install_python311.bat
echo.
echo De setup du an voi Python 3.11:
echo   setup_python311.bat
echo.
pause
