@echo off
echo === TeleDrive Starter ===
echo.

REM Tạo thư mục uploads nếu chưa tồn tại
if not exist "server\uploads" mkdir server\uploads

REM Tạo file .env cho server
echo Tạo file .env cho server...
echo # Server Configuration > server\.env
echo PORT=5001 >> server\.env
echo NODE_ENV=development >> server\.env
echo. >> server\.env
echo # Telegram API Credentials >> server\.env
echo TELEGRAM_API_ID=123456 >> server\.env
echo TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890 >> server\.env
echo TELEGRAM_SESSION_STRING= >> server\.env
echo. >> server\.env
echo # Application Settings >> server\.env
echo UPLOAD_FOLDER=./uploads >> server\.env
echo MAX_FILE_SIZE=2000000000 >> server\.env

REM Tạo file .env.local cho client
echo Tạo file .env.local cho client...
echo # Next.js Client Configuration > client\.env.local
echo NEXT_PUBLIC_API_URL=http://localhost:5001 >> client\.env.local

REM Cài đặt dependencies còn thiếu
echo Cài đặt dependencies còn thiếu...
cd client
call npm install @emotion/cache @emotion/react @emotion/server @emotion/styled --save
cd ..

REM Kiểm tra xem port có đang được sử dụng không
echo Kiểm tra các port đang sử dụng...
netstat -ano | findstr :5001
netstat -ano | findstr :3000

REM Chờ xác nhận từ người dùng
echo.
echo Port 5001 sẽ được sử dụng cho server
echo Port 3000 sẽ được sử dụng cho client (hoặc 3001 nếu 3000 đã bị chiếm)
echo.
pause

REM Kiểm tra xem server/index.ts có sử dụng port từ .env không
echo Kiểm tra file server/src/index.ts...
cd server
call node -e "const fs = require('fs'); const content = fs.readFileSync('src/index.ts', 'utf8'); if (content.includes('process.env.PORT') && content.includes('5000')) { console.log('Cần sửa file index.ts để sử dụng port từ .env'); } else { console.log('File index.ts đã sẵn sàng'); }"
cd ..

REM Khởi động ứng dụng
echo Khởi động TeleDrive...
npm run dev

pause 