@echo off
echo =================================
echo TeleDrive - Ung dung quan ly file
echo =================================
echo.
echo Dang khoi dong ung dung TeleDrive...
echo.

REM Kiem tra xem Node.js da duoc cai dat chua
WHERE node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Loi: Node.js chua duoc cai dat
    echo Vui long cai dat Node.js tu https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Kiem tra xem thu muc node_modules co ton tai khong
IF NOT EXIST node_modules (
    echo Dang cai dat cac phu thuoc...
    npm install
    IF %ERRORLEVEL% NEQ 0 (
        echo Loi: Khong the cai dat cac phu thuoc
        pause
        exit /b 1
    )
)

REM Kiem tra file .env
IF NOT EXIST .env (
    echo Canh bao: Khong tim thay file .env
    echo Tao file .env mac dinh...
    copy .env.example .env >nul 2>nul
    IF %ERRORLEVEL% NEQ 0 (
        echo Khong the tao file .env
        echo Vui long tao file .env thu cong
    ) ELSE (
        echo Da tao file .env mac dinh
        echo Vui long chinh sua file .env de cau hinh ung dung
    )
    echo.
)

REM Tao cac thu muc can thiet
mkdir storage 2>nul
mkdir storage\db 2>nul
mkdir storage\uploads 2>nul
mkdir storage\temp 2>nul

echo Dang chay ung dung TeleDrive...
echo Truy cap ung dung tai: http://localhost:5002
echo Su dung Ctrl+C de dung ung dung
echo.

node index.js

pause 