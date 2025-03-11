@echo off
setlocal enabledelayedexpansion

:: Xử lý tham số
set "action=start"
if "%1"=="" goto :continue
if /i "%1"=="start" set "action=start" & goto :continue
if /i "%1"=="stop" set "action=stop" & goto :continue
if /i "%1"=="restart" set "action=restart" & goto :continue
if /i "%1"=="logs" set "action=logs" & goto :continue
if /i "%1"=="help" goto :help
if /i "%1"=="-h" goto :help
if /i "%1"=="--help" goto :help
echo [LỖI] Tham số không hợp lệ: %1
goto :help

:help
echo ===================================
echo    TELEDRIVE DOCKER - HƯỚNG DẪN
echo ===================================
echo.
echo Cách sử dụng: docker.bat [tùy chọn]
echo.
echo Các tùy chọn:
echo   start   - Khởi động Docker container (mặc định)
echo   stop    - Dừng và xóa Docker container
echo   restart - Khởi động lại Docker container
echo   logs    - Hiển thị logs của container
echo   help    - Hiển thị hướng dẫn này
echo.
exit /b 0

:continue
title TeleDrive Docker - %action%

:: Kiểm tra xem Docker đã được cài đặt chưa
docker -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [CẢNH BÁO] Docker chưa được cài đặt.
  echo Vui lòng cài đặt Docker từ https://www.docker.com/products/docker-desktop
  echo.
  pause
  exit /b 1
)

:: Phân nhánh theo action
if "%action%"=="start" goto :start
if "%action%"=="stop" goto :stop
if "%action%"=="restart" goto :restart
if "%action%"=="logs" goto :logs

:restart
echo ===================================
echo    KHỞI ĐỘNG LẠI CONTAINER
echo ===================================
echo.
call :stop
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%
goto :start

:stop
echo ===================================
echo    DỪNG CONTAINER
echo ===================================
echo.

:: Kiểm tra xem container có tồn tại không
docker ps -a | findstr teledrive-app >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [THÔNG BÁO] Container teledrive-app không tồn tại.
  exit /b 0
)

:: Dừng container
echo [THÔNG BÁO] Đang dừng container teledrive-app...
docker stop teledrive-app
if %ERRORLEVEL% NEQ 0 (
  echo [LỖI] Không thể dừng container.
  pause
  exit /b 1
)

:: Xóa container
echo [THÔNG BÁO] Đang xóa container teledrive-app...
docker rm teledrive-app
if %ERRORLEVEL% NEQ 0 (
  echo [LỖI] Không thể xóa container.
  pause
  exit /b 1
)

echo [THÔNG BÁO] Container đã được dừng và xóa thành công.
if "%action%"=="stop" (
  pause
)
exit /b 0

:start
echo ===================================
echo    KHỞI ĐỘNG CONTAINER
echo ===================================
echo.

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
  pause
  exit /b 1
)

echo.
echo [THÔNG BÁO] TeleDrive đã được khởi động trong Docker
echo [THÔNG BÁO] Server đang chạy tại http://localhost:3000
echo.

:: Mở trình duyệt
start http://localhost:3000

echo [THÔNG BÁO] Nhấn phím bất kỳ để xem logs, hoặc đóng cửa sổ này để tiếp tục chạy ở nền...
pause >nul
goto :logs

:logs
echo ===================================
echo    XEM LOGS CONTAINER
echo ===================================
echo.
echo [THÔNG BÁO] Đang hiển thị logs của container teledrive-app...
echo [THÔNG BÁO] Nhấn Ctrl+C để thoát.
echo.
docker logs -f teledrive-app
exit /b 0

call runapp docker start 