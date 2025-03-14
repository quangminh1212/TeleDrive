@echo off
chcp 65001 > nul
echo ===================================
echo === KHỞI ĐỘNG TELEDRIVE SERVER ===
echo ===================================
echo.

:: Kiểm tra xem node đã được cài đặt chưa
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [LỖI] Không tìm thấy Node.js! Vui lòng cài đặt Node.js từ https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Kiểm tra phiên bản node
for /f "tokens=1,2,3 delims=." %%a in ('node -v') do (
    set NODE_MAJOR=%%a
    set NODE_MINOR=%%b
)

:: Cắt bỏ 'v' từ phiên bản Node
set NODE_MAJOR=%NODE_MAJOR:~1%

:: Kiểm tra phiên bản Node.js >= 14
if %NODE_MAJOR% LSS 14 (
    echo [CẢNH BÁO] Phiên bản Node.js quá cũ (%NODE_MAJOR%.%NODE_MINOR%)
    echo Khuyến nghị nâng cấp lên Node.js v14 trở lên.
    echo.
    choice /C YN /M "Bạn vẫn muốn tiếp tục?"
    if %ERRORLEVEL% equ 2 exit /b 1
    echo.
)

:: Kiểm tra các thư mục cần thiết
if not exist data mkdir data
if not exist uploads mkdir uploads
if not exist logs mkdir logs

:: Kiểm tra file .env
if not exist .env (
    if exist .env.example (
        echo [THÔNG BÁO] Đang tạo file .env từ .env.example...
        copy .env.example .env
    ) else (
        echo [LỖI] Không tìm thấy file .env hoặc .env.example!
        echo Vui lòng tạo file .env với nội dung sau:
        echo.
        echo # Token bot Telegram
        echo BOT_TOKEN=your_bot_token_here
        echo.
        echo # Port cho web server
        echo PORT=3008
        echo.
        echo # Giới hạn kích thước file (bytes, 20MB = 20971520)
        echo MAX_FILE_SIZE=20971520
        echo.
        pause
        exit /b 1
    )
)

:: Kiểm tra xem đã cài đặt các gói cần thiết chưa
if not exist node_modules (
    echo [THÔNG BÁO] Đang cài đặt các gói phụ thuộc...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [LỖI] Không thể cài đặt các gói phụ thuộc!
        pause
        exit /b 1
    )
    echo Đã cài đặt các gói phụ thuộc thành công.
    echo.
)

:: Đồng bộ file trước khi khởi động
echo [THÔNG BÁO] Đang đồng bộ file từ thư mục uploads...
call node sync-files.js
echo.

:: Khởi động ứng dụng
echo [THÔNG BÁO] Khởi động TeleDrive server...
echo.
echo Mở trình duyệt và truy cập http://localhost:3008
echo Nhấn Ctrl+C để dừng server.
echo.
call node start-app.js

exit /b 0 