/**
 * Script đồng bộ file từ thư mục uploads vào database
 * Chạy: node sync-files.js
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Thư mục data và uploads
const dataDir = path.join(__dirname, 'data');
const filesDbPath = path.join(dataDir, 'files.json');
const uploadDir = path.join(__dirname, 'uploads');

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
  console.log('Bắt đầu đồng bộ file...');

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
    
    // Xử lý từng file
    for (const file of actualFiles) {
      const filePath = path.join(uploadDir, file);
      const relativePath = `/uploads/${file}`;
      
      // Nếu file đã có trong database thì bỏ qua
      if (existingPaths.has(relativePath)) {
        console.log(`File đã tồn tại trong database: ${file}`);
        continue;
      }
      
      // Lấy thông tin file
      const stats = fs.statSync(filePath);
      const extension = path.extname(file);
      const mimeType = getMimeType(extension);
      const fileType = guessFileType(mimeType);
      
      // Tạo entry mới cho database
      const fileEntry = {
        _id: uuidv4().replace(/-/g, '').substring(0, 12),
        fileName: file,
        originalFileName: file.split('_')[0] + extension, // Cố gắng lấy tên gốc
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
      console.log(`Đã thêm file vào database: ${file}`);
    }
    
    // Lưu database
    saveFilesDb(filesDb);
    console.log(`Đã lưu database với ${filesDb.length} file`);
    
  } catch (error) {
    console.error('Lỗi khi đồng bộ file:', error);
  }
}

// Chạy đồng bộ
syncFiles()
  .then(() => {
    console.log('Đồng bộ hoàn tất!');
  })
  .catch(error => {
    console.error('Lỗi khi đồng bộ:', error);
  }); 