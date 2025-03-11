@echo off
title TeleDrive Docker - Stop

echo ===================================
echo    DỪNG TELEDRIVE DOCKER
echo ===================================
echo.

:: Kiểm tra xem Docker đã được cài đặt chưa
docker -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [CẢNH BÁO] Docker chưa được cài đặt.
  echo.
  pause
  exit /b 1
)

:: Kiểm tra xem container có tồn tại không
docker ps -a | findstr teledrive-app >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [THÔNG BÁO] Container teledrive-app không tồn tại.
  echo.
  pause
  exit /b 0
)

:: Dừng container
echo [THÔNG BÁO] Đang dừng container teledrive-app...
docker stop teledrive-app
if %ERRORLEVEL% NEQ 0 (
  echo [LỖI] Không thể dừng container.
  echo.
  pause
  exit /b 1
)

:: Xóa container
echo [THÔNG BÁO] Đang xóa container teledrive-app...
docker rm teledrive-app
if %ERRORLEVEL% NEQ 0 (
  echo [LỖI] Không thể xóa container.
  echo.
  pause
  exit /b 1
)

echo.
echo [THÔNG BÁO] TeleDrive Docker đã được dừng và container đã được xóa.
echo.
pause 