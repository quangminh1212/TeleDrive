@echo off
setlocal enabledelayedexpansion
title TeleDrive - Telegram File Manager
color 0B

echo.
echo ================================================================
echo                 TELEDRIVE WEB INTERFACE LAUNCHER
echo ================================================================
echo.

REM Hiển thị menu lựa chọn
echo Chọn chế độ khởi động:
echo [1] Chạy TeleDrive
echo [2] Chạy TeleDrive với tự động commit
echo [3] Dừng tự động commit (nếu đang chạy)
echo [4] Thiết lập cấu hình Git
echo [5] Thoát
echo.
set /p option="Nhập lựa chọn của bạn (1-5): "

if "%option%"=="2" (
    call :startAutoCommit
)
if "%option%"=="3" (
    call :stopAutoCommit
    exit /b 0
)
if "%option%"=="4" (
    call :setupGit
    exit /b 0
)
if "%option%"=="5" (
    exit /b 0
)

echo.
echo [INFO] Khởi động web interface tại http://localhost:3000
echo.

echo [BUOC 1/3] Kiểm tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] KHÔNG TÌM THẤY PYTHON!
    echo [INFO] Tải Python từ: https://python.org/downloads/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo [OK] %%i đã sẵn sàng
)

echo.
echo [BUOC 2/3] Kiểm tra thư mục dự án...
if not exist "src\teledrive" (
    echo [ERROR] Không tìm thấy thư mục src\teledrive!
    echo [INFO] Vui lòng chạy file này từ thư mục gốc của dự án
    pause
    exit /b 1
) else (
    echo [OK] Cấu trúc thư mục hợp lệ
)

echo.
echo [BUOC 3/3] Kiểm tra dependencies...
echo    ^> Đang kiểm tra các thư viện Python...
python -c "import flask, telethon; print('[OK] Tất cả dependencies đã sẵn sàng')" 2>nul
if errorlevel 1 (
    echo [INFO] Đang cài đặt dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Không thể cài đặt dependencies!
        pause
        exit /b 1
    )
)

echo.
echo ================================================================
echo [INFO] KHỞI ĐỘNG TELEDRIVE WEB INTERFACE
echo ================================================================
echo.
echo [INFO] Đang chạy TeleDrive...
echo [INFO] Web interface sẽ mở tại: http://localhost:3000
echo [INFO] Nhấn Ctrl+C để dừng ứng dụng
echo.

python main.py

if errorlevel 1 (
    echo.
    echo [ERROR] Có lỗi xảy ra khi chạy TeleDrive!
    pause
)

exit /b 0

:startAutoCommit
echo Đang khởi động tự động commit...
echo @echo off > "%TEMP%\RunAutoCommit.bat"
echo powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%%~dp0AutoCommit.ps1" >> "%TEMP%\RunAutoCommit.bat"
start "" "%TEMP%\RunAutoCommit.bat"
echo Script tự động commit đã được khởi chạy trong background!
goto :eof

:stopAutoCommit
echo Đang dừng tiến trình tự động commit...
powershell -ExecutionPolicy Bypass -Command "Get-Process -Name powershell | Where-Object { $_.CommandLine -like '*AutoCommit.ps1*' } | Stop-Process -Force"
echo Đã dừng tiến trình tự động commit.
pause
goto :eof

:setupGit
echo Thiết lập cấu hình Git
set /p username=Nhập tên người dùng Git: 
set /p email=Nhập email Git: 
powershell -Command "& { if (Get-Command git -ErrorAction SilentlyContinue) { git config --local user.name '%username%'; git config --local user.email '%email%'; Write-Host 'Đã thiết lập cấu hình Git thành công!' } else { Write-Host 'Không tìm thấy Git trong hệ thống!' } }"
pause
goto :eof
