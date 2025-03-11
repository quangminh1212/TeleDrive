@echo off
title TeleDrive Development Mode

echo ===================================
echo    TELEDRIVE - CHẾ ĐỘ DEVELOPMENT
echo ===================================
echo.

:: Kiểm tra xem Node.js đã được cài đặt chưa
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [CẢNH BÁO] Node.js chưa được cài đặt.
  echo Vui lòng cài đặt Node.js từ https://nodejs.org/
  echo.
  pause
  exit /b 1
)

:: Kiểm tra xem có thư mục node_modules chưa
if not exist node_modules (
  echo [THÔNG BÁO] Cài đặt các dependencies...
  echo.
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Không thể cài đặt dependencies.
    echo.
    pause
    exit /b 1
  )
  echo.
)

:: Cài đặt nodemon nếu chưa có
npx -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [THÔNG BÁO] Cài đặt nodemon...
  call npm install -g nodemon
  if %ERRORLEVEL% NEQ 0 (
    echo [CẢNH BÁO] Không thể cài đặt nodemon global. Sẽ sử dụng npx.
  )
)

:: Kiểm tra .env
if not exist .env (
  echo [THÔNG BÁO] Tạo file .env từ mẫu...
  echo PORT=3000 > .env
  echo NODE_ENV=development >> .env
  echo. >> .env
  echo # Telegram Bot token - Thay thế bằng token thực tế của bạn >> .env
  echo BOT_TOKEN= >> .env
  echo. >> .env
  echo # Telegram API credentials >> .env
  echo TELEGRAM_API_ID= >> .env
  echo TELEGRAM_API_HASH= >> .env
  echo. >> .env
  echo # Telegram chat/channel ID to store files >> .env
  echo TELEGRAM_CHAT_ID= >> .env
  
  echo [THÔNG BÁO] File .env đã được tạo. Vui lòng cập nhật thông tin Telegram Bot của bạn.
  echo.
)

:: Tạo thư mục uploads nếu chưa có
if not exist uploads mkdir uploads

:: Chạy server
echo [THÔNG BÁO] Đang khởi động TeleDrive ở chế độ development...
echo.
echo [THÔNG BÁO] Server đang chạy tại http://localhost:3000
echo [THÔNG BÁO] Mở trình duyệt và truy cập http://localhost:3000
echo [THÔNG BÁO] Server sẽ tự động khởi động lại khi có thay đổi ở file code
echo [THÔNG BÁO] Nhấn Ctrl+C để dừng server
echo.

start http://localhost:3000

:: Chạy ứng dụng ở chế độ development
npm run dev 