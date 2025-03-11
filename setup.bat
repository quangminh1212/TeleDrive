@echo off
title TeleDrive Setup

echo ===================================
echo    CÀI ĐẶT TELEDRIVE
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

:: Tạo .env nếu chưa tồn tại
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

:: Cài đặt dependencies
echo [THÔNG BÁO] Đang cài đặt các dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo [LỖI] Không thể cài đặt dependencies.
  echo.
  pause
  exit /b 1
)

:: Tạo thư mục uploads
if not exist uploads mkdir uploads

echo.
echo [THÔNG BÁO] Cài đặt hoàn tất. Bạn có thể chạy ứng dụng bằng các cách:
echo   1. Chạy trực tiếp: start-teledrive.bat
echo   2. Chạy với chế độ development: dev.bat
echo   3. Chạy với Docker: docker-start.bat
echo.
echo [THÔNG BÁO] Trước khi chạy, hãy cập nhật thông tin Telegram Bot của bạn trong file .env
echo.
pause 