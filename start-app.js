/**
 * Script khởi động TeleDrive
 * Chạy với lệnh: node start-app.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

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

// Thư mục data và uploads
const dataDir = path.join(__dirname, 'data');
const filesDbPath = path.join(dataDir, 'files.json');
const uploadDir = path.join(__dirname, 'uploads');

// Đảm bảo các thư mục tồn tại
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Hàm đọc database
function readFilesDb() {
  try {
    if (fs.existsSync(filesDbPath)) {
      const content = fs.readFileSync(filesDbPath, 'utf8');
      return JSON.parse(content);
    }
    return [];
  } catch (error) {
    console.error('Lỗi đọc database:', error);
    return [];
  }
}

// Hàm lưu database
function saveFilesDb(filesData) {
  try {
    fs.writeFileSync(filesDbPath, JSON.stringify(filesData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Lỗi lưu database:', error);
    return false;
  }
}

// Hàm lấy thông tin mime type từ phần mở rộng
function getMimeType(extension) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.exe': 'application/octet-stream'
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// Hàm đoán loại file từ MIME type
function guessFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

// Hàm đồng bộ file
async function syncFiles() {
  console.log('Đồng bộ file từ thư mục uploads...');

  // Đọc database hiện tại
  const filesDb = readFilesDb();
  console.log(`Đã đọc database: ${filesDb.length} file`);

  // Danh sách file đã có trong database (theo đường dẫn)
  const existingPaths = new Set(filesDb.map(file => file.filePath));

  // Đọc các file trong thư mục uploads
  try {
    const files = fs.readdirSync(uploadDir);
    
    // Lọc ra chỉ các file (không phải thư mục và không phải .gitkeep)
    const actualFiles = files.filter(file => {
      const filePath = path.join(uploadDir, file);
      return fs.statSync(filePath).isFile() && file !== '.gitkeep';
    });
    
    console.log(`Tìm thấy ${actualFiles.length} file trong thư mục uploads`);
    
    let newFileCount = 0;
    // Xử lý từng file
    for (const file of actualFiles) {
      const filePath = path.join(uploadDir, file);
      const relativePath = `/uploads/${file}`;
      
      // Nếu file đã có trong database thì bỏ qua
      if (existingPaths.has(relativePath)) {
        continue;
      }
      
      // Lấy thông tin file
      const stats = fs.statSync(filePath);
      const extension = path.extname(file);
      const mimeType = getMimeType(extension);
      const fileType = guessFileType(mimeType);
      
      // Cố gắng lấy tên gốc từ tên file
      let originalFileName = file;
      if (file.includes('_')) {
        const nameParts = file.split('_');
        // Xem có timestamp không
        if (nameParts.length > 1 && /^\d+$/.test(nameParts[nameParts.length - 2])) {
          originalFileName = nameParts[0] + extension;
        }
      }
      
      // Tạo entry mới cho database
      const fileEntry = {
        _id: uuidv4().replace(/-/g, '').substring(0, 12),
        fileName: file,
        originalFileName: originalFileName,
        fileType: fileType,
        fileSize: stats.size,
        filePath: relativePath,
        uploadDate: new Date().toISOString(),
        uploadedBy: {
          userId: "system_sync",
          firstName: "System",
          lastName: "Sync",
          username: "system_sync"
        },
        syncedFromUploads: true
      };
      
      // Thêm vào database
      filesDb.push(fileEntry);
      newFileCount++;
    }
    
    if (newFileCount > 0) {
      console.log(`Đã đồng bộ ${newFileCount} file mới vào database`);
      // Lưu database
      saveFilesDb(filesDb);
    } else {
      console.log('Không có file mới để đồng bộ');
    }
    
  } catch (error) {
    console.error('Lỗi khi đồng bộ file:', error);
  }
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
  // Đồng bộ file trước khi khởi động ứng dụng
  await syncFiles();
  
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