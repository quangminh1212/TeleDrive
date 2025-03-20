@echo off
chcp 65001 > nul
cls
title TeleDrive Starter
color 0A

echo ===== TELEDRIVE STARTER =====
echo Dang khoi dong TeleDrive...
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

:: Kiểm tra xem tệp tin có vấn đề với BOM không
echo [*] Kiem tra cac tep tin co van de...
powershell -Command "& {$content = Get-Content -Raw 'src\modules\files\file-service.js'; if ($content.StartsWith([char]0xFEFF)) { $content = $content.Substring(1); [System.IO.File]::WriteAllText('src\modules\files\file-service.js', $content, [System.Text.Encoding]::UTF8) }}"
if %ERRORLEVEL% NEQ 0 (
    echo    [ERROR] Da xay ra loi khi kiem tra tep tin file-service.js
) else (
    echo    [DONE] Da kiem tra va sua cac van de BOM trong file-service.js
)
echo.

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

:: Chạy ứng dụng
node src/server.js

:: Nếu chương trình kết thúc, chờ người dùng nhấn phím
echo.
echo Ung dung da dung. Nhan phim bat ky de thoat...
pause > nul 