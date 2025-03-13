/**
 * Script khởi động TeleDrive
 * Chạy ứng dụng với file minimal-fixed.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Kiểm tra và tạo thư mục data nếu chưa tồn tại
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Đã tạo thư mục data: ${dataDir}`);
}

// Kiểm tra và tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Đã tạo thư mục uploads: ${uploadsDir}`);
}

// Kiểm tra và tạo file database nếu chưa tồn tại
const filesDbPath = path.join(dataDir, 'files.json');
if (!fs.existsSync(filesDbPath)) {
  fs.writeFileSync(filesDbPath, '[]', 'utf8');
  console.log(`Đã tạo file database: ${filesDbPath}`);
}

console.log('Đang khởi động TeleDrive...');

// Chạy ứng dụng với file minimal-fixed.js
const app = spawn('node', ['minimal-fixed.js'], { stdio: 'inherit' });

app.on('close', (code) => {
  console.log(`Ứng dụng đã dừng với mã thoát: ${code}`);
});

console.log('Ứng dụng đã khởi động! Nhấn Ctrl+C để dừng.');
console.log('Truy cập: http://localhost:3005 để xem danh sách file');
console.log('Truy cập: http://localhost:3005/viewer để xem với giao diện nâng cao'); 