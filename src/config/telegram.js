const { TelegramClient } = require('gramjs');
const { StringSession } = require('gramjs/sessions');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

// Telegram API configuration
const apiId = parseInt(process.env.TELEGRAM_API_ID || process.env.API_ID);
const apiHash = process.env.TELEGRAM_API_HASH || process.env.API_HASH;
const sessionString = process.env.SESSION_STRING || '';

// Thêm cấu hình để tìm session của Telegram Desktop
const useDesktopSession = process.env.USE_TELEGRAM_DESKTOP === 'true';
const desktopSessionPath = process.env.TELEGRAM_DESKTOP_PATH || findDefaultTelegramDesktopPath();

if (!apiId || !apiHash) {
  console.error('TELEGRAM_API_ID và TELEGRAM_API_HASH phải được cấu hình trong file .env');
  process.exit(1);
}

// Tìm đường dẫn mặc định đến Telegram Desktop
function findDefaultTelegramDesktopPath() {
  try {
    const homedir = os.homedir();
    let tDataPath;
    
    if (process.platform === 'win32') {
      // Windows
      tDataPath = path.join(homedir, 'AppData', 'Roaming', 'Telegram Desktop', 'tdata');
    } else if (process.platform === 'darwin') {
      // macOS
      tDataPath = path.join(homedir, 'Library', 'Application Support', 'Telegram Desktop', 'tdata');
    } else {
      // Linux
      tDataPath = path.join(homedir, '.local', 'share', 'TelegramDesktop', 'tdata');
    }
    
    if (fs.existsSync(tDataPath)) {
      console.log(`Tìm thấy thư mục Telegram Desktop tại: ${tDataPath}`);
      return tDataPath;
    } else {
      console.log('Không tìm thấy thư mục Telegram Desktop mặc định');
      return null;
    }
  } catch (error) {
    console.error('Lỗi khi tìm thư mục Telegram Desktop:', error);
    return null;
  }
}

const stringSession = new StringSession(sessionString);

// Initialize the Telegram client
const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// Function to initialize and connect the client
async function initTelegramClient() {
  try {
    // Kiểm tra nếu sử dụng session từ Telegram Desktop
    if (useDesktopSession && desktopSessionPath) {
      console.log('Đang thử sử dụng session từ Telegram Desktop...');
      // Lưu ý: Đây là một tính năng thử nghiệm, cần xác thực thêm
      // TeleDrive sẽ không thể đọc trực tiếp session của Telegram Desktop
      // nhưng chúng ta có thể gợi ý người dùng cách đăng nhập nhanh hơn
      console.log('Hướng dẫn: Mở Telegram Desktop, sau đó chạy lại TeleDrive');
    }
    
    await client.connect();
    
    // Check if we need to sign in
    if (!client.connected) {
      throw new Error('Không thể kết nối tới Telegram');
    }
    
    if (!await client.isUserAuthorized()) {
      console.log('Bạn cần đăng nhập vào Telegram trước');
      return false;
    }
    
    // Save the session string to reuse it later
    const newSessionString = client.session.save();
    if (newSessionString !== sessionString) {
      console.log('Đã tạo chuỗi session mới. Vui lòng cập nhật file .env của bạn:');
      console.log(`SESSION_STRING=${newSessionString}`);
    }
    
    console.log('Đã kết nối tới Telegram');
    return true;
  } catch (error) {
    console.error('Lỗi khi kết nối tới Telegram:', error);
    return false;
  }
}

module.exports = {
  client,
  initTelegramClient,
  findDefaultTelegramDesktopPath
}; 