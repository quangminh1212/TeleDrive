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
echo [*] Kiem tra file-service.js...
set FILE_SERVICE=src\modules\files\file-service.js

:: Kiểm tra nội dung file đầu tiên
type "%FILE_SERVICE%" | findstr /C:"const fs" > nul
if %ERRORLEVEL% == 0 (
    echo    [OK] File file-service.js da san sang.
) else (
    echo    [ERROR] Phat hien loi trong file-service.js, dang sua...
    
    :: Tạo file với nội dung đúng
    (
        echo const fs = require('fs'^);
        echo const path = require('path'^);
        echo const crypto = require('crypto'^);
        echo const { promisify } = require('util'^);
        echo const { tdlibStorage } = require('../storage/tdlib-client'^);
        echo const File = require('../db/models/File'^);
        echo const User = require('../db/models/User'^);
        echo const logger = require('../common/logger'^);
        echo const { config } = require('../common/config'^);
        echo.
        echo class FileService {
        echo   constructor(^) {
        echo     this.uploadPath = path.join(process.cwd(^), 'public', 'uploads'^);
        echo     this.tempPath = path.join(process.cwd(^), 'temp'^);
        echo     this.chunkSize = 1024 * 1024; // 1MB chunks
        echo     
        echo     // Đảm bảo các thư mục tồn tại
        echo     if (!fs.existsSync(this.uploadPath^)^) {
        echo       fs.mkdirSync(this.uploadPath, { recursive: true }^);
        echo     }
        echo     if (!fs.existsSync(this.tempPath^)^) {
        echo       fs.mkdirSync(this.tempPath, { recursive: true }^);
        echo     }
        echo   }
        echo }
        echo.
        echo module.exports = new FileService(^);
    ) > "%FILE_SERVICE%.fixed"
    
    :: Thay thế file cũ bằng file mới
    move /y "%FILE_SERVICE%.fixed" "%FILE_SERVICE%"
    echo    [DONE] File file-service.js da duoc sua.
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