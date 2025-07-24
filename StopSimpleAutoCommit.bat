@echo off
echo Đang dừng tiến trình tự động commit...
powershell -ExecutionPolicy Bypass -Command "Get-Process -Name powershell | Where-Object { $_.CommandLine -like '*SimpleAutoCommit.ps1*' } | Stop-Process -Force"
echo Đã dừng tiến trình tự động commit.
pause 