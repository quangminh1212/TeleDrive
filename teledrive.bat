@echo off
setlocal enabledelayedexpansion

:: Xử lý tham số
set "mode=run"
if "%1"=="" goto :continue
if /i "%1"=="run" set "mode=run" & goto :continue
if /i "%1"=="dev" set "mode=dev" & goto :continue
if /i "%1"=="setup" set "mode=setup" & goto :continue
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
echo Cách sử dụng: teledrive.bat [tùy chọn]
echo.
echo Các tùy chọn:
echo   run    - Chạy ứng dụng (mặc định)
echo   dev    - Chạy ở chế độ development với nodemon
echo   setup  - Cài đặt dependencies
echo   help   - Hiển thị hướng dẫn này
echo.
exit /b 0

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

:: FUNCTIONS

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
  echo   teledrive run  - Chạy ứng dụng (hoặc chỉ gõ 'teledrive')
  echo   teledrive dev  - Chạy ở chế độ development
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