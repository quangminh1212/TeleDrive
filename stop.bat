@echo off
echo Đang dừng tiến trình tự động commit...
powershell -ExecutionPolicy Bypass -File "%~dp0stop.ps1"
pause 