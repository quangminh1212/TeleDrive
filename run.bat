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
echo 1. Chạy TeleDrive với bot
echo 2. Chạy TeleDrive không có bot
echo 3. Dọn dẹp uploads (Gửi file lên Telegram)
echo 4. Chạy với proxy (nếu có vấn đề kết nối)
echo 5. Thoát
echo.

set /p choice=Chọn một tùy chọn (1-5): 

if "%choice%"=="1" (
  cls
  echo Đang khởi động TeleDrive...
  node index.js
) else if "%choice%"=="2" (
  cls
  echo Đang khởi động TeleDrive (không có bot)...
  node index.js no-bot
) else if "%choice%"=="3" (
  cls
  echo Đang dọn dẹp uploads...
  node index.js clean
) else if "%choice%"=="4" (
  cls
  echo Chọn loại proxy:
  echo 1. Free Telegram proxy (https://api.telegram.org)
  echo 2. Nhập địa chỉ proxy tùy chỉnh
  echo.
  set /p proxy_choice=Chọn một tùy chọn (1-2): 
  
  if "!proxy_choice!"=="1" (
    echo Đang khởi động với proxy mặc định...
    node index.js --proxy https://api.telegram.org
  ) else if "!proxy_choice!"=="2" (
    set /p custom_proxy=Nhập địa chỉ proxy (ví dụ: https://your-proxy.com): 
    echo Đang khởi động với proxy tùy chỉnh...
    node index.js --proxy !custom_proxy!
  ) else (
    echo Lựa chọn không hợp lệ!
    timeout /t 2 > nul
    cls
    call %0
  )
) else if "%choice%"=="5" (
  exit /b 0
) else (
  echo Lựa chọn không hợp lệ!
  timeout /t 2 > nul
  cls
  call %0
)

pause
endlocal 