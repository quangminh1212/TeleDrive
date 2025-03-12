@echo off
setlocal enabledelayedexpansion

:: Xử lý tham số
set "mode=run"

if "%1"=="" goto :help
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
echo Cách sử dụng: runapp [lệnh]
echo.
echo Các lệnh:
echo   run           - Chạy ứng dụng (mặc định)
echo   dev           - Chạy ở chế độ development với nodemon
echo   setup         - Cài đặt dependencies
echo   help          - Hiển thị hướng dẫn này
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

:setup
echo ===================================
echo    CÀI ĐẶT DEPENDENCIES
echo ===================================
echo.

:: Cài đặt dependencies
echo [THÔNG BÁO] Đang cài đặt các dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo [LỖI] Không thể cài đặt dependencies.
  pause
  exit /b 1
)

echo.
echo [THÔNG BÁO] Đã cài đặt dependencies thành công.
if "%mode%"=="setup" (
  pause
  exit /b 0
)
exit /b 0

:run_dev
echo ===================================
echo    KHỞI ĐỘNG CHẾ ĐỘ DEVELOPMENT
echo ===================================
echo.

:: Tìm và dừng tất cả các tiến trình đang sử dụng cổng 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Đang dừng tiến trình với PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Kiểm tra xem nodemon có được cài đặt hay không
call npx nodemon -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [THÔNG BÁO] Nodemon chưa được cài đặt. Đang cài đặt...
  call npm install nodemon --save-dev
  if %ERRORLEVEL% NEQ 0 (
    echo [CẢNH BÁO] Không thể cài đặt nodemon. Sử dụng chế độ thông thường thay thế.
    goto :run_normal
  )
)

:: Khởi động server với nodemon
echo [THÔNG BÁO] Đang khởi động server với nodemon...
start /B cmd /c "npx nodemon server.js"

:: Đợi server khởi động
echo [THÔNG BÁO] Đợi server khởi động...
timeout /t 3 /nobreak > nul

:: Mở URL trong trình duyệt mặc định
echo [THÔNG BÁO] Đang mở trình duyệt...
start "" http://localhost:3000

echo.
echo [THÔNG BÁO] Server đang chạy ở chế độ development tại http://localhost:3000
echo Để dừng server, đóng cửa sổ cmd này hoặc nhấn Ctrl+C.
echo.
pause
exit /b 0

:run_normal
echo ===================================
echo    KHỞI ĐỘNG ỨNG DỤNG
echo ===================================
echo.

:: Tìm và dừng tất cả các tiến trình đang sử dụng cổng 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Đang dừng tiến trình với PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Khởi động server Node.js
echo [THÔNG BÁO] Đang khởi động server...
start /B cmd /c "node server.js"

:: Đợi server khởi động
echo [THÔNG BÁO] Đợi server khởi động...
timeout /t 3 /nobreak > nul

:: Mở URL trong trình duyệt mặc định
echo [THÔNG BÁO] Đang mở trình duyệt...
start "" http://localhost:3000

echo.
echo [THÔNG BÁO] Server đang chạy tại http://localhost:3000
echo Để dừng server, đóng cửa sổ cmd này hoặc nhấn Ctrl+C.
echo.
pause
exit /b 0

:create_env
echo ===================================
echo    TẠO FILE CẤU HÌNH
echo ===================================
echo.

:: Kiểm tra file .env.example tồn tại
if not exist .env.example (
  echo [LỖI] Không tìm thấy file .env.example
  pause
  exit /b 1
)

:: Tạo file .env từ .env.example
echo [THÔNG BÁO] Đang tạo file .env từ mẫu...
copy .env.example .env >nul
if %ERRORLEVEL% NEQ 0 (
  echo [LỖI] Không thể tạo file .env
  pause
  exit /b 1
)

echo [THÔNG BÁO] Đã tạo file .env thành công.
echo.
echo [THÔNG BÁO] Vui lòng chỉnh sửa file .env để cấu hình ứng dụng.
echo.
exit /b 0 