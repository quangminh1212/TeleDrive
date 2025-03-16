@echo off
chcp 65001 > nul
echo ===== STARTING TELEDRIVE APPLICATION =====
echo.

:: Kết thúc tất cả các tiến trình node.exe trước khi khởi động
echo Dang ket thuc cac tien trinh node.exe...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

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
  echo ERROR: Node.js khong duoc tim thay. Vui long cai dat Node.js truoc.
  pause
  exit /b
)

:: Kiểm tra tệp .env tồn tại
if not exist ".env" (
  echo Sao chep .env.example sang .env...
  copy .env.example .env
)

:: Kiểm tra node_modules và cài đặt nếu chưa có
if not exist "node_modules" (
  echo Cai dat dependencies...
  npm install
)

:: Chọn cổng tự động
set PORT=3000
echo Su dung cong %PORT%

:: Tạo tệp nodemon.json để tránh restart liên tục
echo Tao cau hinh nodemon...
echo {^
  "ignore": ["data/*", "uploads/*", "temp/*", "logs/*", "storage/*", "db/*"],^
  "delay": "2000"^
} > nodemon.json

:: Thiết lập biến môi trường
set "NODE_ENV=development"
set "SYNC_ON_START=true"

:: Khởi động ứng dụng với nodemon và đồng bộ
echo.
echo Khoi dong TeleDrive tren cong %PORT%...
echo Che do phat trien voi dong bo tu dong duoc kich hoat.

set PORT=%PORT% && npx nodemon --ignore "data/" --ignore "uploads/" --ignore "temp/" --ignore "logs/" --ignore "storage/" --ignore "db/" index.js

:: Dừng lại khi kết thúc
echo.
echo TeleDrive da dung.
pause 