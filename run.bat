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
  echo ERROR: Node.js không được tìm thấy. Vui lòng cài đặt Node.js trước.
  pause
  exit /b
)

:: Kiểm tra tệp .env tồn tại
if not exist ".env" (
  echo WARNING: Tệp .env không tìm thấy. Sao chép từ .env.example...
  copy .env.example .env
  echo Vui lòng cập nhật BOT_TOKEN trong tệp .env trước khi tiếp tục.
  notepad .env
)

:: Kiểm tra node_modules và cài đặt nếu chưa có
if not exist "node_modules" (
  echo Installing dependencies...
  npm install
)

:: Kiểm tra cổng trong .env
set DEFAULT_PORT=5002
for /f "tokens=1,2 delims==" %%a in (.env) do (
  if "%%a"=="PORT" set PORT=%%b
)
if "%PORT%"=="" set PORT=%DEFAULT_PORT%

:: Kiểm tra nếu cổng đã được sử dụng
netstat -ano | findstr ":%PORT%" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo WARNING: Cổng %PORT% đã được sử dụng.
  set /p use_custom_port="Bạn có muốn sử dụng cổng khác không? (y/n, mặc định y): "
  
  if not "%use_custom_port%"=="n" (
    set /p custom_port="Nhập cổng mới (mặc định 3000): "
    if "%custom_port%"=="" set custom_port=3000
    echo Sẽ sử dụng cổng %custom_port% thay vì %PORT%
    set PORT=%custom_port%
  )
)

:: Kiểm tra ngõ vào người dùng về chế độ
echo Chọn chế độ chạy:
echo 1. Chế độ phát triển (development) - sử dụng nodemon, tự động khởi động lại khi có thay đổi
echo 2. Chế độ sản xuất (production) - chạy ứng dụng thông thường
echo.
set /p mode="Nhập lựa chọn của bạn (1 hoặc 2, mặc định 1): "

:: Thiết lập biến môi trường PORT
set "NODE_ENV=development"
if "%mode%"=="2" set "NODE_ENV=production"

:: Khởi động ứng dụng với cổng đã chọn
echo.
echo Khởi động TeleDrive trên cổng %PORT%...

if "%mode%"=="2" (
  echo Chế độ sản xuất được chọn.
  set PORT=%PORT% && node index.js
) else (
  echo Chế độ phát triển được chọn. Ứng dụng sẽ tự động khởi động lại khi có thay đổi.
  set PORT=%PORT% && npx nodemon index.js
)

:: Dừng lại khi kết thúc
echo.
echo TeleDrive đã dừng.
pause 