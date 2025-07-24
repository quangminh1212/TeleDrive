@echo off
echo Đang khởi động tự động commit...
powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0AutoCommit.ps1"
echo Script tự động commit đã được khởi chạy trong background! 