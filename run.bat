@echo off
echo Khoi dong TeleDrive...
echo.

:: Kiem tra xem Node.js da duoc cai dat chua
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Loi: Node.js chua duoc cai dat.
  echo Vui long cai dat Node.js tu https://nodejs.org/
  echo.
  pause
  exit /b
)

:: Kiem tra xem cac thu muc can thiet co ton tai khong
if not exist uploads mkdir uploads
if not exist temp mkdir temp
if not exist data mkdir data
if not exist db mkdir db
if not exist logs mkdir logs

:: Kiem tra xem file .env co ton tai khong
if not exist .env (
  echo Loi: File .env khong ton tai.
  echo Vui long tao file .env tu .env.example
  echo.
  pause
  exit /b
)

:: Kiem tra xem cac goi phu thuoc da duoc cai dat chua
if not exist node_modules (
  echo Cai dat cac goi phu thuoc...
  npm install
)

:: Khoi dong ung dung
echo Khoi dong ung dung...
echo.
echo Truy cap ung dung tai: http://localhost:5002
echo.
echo Nhan Ctrl+C de dung ung dung
echo.
node index.js 