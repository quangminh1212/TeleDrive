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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TeleDrive Files</h1>
            <button onclick="window.location.reload()">Refresh</button>
          </div>
          
          <div class="viewer-link">
            <a href="/viewer">Xem với giao diện nâng cao</a>
          </div>
          
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
          
          <div style="margin-top: 30px; background: #f5f5f5; padding: 15px; border-radius: 8px;">
            <h3>File Size Limits</h3>
            <p>Telegram Bot API limits file downloads to <strong>20MB</strong>.</p>
            <p>Larger files will show an error: "Bad Request: file is too big"</p>
          </div>
        </div>
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