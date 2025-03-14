@echo off
echo TeleDrive - Ung dung luu tru file thong qua Telegram
echo ===================================================
echo.

REM Kiem tra xem Node.js da duoc cai dat chua
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Loi: Node.js chua duoc cai dat. Vui long cai dat Node.js truoc khi chay ung dung.
    echo Tai Node.js tai: https://nodejs.org/
    pause
    exit /b
)

REM Kiem tra xem cac goi phu thuoc da duoc cai dat chua
if not exist node_modules (
    echo Dang cai dat cac goi phu thuoc...
    call npm install
    echo.
)

REM Kiem tra xem cac thu muc can thiet da ton tai chua
if not exist uploads mkdir uploads
if not exist temp mkdir temp
if not exist data mkdir data
if not exist storage mkdir storage
if not exist logs mkdir logs

REM Kiem tra xem file .env da ton tai chua
if not exist .env (
    echo Dang tao file .env...
    echo # Server Configuration > .env
    echo PORT=5002 >> .env
    echo NODE_ENV=development >> .env
    echo. >> .env
    echo # Telegram API Credentials >> .env
    echo # Ban can dang ky tai https://my.telegram.org de lay API_ID va API_HASH >> .env
    echo API_ID=your_api_id >> .env
    echo API_HASH=your_api_hash >> .env
    echo. >> .env
    echo # Cau hinh luu tru >> .env
    echo STORAGE_PATH=./storage >> .env
    echo MAX_FILE_SIZE=2000 >> .env
    echo. >> .env
    echo # Telegram Bot Token (neu su dung bot) >> .env
    echo BOT_TOKEN= >> .env
    echo. >> .env
    echo # Thu muc luu tru tam thoi >> .env
    echo TEMP_DIR=temp >> .env
    echo DATA_DIR=data >> .env
    echo.
    echo Da tao file .env. Vui long cap nhat cac thong tin can thiet trong file nay.
    echo.
)

echo Dang khoi dong ung dung TeleDrive...
echo.
echo Truy cap ung dung tai: http://localhost:5002
echo.
echo Nhan Ctrl+C de dung ung dung
echo.

node index.js 