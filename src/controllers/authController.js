const { client, findDefaultTelegramDesktopPath } = require('../config/telegram');
const { StringSession } = require('gramjs/sessions');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for user input
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Controller for authentication
class AuthController {
  // Check if there's a way to login with Telegram Desktop
  static async checkTelegramDesktopLogin() {
    const tDataPath = findDefaultTelegramDesktopPath();
    
    if (tDataPath) {
      console.log('\n=== HƯỚNG DẪN ĐĂNG NHẬP NHANH ===');
      console.log('Tìm thấy cài đặt Telegram Desktop trên máy tính của bạn.');
      console.log('Để đăng nhập nhanh, bạn có thể:');
      console.log('1. Đảm bảo rằng Telegram Desktop đã đăng nhập');
      console.log('2. Thêm dòng sau vào file .env:');
      console.log('   USE_TELEGRAM_DESKTOP=true');
      console.log('   TELEGRAM_DESKTOP_PATH=' + tDataPath);
      console.log('3. Khởi động lại ứng dụng');
      console.log('===============================\n');
      
      // Kiểm tra xem Telegram Desktop có đang chạy không
      const isRunning = await this.checkTelegramDesktopRunning();
      
      if (isRunning) {
        console.log('✅ Telegram Desktop đang chạy. Bạn có thể sử dụng session hiện tại.');
      } else {
        console.log('❌ Telegram Desktop không chạy. Vui lòng mở Telegram Desktop và đăng nhập trước.');
      }
      
      return true;
    }
    
    return false;
  }
  
  // Check if Telegram Desktop is running
  static async checkTelegramDesktopRunning() {
    try {
      // Phương pháp đơn giản để kiểm tra Telegram có đang chạy không
      // Chú ý: Phương pháp này khác nhau trên các hệ điều hành khác nhau
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        const result = execSync('tasklist /FI "IMAGENAME eq Telegram.exe" /NH', { encoding: 'utf-8' });
        return result.includes('Telegram.exe');
      } else if (process.platform === 'darwin') {
        // macOS
        const { execSync } = require('child_process');
        const result = execSync('ps aux | grep -v grep | grep "Telegram"', { encoding: 'utf-8' });
        return result.includes('Telegram');
      } else {
        // Linux
        const { execSync } = require('child_process');
        const result = execSync('ps aux | grep -v grep | grep "telegram-desktop"', { encoding: 'utf-8' });
        return result.includes('telegram-desktop');
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra Telegram Desktop:', error);
      return false;
    }
  }

  // Start the login process
  static async login() {
    try {
      // Check if already logged in
      if (await client.isUserAuthorized()) {
        console.log('Đã đăng nhập vào Telegram');
        return { success: true, session: client.session.save() };
      }
      
      // Check for Telegram Desktop session
      await this.checkTelegramDesktopLogin();
      
      // Start the login process
      console.log('Bắt đầu quá trình đăng nhập Telegram...');
      
      // Ask for phone number
      const phoneNumber = await question('Vui lòng nhập số điện thoại của bạn (có mã quốc gia, vd: +84912345678): ');
      
      // Send the code
      const { phoneCodeHash } = await client.sendCode({
        apiId: client.apiId,
        apiHash: client.apiHash,
        phoneNumber
      });
      
      // Ask for the code
      const phoneCode = await question('Vui lòng nhập mã xác thực bạn đã nhận được: ');
      
      // Sign in with the code
      try {
        const user = await client.signIn({
          phoneNumber,
          phoneCodeHash,
          phoneCode
        });
        
        console.log('Đăng nhập Telegram thành công');
        
        // Save the session for future use
        const sessionString = client.session.save();
        console.log('Vui lòng thêm dòng này vào file .env của bạn:');
        console.log(`SESSION_STRING=${sessionString}`);
        
        // Thử cập nhật file .env tự động
        this.updateEnvFile('SESSION_STRING', sessionString);
        
        return { success: true, session: sessionString };
      } catch (error) {
        // Check if we need a password (2FA)
        if (error.message === 'SESSION_PASSWORD_NEEDED') {
          console.log('Xác thực hai yếu tố đã được bật');
          
          // Ask for the password
          const password = await question('Vui lòng nhập mật khẩu 2FA của bạn: ');
          
          // Complete login with password
          await client.checkPassword(password);
          
          console.log('Đăng nhập Telegram thành công với 2FA');
          
          // Save the session for future use
          const sessionString = client.session.save();
          console.log('Vui lòng thêm dòng này vào file .env của bạn:');
          console.log(`SESSION_STRING=${sessionString}`);
          
          // Thử cập nhật file .env tự động
          this.updateEnvFile('SESSION_STRING', sessionString);
          
          return { success: true, session: sessionString };
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Lỗi trong quá trình đăng nhập:', error);
      return { success: false, error: error.message };
    } finally {
      rl.close();
    }
  }
  
  // Update .env file automatically
  static updateEnvFile(key, value) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Check if the key already exists
        const regex = new RegExp(`^${key}=.*$`, 'm');
        
        if (regex.test(envContent)) {
          // Replace existing key
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          // Add new key
          envContent += `\n${key}=${value}`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log(`✅ File .env đã được cập nhật tự động với ${key}`);
      } else {
        console.log('❌ Không tìm thấy file .env để cập nhật');
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật file .env:', error);
    }
  }
  
  // Get the current user info
  static async getMe() {
    try {
      if (!await client.isUserAuthorized()) {
        return { success: false, error: 'Chưa đăng nhập' };
      }
      
      const me = await client.getMe();
      
      return {
        success: true,
        user: {
          id: me.id,
          firstName: me.firstName,
          lastName: me.lastName,
          username: me.username,
          phone: me.phone
        }
      };
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Logout from Telegram
  static async logout() {
    try {
      await client.logout();
      console.log('Đã đăng xuất khỏi Telegram');
      
      // Cập nhật SESSION_STRING trong .env
      this.updateEnvFile('SESSION_STRING', '');
      
      return { success: true };
    } catch (error) {
      console.error('Lỗi trong quá trình đăng xuất:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = AuthController; 