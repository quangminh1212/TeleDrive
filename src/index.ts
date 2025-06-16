import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import config from './config';
import routes from './routes';

// Khởi tạo Express
const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tạo thư mục uploads nếu chưa tồn tại
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Kết nối MongoDB
mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log('🔄 Đã kết nối tới MongoDB');
  })
  .catch((err) => {
    console.error('❌ Lỗi kết nối MongoDB:', err.message);
    process.exit(1);
  });

// Định nghĩa routes
app.use('/api', routes);

// Route homepage
app.get('/', (req, res) => {
  res.send('Chào mừng đến với TeleDrive API');
});

// Xử lý lỗi 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Không tìm thấy API endpoint',
  });
});

// Xử lý lỗi chung
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const statusCode = err.statusCode || 500;
  console.error(err.stack);
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Lỗi server',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Khởi động server
app.listen(config.port, () => {
  console.log(`🚀 Server đang chạy tại cổng ${config.port}`);
  console.log(`🌐 Môi trường: ${config.env}`);
}); 