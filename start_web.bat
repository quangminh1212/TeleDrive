@echo off
title TeleDrive - Web Interface
color 0B

echo.
echo ================================================================
echo                    TELEDRIVE WEB INTERFACE
echo              Telegram File Scanner ^& Manager
echo ================================================================
echo.

echo 🌐 Khoi dong Web Interface truc tiep...
echo.
echo 📱 Truy cap tai: http://localhost:3000
echo 🔐 Dang nhap: admin / admin123
echo.
echo 💡 Luu y:
echo    • Cau hinh da duoc thiet lap trong config.json
echo    • Neu gap loi, kiem tra file logs/errors.log
echo    • Nhan Ctrl+C de dung server
echo.
echo ================================================================
echo.

REM Tao cac thu muc can thiet
if not exist output mkdir output
if not exist logs mkdir logs
if not exist data mkdir data

REM Khoi dong web interface
python app.py

echo.
echo 🎉 Web Interface da dung!
echo.
pause
