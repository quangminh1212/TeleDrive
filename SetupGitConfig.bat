@echo off
echo Thiết lập cấu hình Git

set /p username=Nhập tên người dùng Git: 
set /p email=Nhập email Git: 

powershell -Command "& { if (Get-Command git -ErrorAction SilentlyContinue) { git config --local user.name '%username%'; git config --local user.email '%email%'; Write-Host 'Đã thiết lập cấu hình Git thành công!' } else { Write-Host 'Không tìm thấy Git trong hệ thống!' } }"

pause 