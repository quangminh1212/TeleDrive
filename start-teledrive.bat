@echo off
echo === TeleDrive Starter ===
echo.

REM Kiểm tra và dừng các tiến trình đang chạy trên port 5001 và 3000/3001
echo Kiểm tra và giải phóng các port đang được sử dụng...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001') do (
    echo Đang dừng tiến trình với PID: %%a
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Đang dừng tiến trình với PID: %%a
    taskkill /F /PID %%a 2>nul
)

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
echo NEXT_PUBLIC_PORT=3001 >> client\.env.local

REM Kiểm tra và cài đặt dependencies còn thiếu
echo Kiểm tra và cài đặt dependencies còn thiếu...
cd client
call npm list @emotion/cache @emotion/react @emotion/server @emotion/styled || call npm install @emotion/cache @emotion/react @emotion/server @emotion/styled --save
cd ..

REM Kiểm tra xem port có đang được sử dụng không
echo Kiểm tra các port đang sử dụng sau khi giải phóng...
netstat -ano | findstr :5001
netstat -ano | findstr :3000
netstat -ano | findstr :3001

REM Chờ xác nhận từ người dùng
echo.
echo Port 5001 sẽ được sử dụng cho server
echo Port 3001 sẽ được sử dụng cho client
echo.
echo Nếu vẫn thấy các port này bị chiếm, hãy mở Task Manager và kết thúc tiến trình tương ứng.
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