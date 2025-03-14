const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Đọc cấu hình từ file .env
dotenv.config();

// Biến môi trường
const PORT = process.env.PORT || 3010;

// Khởi tạo Express
const app = express();

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route chính
app.get('/', (req, res) => {
  console.log('Trang chủ được truy cập');
  try {
    res.render('index-simple', {
      title: 'TeleDrive Test',
      files: [],
      totalSize: 0,
      maxSize: 0,
      error: null,
      storageInfo: {
        used: 0,
        total: 0,
        percent: 0
      }
    });
  } catch (error) {
    console.error('Lỗi render:', error);
    res.status(500).send('Có lỗi xảy ra: ' + error.message);
  }
});

// API status
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Server đang hoạt động' });
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`TeleDrive Test đang chạy tại http://localhost:${PORT}`);
}); 