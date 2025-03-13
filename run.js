const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Đảm bảo thư mục data tồn tại
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory:', dataDir);
}

// Đảm bảo file database tồn tại
const filesDbPath = path.join(dataDir, 'files.json');
if (!fs.existsSync(filesDbPath)) {
  fs.writeFileSync(filesDbPath, '[]', 'utf8');
  console.log('Created empty database file:', filesDbPath);
}

// Đọc file database để kiểm tra
try {
  const content = fs.readFileSync(filesDbPath, 'utf8');
  const files = JSON.parse(content);
  console.log(`Database contains ${files.length} files`);
} catch (error) {
  console.error('Error reading database file:', error);
  fs.writeFileSync(filesDbPath, '[]', 'utf8');
  console.log('Reset database file to empty array');
}

// Chạy ứng dụng
console.log('Starting application...');
const app = exec('node index.js');

app.stdout.on('data', (data) => {
  console.log(data.trim());
});

app.stderr.on('data', (data) => {
  console.error(data.trim());
});

app.on('close', (code) => {
  console.log(`Application exited with code ${code}`);
});

console.log('Application started! Press Ctrl+C to stop.'); 