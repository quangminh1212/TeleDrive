@echo off
chcp 65001 > nul
cls
title TeleDrive Setup
color 0B

echo ===== TELEDRIVE SETUP =====
echo Dang cai dat TeleDrive...
echo.

:: Kiểm tra Node.js
echo [*] Kiem tra Node.js...
node --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    [ERROR] Node.js chua duoc cai dat.
    echo    Vui long cai dat Node.js tu https://nodejs.org/
    goto :end
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo    [OK] Node.js %NODE_VERSION% da duoc cai dat.
)
echo.

:: Kiểm tra npm
echo [*] Kiem tra npm...
npm --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    [ERROR] npm chua duoc cai dat.
    echo    Vui long cai dat npm.
    goto :end
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo    [OK] npm %NPM_VERSION% da duoc cai dat.
)
echo.

:: Tạo cấu trúc thư mục
echo [*] Tao cau truc thu muc...
mkdir public\uploads 2>nul
mkdir public\css 2>nul
mkdir temp 2>nul
mkdir logs 2>nul
mkdir downloads 2>nul
mkdir sessions 2>nul
echo    [DONE] Cau truc thu muc da duoc tao.
echo.

:: Cài đặt dependencies
echo [*] Cai dat cac thu vien...
echo    Dang tai cac thu vien, vui long doi...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo    [ERROR] Khong the cai dat cac thu vien.
    goto :end
) else (
    echo    [DONE] Cac thu vien da duoc cai dat thanh cong.
)
echo.

:: Kiểm tra xem tệp tin có vấn đề với BOM không
echo [*] Kiem tra cac tep tin co van de...
powershell -Command "& {$content = Get-Content -Raw 'src\modules\files\file-service.js' -ErrorAction SilentlyContinue; if ($content -and $content.StartsWith([char]0xFEFF)) { $content = $content.Substring(1); [System.IO.File]::WriteAllText('src\modules\files\file-service.js', $content, [System.Text.Encoding]::UTF8); Write-Host '   [DONE] Da sua loi BOM trong file-service.js' } else { Write-Host '   [OK] Khong phat hien loi BOM trong file-service.js' }}"
echo.

:: Tạo file .env nếu chưa tồn tại
echo [*] Tao file cau hinh...
if not exist .env (
    echo NODE_ENV=development> .env
    echo PORT=3000>> .env
    echo SESSION_SECRET=teledrive-secret-key>> .env
    echo MONGODB_URI=mongodb://localhost:27017/teledrive>> .env
    echo    [DONE] File .env da duoc tao.
) else (
    echo    [SKIP] File .env da ton tai.
)
echo.

:: Thông báo hoàn thành
echo ===============================
echo Cai dat hoan tat!
echo.
echo Su dung lenh 'run.bat' de khoi dong ung dung.
echo ===============================

:end
echo.
echo Nhan phim bat ky de thoat...
pause > nul 