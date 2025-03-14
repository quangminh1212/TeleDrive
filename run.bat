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
call npm install
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
  )
)

REM Đảm bảo thư mục tồn tại
if not exist uploads mkdir uploads
if not exist temp mkdir temp
if not exist data mkdir data
if not exist logs mkdir logs
if not exist storage mkdir storage
if not exist public mkdir public
if not exist public\css mkdir public\css
if not exist public\js mkdir public\js

echo ===============================
echo       TeleDrive - Khởi động
echo ===============================
echo.
echo Đang khởi động TeleDrive...
echo.

REM Chạy ứng dụng
npm run dev

pause
endlocal 