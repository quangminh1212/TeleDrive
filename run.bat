@echo off
echo ===== STARTING TELEDRIVE APPLICATION =====
echo.

:: Đảm bảo các thư mục cần thiết tồn tại
if not exist "data" mkdir data
if not exist "temp" mkdir temp
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "storage" mkdir storage
if not exist "db" mkdir db

:: Kiểm tra xem Node.js đã được cài đặt chưa
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Node.js không được tìm thấy. Vui lòng cài đặt Node.js trước.
  pause
  exit /b
)

:: Kiểm tra tệp .env tồn tại
if not exist ".env" (
  echo WARNING: Tệp .env không tìm thấy. Sao chép từ .env.example...
  copy .env.example .env
  echo Vui lòng cập nhật BOT_TOKEN trong tệp .env trước khi tiếp tục.
  notepad .env
)

:: Kiểm tra node_modules và cài đặt nếu chưa có
if not exist "node_modules" (
  echo Installing dependencies...
  npm install
)

:: Kiểm tra ngõ vào người dùng về chế độ
echo Chọn chế độ chạy:
echo 1. Chế độ phát triển (development) - sử dụng nodemon, tự động khởi động lại khi có thay đổi
echo 2. Chế độ sản xuất (production) - chạy ứng dụng thông thường
echo.
set /p mode="Nhập lựa chọn của bạn (1 hoặc 2, mặc định 1): "

if "%mode%"=="2" (
  echo.
  echo Khởi động TeleDrive ở chế độ sản xuất...
  node index.js
) else (
  echo.
  echo Khởi động TeleDrive ở chế độ phát triển với nodemon...
  echo Ứng dụng sẽ tự động khởi động lại khi có thay đổi mã nguồn.
  npx nodemon index.js
)

:: Dừng lại khi kết thúc
echo.
echo TeleDrive đã dừng.
pause 