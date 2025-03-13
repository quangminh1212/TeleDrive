const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3005;

// Thư mục data chứa file JSON
const dataDir = path.join(__dirname, 'data');
const filesDbPath = path.join(dataDir, 'files.json');
const uploadDir = path.join(__dirname, 'uploads');

// Phục vụ file tĩnh trong thư mục uploads
app.use('/uploads', express.static(uploadDir));

// Cho phép truy cập trực tiếp đến thư mục data để đọc files.json
app.use('/data', express.static(dataDir));

// Route để xem file simple-viewer.html
app.get('/viewer', (req, res) => {
  res.sendFile(path.join(__dirname, 'simple-viewer.html'));
});

// API để lấy danh sách file
app.get('/api/files', (req, res) => {
  try {
    // Đọc file database
    if (fs.existsSync(filesDbPath)) {
      const content = fs.readFileSync(filesDbPath, 'utf8');
      const filesData = JSON.parse(content);
      console.log(`API loaded ${filesData.length} files from database`);
      res.json(filesData);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error loading files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route để xem danh sách file
app.get('/', (req, res) => {
  let filesData = [];
  
  try {
    // Đọc file database
    if (fs.existsSync(filesDbPath)) {
      const content = fs.readFileSync(filesDbPath, 'utf8');
      filesData = JSON.parse(content);
      console.log(`Loaded ${filesData.length} files from database`);
    }
    
    // Gửi HTML trang danh sách file
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TeleDrive Files</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
          .file-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .file-icon { font-size: 48px; margin-bottom: 10px; text-align: center; }
          .file-name { font-weight: bold; margin-bottom: 5px; word-break: break-word; }
          .file-meta { color: #666; font-size: 14px; margin-bottom: 10px; }
          .download-btn { background: #4285F4; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
          .no-files { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .viewer-link { margin-top: 20px; text-align: center; }
          .viewer-link a { color: #4285F4; text-decoration: none; font-weight: bold; }
          #auto-refresh { margin-left: 10px; }
          .refresh-status { font-size: 12px; color: #666; margin-left: 10px; }
          .spinner { 
            display: inline-block; 
            width: 16px; 
            height: 16px; 
            border: 2px solid rgba(0,0,0,0.1); 
            border-radius: 50%; 
            border-top-color: #4285F4; 
            animation: spin 1s linear infinite; 
            margin-right: 5px; 
            vertical-align: middle; 
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TeleDrive Files</h1>
            <div>
              <button id="refresh-btn" onclick="refreshFiles()">Refresh</button>
              <label id="auto-refresh">
                <input type="checkbox" id="auto-refresh-toggle" checked> 
                Tự động làm mới
              </label>
              <span id="refresh-status" class="refresh-status"></span>
            </div>
          </div>
          
          <div class="viewer-link">
            <a href="/viewer">Xem với giao diện nâng cao</a>
          </div>
          
          <div id="file-container">
          ${filesData.length === 0 ? 
            `<div class="no-files">
              <p>No files have been uploaded yet. Send files to your Telegram bot to get started.</p>
            </div>` : 
            `<div class="file-grid">
              ${filesData.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).map(file => `
                <div class="file-card">
                  <div class="file-icon">
                    ${file.fileType === 'photo' ? 
                      `<img src="${file.fileLink || file.filePath}" alt="${file.fileName}" style="max-width:100%; max-height:150px; object-fit:contain; display:block; margin:0 auto;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                       <div style="display:none">🖼️</div>` : 
                     file.fileType === 'video' ? '🎬' : 
                     file.fileType === 'audio' ? '🎵' : '📄'}
                  </div>
                  <div class="file-name">${file.originalFileName || file.fileName}</div>
                  <div class="file-meta">
                    ${file.fileSize ? (file.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}<br>
                    ${new Date(file.uploadDate).toLocaleString()}
                  </div>
                  <a href="${file.fileLink || file.filePath}" download="${file.originalFileName || file.fileName}" class="download-btn">
                    Download
                  </a>
                </div>
              `).join('')}
            </div>`
          }
          </div>
          
          <div style="margin-top: 30px; background: #f5f5f5; padding: 15px; border-radius: 8px;">
            <h3>File Size Limits</h3>
            <p>Telegram Bot API limits file downloads to <strong>20MB</strong>.</p>
            <p>Larger files will show an error: "Bad Request: file is too big"</p>
          </div>
        </div>
        
        <script>
          // Biến để theo dõi số lượng file hiện tại
          let currentFileCount = ${filesData.length};
          let autoRefreshInterval = null;
          const refreshStatus = document.getElementById('refresh-status');
          const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
          const fileContainer = document.getElementById('file-container');
          
          // Hàm kiểm tra file mới từ server
          async function checkForNewFiles() {
            try {
              const response = await fetch('/api/files');
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              
              const files = await response.json();
              
              // Nếu số lượng file thay đổi, làm mới trang
              if (files.length !== currentFileCount) {
                console.log('Phát hiện file mới, đang làm mới...');
                refreshStatus.innerHTML = '<div class="spinner"></div> Đang làm mới...';
                currentFileCount = files.length;
                refreshFiles(false);
                return true;
              }
              
              // Cập nhật trạng thái
              const now = new Date();
              const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                             now.getMinutes().toString().padStart(2, '0') + ':' + 
                             now.getSeconds().toString().padStart(2, '0');
              refreshStatus.textContent = `Kiểm tra lúc: ${timeStr}`;
              return false;
            } catch (error) {
              console.error('Error checking for new files:', error);
              refreshStatus.textContent = `Lỗi: ${error.message}`;
              return false;
            }
          }
          
          // Hàm làm mới danh sách file
          async function refreshFiles(showSpinner = true) {
            if (showSpinner) {
              refreshStatus.innerHTML = '<div class="spinner"></div> Đang làm mới...';
            }
            
            // Đơn giản là tải lại trang để lấy dữ liệu mới nhất
            location.reload();
          }
          
          // Thiết lập auto refresh
          function toggleAutoRefresh() {
            if (autoRefreshToggle.checked) {
              // Kiểm tra mỗi 10 giây
              autoRefreshInterval = setInterval(checkForNewFiles, 10000);
              refreshStatus.textContent = 'Auto refresh: Đang bật';
            } else {
              clearInterval(autoRefreshInterval);
              refreshStatus.textContent = 'Auto refresh: Đã tắt';
            }
          }
          
          // Khởi động auto refresh khi trang tải xong
          document.addEventListener('DOMContentLoaded', () => {
            toggleAutoRefresh();
            
            // Thêm event listener cho checkbox
            autoRefreshToggle.addEventListener('change', toggleAutoRefresh);
            
            // Kiểm tra ngay khi trang tải xong
            setTimeout(checkForNewFiles, 1000);
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/">Try again</a>
    `);
  }
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Files database: ${filesDbPath}`);
}); 