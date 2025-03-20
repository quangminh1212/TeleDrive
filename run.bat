@echo off
chcp 65001 > nul
cls
title TeleDrive Starter
color 0A

echo ===== TELEDRIVE STARTER =====
echo Đang chuẩn bị khởi động TeleDrive...
echo.

:: Tạo các thư mục cần thiết nếu chưa tồn tại
echo [*] Tao cac thu muc can thiet...
mkdir public\uploads 2>nul
mkdir temp 2>nul
mkdir logs 2>nul
mkdir downloads 2>nul
mkdir sessions 2>nul
echo    [DONE]
echo.

:: Kiểm tra và sửa lỗi encoding file-service.js
echo Kiểm tra file-service.js...
set FILE_SERVICE=src\modules\files\file-service.js

:: Kiểm tra byte đầu tiên của file để xác định nếu có lỗi encoding
findstr /B "onst" "%FILE_SERVICE%" >nul
if %ERRORLEVEL% == 0 (
    echo File file-service.js OK
) else (
    echo Phát hiện lỗi encoding trong file-service.js, đang sửa...
    
    :: Tạo file tạm với nội dung đúng
    echo const fs = require('fs'); > "%FILE_SERVICE%.fixed"
    echo const path = require('path'); >> "%FILE_SERVICE%.fixed"
    echo const crypto = require('crypto'); >> "%FILE_SERVICE%.fixed"
    echo const { promisify } = require('util'); >> "%FILE_SERVICE%.fixed"
    echo const { tdlibStorage } = require('../storage/tdlib-client'); >> "%FILE_SERVICE%.fixed"
    echo const File = require('../db/models/File'); >> "%FILE_SERVICE%.fixed"
    echo const User = require('../db/models/User'); >> "%FILE_SERVICE%.fixed"
    echo const logger = require('../common/logger'); >> "%FILE_SERVICE%.fixed"
    echo const { config } = require('../common/config'); >> "%FILE_SERVICE%.fixed"
    
    :: Copy nội dung còn lại từ dòng 10 trở đi (bỏ qua phần bị lỗi encoding)
    findstr /n "^" "%FILE_SERVICE%" | findstr /v "^[1-9]:" | for /f "tokens=2* delims=:" %%a in ('more +9 "%FILE_SERVICE%"') do (
        echo %%a >> "%FILE_SERVICE%.fixed"
    )
    
    :: Thay thế file cũ bằng file mới
    move /y "%FILE_SERVICE%.fixed" "%FILE_SERVICE%"
    echo Đã sửa xong file-service.js
)

:: Kiểm tra kết nối MongoDB
echo [*] Kiem tra ket noi MongoDB...
powershell -Command "& {try { $result = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue; if ($result.TcpTestSucceeded) { Write-Host '   [OK] MongoDB dang chay - Ket noi thanh cong' } else { Write-Host '   [WARNING] MongoDB khong chay - Se su dung co so du lieu gia lap' -ForegroundColor Yellow } } catch { Write-Host '   [WARNING] Khong the kiem tra ket noi MongoDB - Se su dung co so du lieu gia lap' -ForegroundColor Yellow }}"
echo.

:: Thiết lập biến môi trường
echo [*] Thiet lap bien moi truong...
set NODE_ENV=development
set DEBUG=teledrive:*
set PORT=3000
echo    [DONE]
echo.

echo ===============================
echo Ung dung dang khoi dong...
echo Truy cap vao http://localhost:3000 de su dung TeleDrive
echo Nhan Ctrl+C de dung ung dung
echo ===============================
echo.

:: Khởi động server
echo.
echo Đang khởi động TeleDrive server...
echo.
node src/server.js

:: Dừng lại nếu server kết thúc
echo.
echo Server đã dừng hoặc gặp lỗi!
echo Nhấn phím bất kỳ để đóng cửa sổ...
pause > nul 