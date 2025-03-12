const MTProto = require('@mtproto/core');
const { resolve } = require('path');
const fs = require('fs');
require('dotenv').config();

// Thư mục lưu trữ phiên
const SESSION_PATH = resolve(__dirname, '.telegram-sessions');
if (!fs.existsSync(SESSION_PATH)) {
  fs.mkdirSync(SESSION_PATH, { recursive: true });
}

// Khởi tạo API Telegram
const initTelegramClient = () => {
  console.log('[TelegramClient] Đang khởi tạo...');
  
  const API_ID = process.env.TELEGRAM_API_ID;
  const API_HASH = process.env.TELEGRAM_API_HASH;
  
  if (!API_ID || !API_HASH) {
    console.error('[TelegramClient] Thiếu cấu hình API_ID hoặc API_HASH. Vui lòng đăng ký ứng dụng tại https://my.telegram.org');
    return null;
  }
  
  try {
    // Khởi tạo MTProto client
    const mtproto = new MTProto({
      api_id: API_ID,
      api_hash: API_HASH,
      storageOptions: {
        path: resolve(SESSION_PATH, 'storage.json'),
      },
    });
    
    console.log('[TelegramClient] Đã khởi tạo thành công');
    return mtproto;
  } catch (error) {
    console.error('[TelegramClient] Lỗi khởi tạo:', error);
    return null;
  }
};

// Kiểm tra trạng thái đăng nhập
const checkAuth = async (mtproto) => {
  if (!mtproto) return false;
  
  try {
    const { user } = await mtproto.call('users.getFullUser', {
      id: {
        _: 'inputUserSelf',
      },
    });
    
    console.log('[TelegramClient] Đã đăng nhập: ', user.first_name);
    return { success: true, user };
  } catch (error) {
    if (error.error_message === 'AUTH_KEY_UNREGISTERED') {
      console.log('[TelegramClient] Chưa đăng nhập');
      return { success: false, error: 'NOT_LOGGED_IN' };
    } else if (error.error_message === 'SESSION_PASSWORD_NEEDED') {
      return { success: false, error: 'PASSWORD_NEEDED' };
    } else {
      console.error('[TelegramClient] Lỗi kiểm tra đăng nhập:', error);
      return { success: false, error: error.error_message };
    }
  }
};

// Gửi mã xác nhận đăng nhập
const sendCode = async (mtproto, phone) => {
  try {
    // Đảm bảo số điện thoại đúng định dạng (có dấu +)
    const formattedPhone = phone.startsWith('+') ? phone : '+' + phone;
    
    console.log(`[TelegramClient] Đang gửi mã xác nhận cho: ${formattedPhone}`);
    
    const result = await mtproto.call('auth.sendCode', {
      phone_number: formattedPhone.replace('+', ''), // Telegram API cần số điện thoại không có dấu +
      settings: {
        _: 'codeSettings',
      },
    });
    
    console.log(`[TelegramClient] Đã gửi mã xác nhận, hash: ${result.phone_code_hash.substring(0, 5)}...`);
    return { success: true, phone_code_hash: result.phone_code_hash };
  } catch (error) {
    console.error('[TelegramClient] Lỗi gửi mã:', error);
    // Trả về thông báo lỗi cụ thể hơn
    return { 
      success: false, 
      error: error.error_message || error.message || 'Không thể gửi mã xác nhận',
      details: error 
    };
  }
};

// Đăng nhập với mã xác nhận
const signIn = async (mtproto, { phone, code, phone_code_hash }) => {
  try {
    // Đảm bảo số điện thoại đúng định dạng (có dấu +)
    const formattedPhone = phone.startsWith('+') ? phone : '+' + phone;
    
    console.log(`[TelegramClient] Đang đăng nhập với mã: ${code}, phone: ${formattedPhone}`);
    
    const result = await mtproto.call('auth.signIn', {
      phone_number: formattedPhone.replace('+', ''), // Telegram API cần số điện thoại không có dấu +
      phone_code_hash,
      phone_code: code,
    });
    
    console.log('[TelegramClient] Đăng nhập thành công:', result.user.first_name);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('[TelegramClient] Lỗi đăng nhập:', error);
    
    if (error.error_message === 'SESSION_PASSWORD_NEEDED') {
      return { success: false, error: 'PASSWORD_NEEDED' };
    }
    
    // Trả về thông báo lỗi cụ thể hơn
    return { 
      success: false, 
      error: error.error_message || error.message || 'Không thể đăng nhập',
      details: error 
    };
  }
};

// Đăng nhập với mật khẩu hai lớp
const checkPassword = async (mtproto, password) => {
  try {
    const { srp_id, current_algo, srp_B } = await mtproto.call('account.getPassword');
    // Xử lý xác thực SRP phức tạp - cần thêm logic xử lý password
    
    // Giả định đã xử lý password SRP
    const result = await mtproto.call('auth.checkPassword', {
      password: {
        _: 'inputCheckPasswordSRP',
        srp_id,
        A: 'processed_A',
        M1: 'processed_M1'
      }
    });
    
    return { success: true, user: result.user };
  } catch (error) {
    console.error('[TelegramClient] Lỗi kiểm tra mật khẩu:', error);
    return { success: false, error: error.error_message };
  }
};

// Upload file lên Telegram
const uploadFile = async (mtproto, filePath, caption = '') => {
  if (!mtproto) return { success: false, error: 'Chưa đăng nhập Telegram' };
  
  try {
    console.log(`[TelegramClient] Đang tải file: ${filePath}`);
    
    // Đọc file
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = filePath.split('/').pop();
    
    // Thực hiện upload file
    // (Lưu ý: Code thực tế cần phân chia file thành các phần nhỏ - chunking)
    
    // Upload lên Saved Messages
    const result = await mtproto.call('messages.sendMedia', {
      peer: {
        _: 'inputPeerSelf',
      },
      media: {
        _: 'inputMediaUploadedDocument',
        file: fileBuffer,
        mime_type: 'application/octet-stream', // Tự động xác định từ file
        attributes: [
          {
            _: 'documentAttributeFilename',
            file_name: fileName,
          },
        ],
      },
      message: caption || fileName,
      random_id: Math.floor(Math.random() * 0xFFFFFFFF), // Random ID cho message
    });
    
    console.log(`[TelegramClient] Upload thành công: ${fileName}`);
    return { success: true, result };
  } catch (error) {
    console.error('[TelegramClient] Lỗi upload file:', error);
    return { success: false, error: error.error_message || error.message };
  }
};

// Đăng xuất
const logOut = async (mtproto) => {
  if (!mtproto) return { success: false };
  
  try {
    await mtproto.call('auth.logOut');
    console.log('[TelegramClient] Đã đăng xuất');
    return { success: true };
  } catch (error) {
    console.error('[TelegramClient] Lỗi đăng xuất:', error);
    return { success: false, error: error.error_message };
  }
};

module.exports = {
  initTelegramClient,
  checkAuth,
  sendCode,
  signIn,
  checkPassword,
  uploadFile,
  logOut
}; 