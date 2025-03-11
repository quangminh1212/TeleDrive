@echo off
setlocal enabledelayedexpansion

:: Xử lý tham số
set "mode=run"

if "%1"=="" goto :help
if /i "%1"=="run" set "mode=run" & goto :continue
if /i "%1"=="dev" set "mode=dev" & goto :continue
if /i "%1"=="setup" set "mode=setup" & goto :continue

if /i "%1"=="docker" (
  if "%2"=="" (
    set "docker_action=start"
  ) else (
    set "docker_action=%2"
  )
  goto :docker_handler
)

if /i "%1"=="help" goto :help
if /i "%1"=="-h" goto :help
if /i "%1"=="--help" goto :help

echo [LỖI] Tham số không hợp lệ: %1
goto :help

:help
echo ===================================
echo    TELEDRIVE - HƯỚNG DẪN SỬ DỤNG
echo ===================================
echo.
echo Cách sử dụng: runapp [lệnh] [tùy chọn]
echo.
echo Các lệnh Node.js:
echo   run           - Chạy ứng dụng (mặc định)
echo   dev           - Chạy ở chế độ development với nodemon
echo   setup         - Cài đặt dependencies
echo.
echo Các lệnh Docker:
echo   docker start  - Khởi động Docker container
echo   docker stop   - Dừng và xóa Docker container
echo   docker restart- Khởi động lại Docker container
echo   docker logs   - Hiển thị logs của container
echo.
echo   help          - Hiển thị hướng dẫn này
echo.
exit /b 0

:docker_handler
:: Xử lý các lệnh Docker
if /i "%docker_action%"=="start" goto :docker_start
if /i "%docker_action%"=="stop" goto :docker_stop
if /i "%docker_action%"=="restart" goto :docker_restart
if /i "%docker_action%"=="logs" goto :docker_logs
echo [LỖI] Tham số Docker không hợp lệ: %docker_action%
goto :help

:continue
title TeleDrive - %mode% mode

echo ===================================
echo    TELEDRIVE - %mode% MODE
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

:: Kiểm tra và tạo file .env nếu chưa có
if not exist .env (
  call :create_env
)

:: Nếu chỉ cài đặt, thực hiện và thoát
if "%mode%"=="setup" (
  goto :setup
)

:: Kiểm tra xem có thư mục node_modules chưa
if not exist node_modules (
  echo [THÔNG BÁO] Các dependencies chưa được cài đặt. Đang chạy setup...
  call :setup
)

:: Tạo thư mục uploads nếu chưa có
if not exist uploads mkdir uploads

:: Chạy theo mode khác nhau
if "%mode%"=="dev" (
  goto :run_dev
) else (
  goto :run_normal
)

:: FUNCTIONS FOR NODE.JS MODE

:setup
echo [THÔNG BÁO] Đang cài đặt các dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo [LỖI] Không thể cài đặt dependencies.
  echo.
  pause
  exit /b 1
)

:: Nếu là mode setup đơn thuần thì thông báo và thoát
if "%mode%"=="setup" (
  echo.
  echo [THÔNG BÁO] Cài đặt hoàn tất. Bạn có thể chạy ứng dụng bằng các lệnh:
  echo   runapp run           - Chạy ứng dụng
  echo   runapp dev           - Chạy ở chế độ development
  echo   runapp docker start  - Chạy với Docker
  echo.
  echo [THÔNG BÁO] Vui lòng cập nhật thông tin Telegram Bot của bạn trong file .env
  echo.
  pause
  exit /b 0
)
goto :eof

:run_normal
echo [THÔNG BÁO] Đang khởi động TeleDrive...
echo.
echo [THÔNG BÁO] Server đang chạy tại http://localhost:3000
echo [THÔNG BÁO] Mở trình duyệt và truy cập http://localhost:3000
echo [THÔNG BÁO] Nhấn Ctrl+C để dừng server
echo.

start http://localhost:3000
npm start
goto :eof

:run_dev
echo [THÔNG BÁO] Đang khởi động TeleDrive ở chế độ development...
echo.

:: Kiểm tra nodemon
call npx nodemon -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [THÔNG BÁO] Cài đặt nodemon...
  call npm install -D nodemon
  if %ERRORLEVEL% NEQ 0 (
    echo [CẢNH BÁO] Không thể cài đặt nodemon. Thử lại với npm global...
    call npm install -g nodemon
    if %ERRORLEVEL% NEQ 0 (
      echo [LỖI] Không thể cài đặt nodemon. Vui lòng thử cài đặt thủ công.
      echo npm install -g nodemon
      pause
      exit /b 1
    )
  )
)

echo [THÔNG BÁO] Server đang chạy tại http://localhost:3000
echo [THÔNG BÁO] Mở trình duyệt và truy cập http://localhost:3000
echo [THÔNG BÁO] Server sẽ tự động khởi động lại khi có thay đổi ở file code
echo [THÔNG BÁO] Nhấn Ctrl+C để dừng server
echo.

start http://localhost:3000
npm run dev
goto :eof

:: FUNCTIONS FOR DOCKER MODE

:docker_restart
echo ===================================
echo    KHỞI ĐỘNG LẠI CONTAINER
echo ===================================
echo.
call :docker_stop
if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%
goto :docker_start

:docker_stop
echo ===================================
echo    DỪNG CONTAINER
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
if /i "%docker_action%"=="stop" (
  pause
)
exit /b 0

:docker_start
echo ===================================
echo    KHỞI ĐỘNG CONTAINER
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
  call :create_env
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
goto :docker_logs

:docker_logs
echo ===================================
echo    XEM LOGS CONTAINER
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

echo [THÔNG BÁO] Đang hiển thị logs của container teledrive-app...
echo [THÔNG BÁO] Nhấn Ctrl+C để thoát.
echo.
docker logs -f teledrive-app
exit /b 0

:create_env
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
goto :eof 