@echo off
chcp 65001 > nul
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
  echo ERROR: Node.js khong duoc tim thay. Vui long cai dat Node.js truoc.
  pause
  exit /b
)

:: Kiểm tra tệp .env tồn tại
if not exist ".env" (
  echo WARNING: Tep .env khong tim thay. Sao chep tu .env.example...
  copy .env.example .env
  echo Vui long cap nhat BOT_TOKEN trong tep .env truoc khi tiep tuc.
  notepad .env
) else (
  :: Kiểm tra BOT_TOKEN trong .env
  findstr /C:"BOT_TOKEN=your_telegram_bot_token" .env >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    echo WARNING: BOT_TOKEN chua duoc cau hinh trong .env
    echo Ban can cap nhat BOT_TOKEN de su dung day du tinh nang
    set /p update_token="Nhap 'y' de cap nhat ngay, bat ky phim nao khac de bo qua: "
    if /i "%update_token%"=="y" (
      notepad .env
    )
  )
)

:: Kiểm tra node_modules và cài đặt nếu chưa có
if not exist "node_modules" (
  echo Installing dependencies...
  npm install
)

:: Kiểm tra cổng trong .env
set DEFAULT_PORT=5002
for /f "tokens=1,2 delims==" %%a in (.env) do (
  if "%%a"=="PORT" set PORT=%%b
)
if "%PORT%"=="" set PORT=%DEFAULT_PORT%

:: Kiểm tra nếu cổng đã được sử dụng
netstat -ano | findstr ":%PORT%" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo WARNING: Cong %PORT% da duoc su dung.
  set /p use_custom_port="Ban co muon su dung cong khac khong? (y/n, mac dinh y): "
  
  if not "%use_custom_port%"=="n" (
    set /p custom_port="Nhap cong moi (mac dinh 3000): "
    if "%custom_port%"=="" set custom_port=3000
    echo Se su dung cong %custom_port% thay vi %PORT%
    set PORT=%custom_port%
  )
)

:: Kiểm tra đồng bộ ban đầu
echo.
set /p sync_files="Ban co muon dong bo tat ca file voi Telegram khi khoi dong? (y/n, mac dinh n): "
if /i "%sync_files%"=="y" (
  echo Se thuc hien dong bo khi khoi dong.
  set SYNC_ON_START=true
) else (
  set SYNC_ON_START=false
)

:: Kiểm tra ngõ vào người dùng về chế độ
echo.
echo Chon che do chay:
echo 1. Che do phat trien (development) - su dung nodemon, tu dong khoi dong lai khi co thay doi
echo 2. Che do san xuat (production) - chay ung dung thong thuong
echo.
set /p mode="Nhap lua chon cua ban (1 hoac 2, mac dinh 1): "

:: Thiết lập biến môi trường
set "NODE_ENV=development"
if "%mode%"=="2" set "NODE_ENV=production"

:: Khởi động ứng dụng với cổng đã chọn
echo.
echo Khoi dong TeleDrive tren cong %PORT%...

if "%mode%"=="2" (
  echo Che do san xuat duoc chon.
  if /i "%SYNC_ON_START%"=="true" (
    set PORT=%PORT% && node index.js sync
  ) else (
    set PORT=%PORT% && node index.js
  )
) else (
  echo Che do phat trien duoc chon. Ung dung se tu dong khoi dong lai khi co thay doi.
  if /i "%SYNC_ON_START%"=="true" (
    set PORT=%PORT% && npx nodemon index.js -- sync
  ) else (
    set PORT=%PORT% && npx nodemon index.js
  )
)

:: Dừng lại khi kết thúc
echo.
echo TeleDrive da dung.
pause 