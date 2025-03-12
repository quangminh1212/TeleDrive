@echo off
echo === KHỞI ĐỘNG TELEDRIVE ===
echo Đang dừng các tiến trình đang sử dụng cổng 3000...

:: Tìm và dừng tất cả các tiến trình đang sử dụng cổng 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Đang dừng tiến trình với PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo Đang khởi động server...

:: Khởi động server Node.js trong nền
start /B cmd /c "node server.js"

:: Đợi 5 giây để server khởi động
echo Đợi server khởi động...
timeout /t 5 /nobreak > nul

:: Mở URL trong trình duyệt mặc định
echo Đang mở trình duyệt...
start "" http://localhost:3000

echo === TELEDRIVE ĐÃ KHỞI ĐỘNG ===
echo Server đang chạy tại địa chỉ: http://localhost:3000
echo.
echo Để dừng server, đóng cửa sổ cmd này và các cửa sổ liên quan. 