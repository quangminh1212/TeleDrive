@echo off
setlocal enabledelayedexpansion

REM TeleDrive - Script chạy ứng dụng
REM Phiên bản tối ưu

title TeleDrive

REM Kiểm tra Node.js
echo Đang kiểm tra Node.js...
node --version > nul 2>&1
if %errorlevel% neq 0 (
  echo [LỖI] Node.js chưa được cài đặt!
  echo Vui lòng cài đặt Node.js từ https://nodejs.org/
  pause
  exit /b 1
)

REM Kiểm tra các gói npm
if not exist node_modules (
  echo Đang cài đặt các gói phụ thuộc...
  call npm install
  if %errorlevel% neq 0 (
    echo [LỖI] Không thể cài đặt các gói phụ thuộc!
    pause
    exit /b 1
  )
)

REM Kiểm tra file .env
if not exist .env (
  if exist .env.example (
    echo Đang tạo file .env từ .env.example...
    copy .env.example .env
    echo [CẢNH BÁO] Vui lòng chỉnh sửa file .env để cấu hình BOT_TOKEN.
  ) else (
    echo [LỖI] Không tìm thấy file .env hoặc .env.example!
    echo Vui lòng tạo file .env với nội dung:
    echo BOT_TOKEN=your_telegram_bot_token
    echo PORT=3010
    echo MAX_FILE_SIZE=20971520
    echo TEMP_DIR=temp
    echo DATA_DIR=data
    pause
    exit /b 1
  )
)

REM Đảm bảo thư mục tồn tại
if not exist uploads mkdir uploads
if not exist temp mkdir temp
if not exist data mkdir data
if not exist logs mkdir logs

echo ===============================
echo       TeleDrive - Khởi động
echo ===============================
echo.
echo Đang khởi động TeleDrive...
echo.

REM Chạy trực tiếp lựa chọn 1
node index.js

pause
endlocal 