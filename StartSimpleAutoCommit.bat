@echo off
echo Đang khởi động tự động commit đơn giản...
powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0SimpleAutoCommit.ps1"
echo Script tự động commit đã được khởi chạy trong background! 