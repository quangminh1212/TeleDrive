@echo off
title TeleDrive Docker

echo ===================================
echo    TELEDRIVE - DOCKER
echo ===================================
echo.

:: Kiểm tra xem Docker đã được cài đặt chưa
docker -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [CẢNH BÁO] Docker chưa được cài đặt.
  echo Vui lòng cài đặt Docker từ https://www.docker.com/products/docker-desktop
  echo.
  pause
  exit /b 1
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

:: Build Docker image
echo [THÔNG BÁO] Đang build Docker image...
docker build -t teledrive .

if %ERRORLEVEL% NEQ 0 (
  echo [LỖI] Không thể build Docker image.
  echo.
  pause
  exit /b 1
)

:: Chạy Docker container
echo [THÔNG BÁO] Đang khởi động container...

:: Dừng container cũ nếu đang chạy
docker stop teledrive-app >nul 2>&1
docker rm teledrive-app >nul 2>&1

:: Chạy container mới
docker run -d -p 3000:3000 --name teledrive-app ^
  -v "%cd%:/app" ^
  -v /app/node_modules ^
  --restart unless-stopped ^
  teledrive

if %ERRORLEVEL% NEQ 0 (
  echo [LỖI] Không thể chạy Docker container.
  echo.
  pause
  exit /b 1
)

echo.
echo [THÔNG BÁO] TeleDrive đã được khởi động trong Docker
echo [THÔNG BÁO] Server đang chạy tại http://localhost:3000
echo.

:: Mở trình duyệt
start http://localhost:3000
echo [THÔNG BÁO] Nhấn phím bất kỳ để xem logs...
pause >nul

:: Hiển thị logs
docker logs -f teledrive-app 