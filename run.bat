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
echo Đang cài đặt/cập nhật các gói phụ thuộc...
call npm install express ejs dotenv telegraf axios multer uuid crypto fs-extra path child_process morgan helmet cors
if %errorlevel% neq 0 (
  echo [CẢNH BÁO] Một số gói không thể cài đặt, nhưng ứng dụng vẫn có thể chạy.
)

REM Kiểm tra file .env
if not exist .env (
  if exist .env.example (
    echo Đang tạo file .env từ .env.example...
    copy .env.example .env
    echo [CẢNH BÁO] Vui lòng chỉnh sửa file .env để cấu hình BOT_TOKEN.
  ) else (
    echo [CẢNH BÁO] Không tìm thấy file .env hoặc .env.example!
    echo # Server Configuration > .env
    echo PORT=5000 >> .env
    echo NODE_ENV=development >> .env
    echo. >> .env
    echo # Telegram API Credentials >> .env
    echo API_ID=123456 >> .env
    echo API_HASH=abcdef1234567890abcdef1234567890 >> .env
    echo. >> .env
    echo # BOT Token >> .env
    echo BOT_TOKEN=your_telegram_bot_token >> .env
    echo. >> .env
    echo # Cấu hình lưu trữ >> .env
    echo STORAGE_PATH=./storage >> .env
    echo MAX_FILE_SIZE=2000 >> .env
    echo. >> .env
    echo # Thư mục lưu trữ tạm thời >> .env
    echo TEMP_DIR=temp >> .env
    echo DATA_DIR=data >> .env
    echo [CẢNH BÁO] Đã tạo file .env mặc định. Vui lòng chỉnh sửa để cấu hình đúng.
  )
)

REM Đảm bảo thư mục tồn tại
if not exist uploads mkdir uploads
if not exist temp mkdir temp
if not exist data mkdir data
if not exist logs mkdir logs
if not exist storage mkdir storage
if not exist public mkdir public

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