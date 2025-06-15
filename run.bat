@echo off
echo == TeleDrive - Telegram File Manager ==
echo Đang khởi động...

rem Kiểm tra và cài đặt các thư viện cần thiết
pip install -r requirements.txt

rem Chạy ứng dụng giao diện đồ họa
python teledrive_gui.py

pause 