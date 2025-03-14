@echo off
setlocal enabledelayedexpansion

REM TeleDrive Test - Script chạy ứng dụng test
REM Phiên bản tối ưu

title TeleDrive Test

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
  call npm install express ejs dotenv
  if %errorlevel% neq 0 (
    echo [LỖI] Không thể cài đặt các gói phụ thuộc!
    pause
    exit /b 1
  )
)

REM Đảm bảo thư mục tồn tại
if not exist public mkdir public
if not exist temp mkdir temp
if not exist data mkdir data
if not exist logs mkdir logs

echo ===============================
echo       TeleDrive Test
echo ===============================
echo.
echo Đang khởi động TeleDrive Test...
echo.

REM Chạy trực tiếp file test
node index-test.js

pause
endlocal 