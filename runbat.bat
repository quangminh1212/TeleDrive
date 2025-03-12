@echo off
echo === KHỞI ĐỘNG TELEDRIVE ===
echo Đang khởi động server...

:: Khởi động server Node.js trong nền
start /B cmd /c "npm start"

:: Đợi 3 giây để server khởi động
timeout /t 3 /nobreak > nul

:: Mở Chrome với URL localhost:3000, sử dụng profile mặc định
echo Đang mở trình duyệt Chrome...
start chrome --profile-directory="Default" http://localhost:3000

echo === TELEDRIVE ĐÃ KHỞI ĐỘNG ===
echo Server đang chạy tại địa chỉ: http://localhost:3000
echo.
echo Để dừng server, nhấn Ctrl+C trong cửa sổ cmd đang chạy server. 