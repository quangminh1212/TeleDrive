@echo off
title TeleDrive - Chế độ không bị treo
color 0B

echo.
echo ================================================================
echo           TELEDRIVE - CHAY CHE DO KHONG BI TREO
echo ================================================================
echo.
echo [INFO] Chế độ này sẽ khởi động TeleDrive trong một tiến trình riêng
echo [INFO] để tránh bị treo trong Cursor khi chạy ứng dụng.
echo.

echo [INFO] Đang khởi động TeleDrive...
python main.py --detached

echo.
echo [INFO] Bạn có thể tiếp tục sử dụng Cursor mà không bị treo
echo [INFO] TeleDrive đã được khởi động trong một cửa sổ riêng biệt
echo [INFO] Truy cập web interface tại: http://localhost:3000
echo.

exit 