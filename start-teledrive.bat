@echo off
title TeleDrive - Cloud Storage with Telegram

echo ===================================
echo    KHỞI ĐỘNG TELEDRIVE
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
echo [THÔNG BÁO] Đang khởi động TeleDrive...
echo.
echo [THÔNG BÁO] Server đang chạy tại http://localhost:3000
echo [THÔNG BÁO] Mở trình duyệt và truy cập http://localhost:3000
echo [THÔNG BÁO] Nhấn Ctrl+C để dừng server
echo.

start http://localhost:3000

:: Chạy ứng dụng
npm start 