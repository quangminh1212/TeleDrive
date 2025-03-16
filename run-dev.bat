@echo off
echo =================================
echo TeleDrive - Che do phat trien
echo =================================
echo.
echo Dang khoi dong TeleDrive o che do phat trien...
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

REM Kiem tra va cai dat nodemon neu can
WHERE nodemon >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Dang cai dat nodemon...
    npm install -g nodemon
    IF %ERRORLEVEL% NEQ 0 (
        echo Loi: Khong the cai dat nodemon
        echo Dang thu cai dat nodemon trong thu muc du an...
        npm install --save-dev nodemon
        IF %ERRORLEVEL% NEQ 0 (
            echo Loi: Khong the cai dat nodemon
            pause
            exit /b 1
        )
    )
)

REM Tao cac thu muc can thiet
mkdir storage 2>nul
mkdir storage\db 2>nul
mkdir storage\uploads 2>nul
mkdir storage\temp 2>nul

echo Dang chay TeleDrive o che do phat trien...
echo Truy cap ung dung tai: http://localhost:5002
echo Server se tu dong khoi dong lai khi co thay doi
echo Su dung Ctrl+C de dung ung dung
echo.

nodemon index.js

pause 