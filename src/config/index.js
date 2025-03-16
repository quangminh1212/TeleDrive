const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Đọc file .env nếu tồn tại
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`Đã đọc cấu hình từ ${envPath}`);
} else {
  console.log('Không tìm thấy file .env, sử dụng biến môi trường hệ thống');
}

// Cấu hình ứng dụng
const config = {
  // Cấu hình bot Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  
  // Cấu hình đồng bộ
  ENABLE_AUTO_SYNC: process.env.ENABLE_AUTO_SYNC === 'true' || process.env.AUTO_SYNC === 'true',
  SYNC_INTERVAL: parseInt(process.env.SYNC_INTERVAL || '60'),
  
  // Đường dẫn cơ sở
  BASE_URL: process.env.BASE_URL || 'http://localhost:3010',
  PORT: parseInt(process.env.PORT) || 3010,
  
  // Chế độ môi trường
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Hàm cập nhật biến môi trường
  updateEnv: async function(values) {
    try {
      let envContent = '';
      
      // Nếu file .env đã tồn tại, đọc nội dung
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Cập nhật từng giá trị
      for (const [key, value] of Object.entries(values)) {
        const regex = new RegExp(`^${key}=.*`, 'm');
        
        if (envContent.match(regex)) {
          // Cập nhật giá trị hiện có
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          // Thêm giá trị mới
          envContent += `\n${key}=${value}`;
        }
        
        // Cập nhật giá trị trong config
        this[key] = value;
        
        // Cập nhật biến môi trường
        process.env[key] = value;
      }
      
      // Ghi lại file .env
      fs.writeFileSync(envPath, envContent.trim());
      console.log('Đã cập nhật file .env thành công');
      
      return true;
    } catch (error) {
      console.error('Lỗi khi cập nhật file .env:', error.message);
      throw error;
    }
  }
};

module.exports = config; 