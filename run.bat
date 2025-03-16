@echo off
chcp 65001 > nul
echo ===== STARTING TELEDRIVE APPLICATION =====
echo.

:: Đảm bảo các thư mục cần thiết tồn tại
if not exist "data" mkdir data
if not exist "temp" mkdir temp
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "storage" mkdir storage
if not exist "db" mkdir db

:: Kiểm tra xem Node.js đã được cài đặt chưa
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Node.js khong duoc tim thay. Vui long cai dat Node.js truoc.
  pause
  exit /b
)

:: Kiểm tra tệp .env tồn tại và cập nhật BOT_TOKEN nếu cần
if not exist ".env" (
  echo Sao chep .env.example sang .env...
  copy .env.example .env
  echo Mo .env de cap nhat BOT_TOKEN...
  notepad .env
) else (
  :: Kiểm tra BOT_TOKEN chỉ khi nó chưa được cập nhật
  findstr /C:"BOT_TOKEN=your_telegram_bot_token" .env >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    echo BOT_TOKEN chua duoc cap nhat. Mo .env de cap nhat...
    notepad .env
  ) else (
    echo BOT_TOKEN da duoc cap nhat. Bo qua buoc nay.
  )
)

:: Kiểm tra node_modules và cài đặt nếu chưa có
if not exist "node_modules" (
  echo Cai dat dependencies...
  npm install
)

:: Kiểm tra và thiết lập cổng
set DEFAULT_PORT=5002
for /f "tokens=1,2 delims==" %%a in (.env) do (
  if "%%a"=="PORT" set PORT=%%b
)
if "%PORT%"=="" set PORT=%DEFAULT_PORT%

:: Tự động thay đổi cổng nếu đã được sử dụng
netstat -ano | findstr ":%PORT%" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  set PORT=3000
  echo Cong %DEFAULT_PORT% da duoc su dung. Su dung cong 3000 thay the.
)

:: Thiết lập biến môi trường
set "NODE_ENV=development"
set "SYNC_ON_START=true"

:: Khởi động ứng dụng với nodemon và đồng bộ
echo.
echo Khoi dong TeleDrive tren cong %PORT%...
echo Che do phat trien voi dong bo tu dong duoc kich hoat.

set PORT=%PORT% && npx nodemon index.js -- sync

:: Dừng lại khi kết thúc
echo.
echo TeleDrive da dung.
pause 