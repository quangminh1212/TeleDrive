/**
 * Script khởi động TeleDrive
 * Chạy với lệnh: node start-app.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Kiểm tra xem file .env có tồn tại không
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Không tìm thấy file .env!');
  console.log('Vui lòng tạo file .env từ .env.example và cấu hình BOT_TOKEN.');
  process.exit(1);
}

// Đọc file .env để lấy PORT
let port = 3008; // Mặc định
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const portMatch = envContent.match(/PORT\s*=\s*(\d+)/);
  if (portMatch && portMatch[1]) {
    port = parseInt(portMatch[1], 10);
  }
} catch (error) {
  console.warn('Không thể đọc file .env:', error.message);
}

// Kiểm tra xem port có đang được sử dụng không
const isPortInUse = (port) => {
  try {
    const net = require('net');
    const server = net.createServer();
    
    return new Promise((resolve) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve(false);
      });
      
      server.listen(port);
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra port:', error);
    return Promise.resolve(false);
  }
};

// Khởi động ứng dụng
const startApp = async () => {
  // Kiểm tra port
  const portInUse = await isPortInUse(port);
  if (portInUse) {
    console.warn(`Port ${port} đang được sử dụng. Vui lòng thay đổi PORT trong file .env.`);
    process.exit(1);
  }
  
  console.log(`Khởi động TeleDrive trên port ${port}...`);
  
  // Khởi động ứng dụng
  const app = spawn('node', ['app.js'], {
    stdio: 'inherit',
    shell: true
  });
  
  app.on('error', (error) => {
    console.error('Lỗi khi khởi động ứng dụng:', error);
  });
  
  app.on('close', (code) => {
    if (code !== 0) {
      console.log(`Ứng dụng đã dừng với mã lỗi ${code}`);
    }
  });
  
  // Xử lý khi người dùng nhấn Ctrl+C
  process.on('SIGINT', () => {
    console.log('\nĐang dừng ứng dụng...');
    app.kill();
    process.exit(0);
  });
};

// Hiển thị thông tin
console.log('=== TeleDrive ===');
console.log('Phiên bản: 1.0.0');
console.log(`Hệ điều hành: ${os.platform()} ${os.release()}`);
console.log(`Node.js: ${process.version}`);
console.log('----------------');

// Khởi động
startApp(); 