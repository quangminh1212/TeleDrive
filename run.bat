@echo off
echo === STARTING TELEDRIVE APPLICATION ===
echo.

:: Đảm bảo các thư mục cần thiết tồn tại
if not exist "data" mkdir data
if not exist "temp" mkdir temp
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "storage" mkdir storage
if not exist "db" mkdir db

:: Kiểm tra tệp .env tồn tại
if not exist ".env" (
  echo WARNING: .env file not found. Copying from .env.example...
  copy .env.example .env
  echo Please update the BOT_TOKEN in .env file before continuing.
  pause
)

:: Chạy ứng dụng
echo Starting TeleDrive on port 5002...
node index.js

:: Dừng lại khi kết thúc
pause 