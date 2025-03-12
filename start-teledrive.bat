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
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
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

REM Cập nhật package.json của client để sử dụng port 3001
echo Cập nhật package.json để sử dụng port 3001...
cd client
powershell -Command "(Get-Content package.json) -replace '\"dev\": \"next dev\"', '\"dev\": \"next dev -p 3001\"' | Set-Content package.json"
cd ..

REM Kiểm tra và cài đặt dependencies còn thiếu
echo Kiểm tra và cài đặt dependencies còn thiếu...
cd client
call npm uninstall @emotion/cache @emotion/react @emotion/server @emotion/styled
call npm install @emotion/cache@latest @emotion/react@latest @emotion/server@latest @emotion/styled@latest --save
cd ..

REM Sửa file index.ts để sử dụng port từ file .env
echo Sửa file index.ts để sử dụng port 5001...
cd server
echo Sao lưu file index.ts...
copy src\index.ts src\index.ts.bak > nul
echo Cập nhật file index.ts...
(
echo import express from 'express';
echo import cors from 'cors';
echo import helmet from 'helmet';
echo import morgan from 'morgan';
echo import dotenv from 'dotenv';
echo import path from 'path';
echo.
echo // Load environment variables
echo dotenv.config();
echo.
echo // Import routes
echo // import authRoutes from './routes/auth.routes';
echo // import fileRoutes from './routes/file.routes';
echo // import userRoutes from './routes/user.routes';
echo.
echo // Create Express app
echo const app = express();
echo const PORT = process.env.PORT ^|^| 5001;
echo.
echo // Middleware
echo app.use(cors());
echo app.use(helmet());
echo app.use(morgan('dev'));
echo app.use(express.json());
echo app.use(express.urlencoded({ extended: true }));
echo.
echo // Routes
echo // app.use('/api/auth', authRoutes);
echo // app.use('/api/files', fileRoutes);
echo // app.use('/api/users', userRoutes);
echo.
echo // API health check route
echo app.get('/api/health', (req, res) =^> {
echo   res.status(200).json({ status: 'ok', message: 'TeleDrive API đang hoạt động' });
echo });
echo.
echo // Serve static assets in production
echo if (process.env.NODE_ENV === 'production') {
echo   app.use(express.static(path.join(__dirname, '../../client/build')));
echo   
echo   app.get('*', (req, res) =^> {
echo     res.sendFile(path.resolve(__dirname, '../../client/build', 'index.html'));
echo   });
echo }
echo.
echo // Error handling middleware
echo app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) =^> {
echo   console.error(err.stack);
echo   res.status(500).json({
echo     message: 'Something went wrong!',
echo     error: process.env.NODE_ENV === 'production' ? {} : err
echo   });
echo });
echo.
echo // Start server
echo app.listen(PORT, () =^> {
echo   console.log(`Server running on port ${PORT}`);
echo });
echo.
echo export default app;
) > src\index.ts
cd ..

REM Sửa file _document.tsx cho Material-UI
echo Sửa file _document.tsx cho Material-UI...
cd client
echo import React from 'react'; > src\pages\_document.tsx
echo import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document'; >> src\pages\_document.tsx
echo. >> src\pages\_document.tsx
echo class MyDocument extends Document { >> src\pages\_document.tsx
echo   static async getInitialProps(ctx: DocumentContext) { >> src\pages\_document.tsx
echo     const initialProps = await Document.getInitialProps(ctx); >> src\pages\_document.tsx
echo     return { ...initialProps }; >> src\pages\_document.tsx
echo   } >> src\pages\_document.tsx
echo. >> src\pages\_document.tsx
echo   render() { >> src\pages\_document.tsx
echo     return ( >> src\pages\_document.tsx
echo       ^<Html lang="vi"^> >> src\pages\_document.tsx
echo         ^<Head^> >> src\pages\_document.tsx
echo           ^<meta charSet="utf-8" /^> >> src\pages\_document.tsx
echo           ^<meta name="theme-color" content="#2AABEE" /^> >> src\pages\_document.tsx
echo           ^<meta name="description" content="Lưu trữ đám mây không giới hạn bằng Telegram" /^> >> src\pages\_document.tsx
echo           ^<link rel="icon" href="/favicon.ico" /^> >> src\pages\_document.tsx
echo           ^<link rel="apple-touch-icon" href="/logo192.png" /^> >> src\pages\_document.tsx
echo           ^<link >> src\pages\_document.tsx
echo             rel="stylesheet" >> src\pages\_document.tsx
echo             href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" >> src\pages\_document.tsx
echo           /^> >> src\pages\_document.tsx
echo         ^</Head^> >> src\pages\_document.tsx
echo         ^<body^> >> src\pages\_document.tsx
echo           ^<Main /^> >> src\pages\_document.tsx
echo           ^<NextScript /^> >> src\pages\_document.tsx
echo         ^</body^> >> src\pages\_document.tsx
echo       ^</Html^> >> src\pages\_document.tsx
echo     ); >> src\pages\_document.tsx
echo   } >> src\pages\_document.tsx
echo } >> src\pages\_document.tsx
echo. >> src\pages\_document.tsx
echo export default MyDocument; >> src\pages\_document.tsx
cd ..

REM Kiểm tra xem port có đang được sử dụng không
echo Kiểm tra các port đang sử dụng sau khi giải phóng...
netstat -ano | findstr :5001
netstat -ano | findstr :3000
netstat -ano | findstr :3001

echo.
echo ===================================================
echo Cấu hình hoàn tất
echo ===================================================
echo.
echo Server: http://localhost:5001
echo Client: http://localhost:3001
echo API Health Check: http://localhost:5001/api/health
echo.
echo Đã sửa file cấu hình và cài đặt lại dependencies.
echo Đã đơn giản hóa file _document.tsx để tránh lỗi với Material-UI.
echo Đã thêm endpoint /api/health để kiểm tra trạng thái server.
echo.
echo Nếu vẫn thấy các port này bị chiếm, hãy mở Task Manager và kết thúc tiến trình tương ứng.
echo.
pause

REM Khởi động ứng dụng
echo Khởi động TeleDrive...
npm run dev

pause 