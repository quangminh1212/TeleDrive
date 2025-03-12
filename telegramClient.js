const MTProto = require('@mtproto/core');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const FileReader = require('filereader');
require('dotenv').config();

// Tạo thư mục lưu session
const SESSION_DIR = path.join(__dirname, '.telegram-sessions');
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Tạo localStorage giả lập cho môi trường Node.js
global.localStorage = {
  getItem: (key) => {
    try {
      const filePath = path.join(SESSION_DIR, `${key}.json`);
      return fs.existsSync(filePath)
        ? fs.readFileSync(filePath, 'utf8')
        : null;
    } catch (error) {
      console.error('Error reading localStorage:', error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      const filePath = path.join(SESSION_DIR, `${key}.json`);
      fs.writeFileSync(filePath, value, 'utf8');
    } catch (error) {
      console.error('Error writing localStorage:', error);
    }
  },
  removeItem: (key) => {
    try {
      const filePath = path.join(SESSION_DIR, `${key}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error removing localStorage item:', error);
    }
  }
};

// Thêm WebSocket và FileReader vào global để @mtproto/core có thể sử dụng
global.WebSocket = WebSocket;
global.FileReader = FileReader;

// Khởi tạo kết nối
const mtproto = new MTProto({
  api_id: parseInt(process.env.TELEGRAM_API_ID || 0),
  api_hash: process.env.TELEGRAM_API_HASH || '',
  storageOptions: {
    path: path.join(SESSION_DIR, 'telegram-session.json'),
  },
});

// Hàm xử lý các method API của Telegram
const callApi = async (method, params = {}, options = {}) => {
  try {
    const result = await mtproto.call(method, params, options);
    return result;
  } catch (error) {
    console.log(`Error in ${method}:`, error);
    
    // Xử lý lỗi AUTH_KEY_UNREGISTERED - cần đăng nhập lại
    if (error.error_code === 401) {
      return {
        error: error.error_message || 'Bạn cần phải đăng nhập lại'
      };
    }
    
    // Xử lý lỗi FLOOD_WAIT
    if (error.error_message && error.error_message.includes('FLOOD_WAIT')) {
      const waitTime = error.error_message.match(/FLOOD_WAIT_(\d+)/);
      const seconds = waitTime ? parseInt(waitTime[1]) : 60;
      
      console.log(`Waiting for ${seconds} seconds due to FLOOD_WAIT`);
      
      return {
        error: `FLOOD_WAIT_${seconds}`,
        seconds
      };
    }
    
    throw error;
  }
};

/**
 * Gửi yêu cầu xác thực bằng mã OTP qua Telegram
 * @param {string} phone Số điện thoại (với mã quốc gia, không có số 0 đầu)
 * @param {number} apiId API ID Telegram
 * @param {string} apiHash API Hash Telegram
 */
const sendCode = async (phone, apiId, apiHash) => {
  try {
    // Xử lý định dạng số điện thoại
    if (!phone) throw new Error('Số điện thoại không được để trống');
    
    let formattedPhone = phone.trim();
    
    // Đảm bảo bắt đầu bằng dấu +
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    // Loại bỏ tất cả ký tự không phải số sau dấu +
    formattedPhone = '+' + formattedPhone.substring(1).replace(/\D/g, '');
    
    // Xử lý riêng cho số Việt Nam (+84): nếu có số 0 sau mã quốc gia, loại bỏ nó
    if (formattedPhone.startsWith('+840')) {
      console.log('Phát hiện số Việt Nam bắt đầu bằng 0, đang định dạng lại...');
      formattedPhone = '+84' + formattedPhone.substring(4);
    }
    
    console.log(`Sending code to phone: ${formattedPhone} with API ID: ${apiId} and API Hash: ${apiHash}`);
    
    // Kiểm tra API ID và API Hash
    if (!apiId || !apiHash) {
      throw new Error('Không tìm thấy API ID hoặc API Hash. Vui lòng kiểm tra cấu hình.');
    }
    
    const result = await mtproto.call('auth.sendCode', {
      phone_number: formattedPhone.replace('+', ''),
      settings: {
        _: 'codeSettings',
        allow_flashcall: false,
        allow_missed_call: false,
        allow_app_hash: true,
      },
      api_id: apiId,
      api_hash: apiHash
    });
    
    console.log('Send code result:', JSON.stringify(result, null, 2));
    return {
      phone_code_hash: result.phone_code_hash,
      type: result.type?._,
      phone: formattedPhone // Trả về số điện thoại đã được định dạng
    };
  } catch (error) {
    console.error('Error sending code:', error);
    
    // Xử lý các lỗi cụ thể
    if (error.error_message?.includes('PHONE_NUMBER_INVALID')) {
      throw new Error('PHONE_NUMBER_INVALID: Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.');
    }
    
    throw error;
  }
};

/**
 * Đăng nhập bằng số điện thoại và mã xác nhận
 * @param {string} phone Số điện thoại (với mã quốc gia)
 * @param {string} phoneCodeHash Mã hash nhận được từ sendCode
 * @param {string} code Mã xác nhận người dùng nhập
 */
const signIn = async (phone, phoneCodeHash, code) => {
  try {
    // Xử lý định dạng số điện thoại
    let formattedPhone = phone.trim();
    
    // Đảm bảo bắt đầu bằng dấu +
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    // Loại bỏ tất cả ký tự không phải số sau dấu +
    formattedPhone = '+' + formattedPhone.substring(1).replace(/\D/g, '');
    
    console.log(`Signing in with phone: ${formattedPhone}, code: ${code}, hash: ${phoneCodeHash}`);
    
    const result = await mtproto.call('auth.signIn', {
      phone_number: formattedPhone.replace('+', ''),
      phone_code_hash: phoneCodeHash,
      phone_code: code
    });
    
    console.log('Sign in result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error signing in:', error);
    
    // Xử lý lỗi SESSION_PASSWORD_NEEDED
    if (error.error_message === 'SESSION_PASSWORD_NEEDED') {
      throw new Error('SESSION_PASSWORD_NEEDED');
    }
    
    // Xử lý lỗi PHONE_CODE_INVALID
    if (error.error_message?.includes('PHONE_CODE_INVALID')) {
      throw new Error('PHONE_CODE_INVALID: Mã xác nhận không đúng.');
    }
    
    // Xử lý lỗi PHONE_CODE_EXPIRED
    if (error.error_message?.includes('PHONE_CODE_EXPIRED')) {
      throw new Error('PHONE_CODE_EXPIRED: Mã xác nhận đã hết hạn.');
    }
    
    throw error;
  }
};

/**
 * Upload file lên Telegram
 * @param {string} filePath Đường dẫn tới file cần upload
 * @param {string} caption Mô tả cho file
 */
const uploadFile = async (filePath, caption = '') => {
  try {
    // Kiểm tra xem file có tồn tại không
    if (!fs.existsSync(filePath)) {
      throw new Error(`File không tồn tại: ${filePath}`);
    }
    
    // Đọc nội dung file
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    console.log(`Uploading file: ${fileName} (${fileContent.length} bytes)`);
    
    // Kiểm tra ID chat Telegram
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) {
      throw new Error('TELEGRAM_CHAT_ID không được cấu hình trong file .env');
    }
    
    // Xác định loại file dựa vào phần mở rộng
    const fileExt = path.extname(fileName).toLowerCase();
    const mimeType = getMimeType(fileExt);
    
    // Chuẩn bị thông tin media để upload
    let attributes = [
      {
        _: 'documentAttributeFilename',
        file_name: fileName
      }
    ];
    
    // Upload file lên Telegram
    const result = await mtproto.call('messages.sendMedia', {
      peer: {
        _: 'inputPeerChat',
        chat_id: parseInt(chatId.replace('-100', ''))
      },
      media: {
        _: 'inputMediaUploadedDocument',
        file: {
          _: 'inputFile',
          id: Math.floor(Math.random() * 999999999),
          parts: 1,
          name: fileName,
          md5_checksum: '',
        },
        mime_type: mimeType,
        attributes: attributes,
        caption: caption || ''
      },
      random_id: Math.floor(Math.random() * 999999999)
    });
    
    console.log('File uploaded successfully:', result);
    
    return {
      success: true,
      result: result
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Lấy MIME type từ phần mở rộng file
 * @param {string} extension Phần mở rộng file (.jpg, .pdf, ...)
 * @returns {string} MIME type
 */
function getMimeType(extension) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Kiểm tra xem đã đăng nhập chưa
 */
const checkAuth = async () => {
  try {
    const result = await mtproto.call('users.getFullUser', {
      id: {
        _: 'inputUserSelf'
      }
    });
    
    console.log('User data:', result);
    return {
      authorized: true,
      user: {
        id: result.user.id,
        name: `${result.user.first_name} ${result.user.last_name || ''}`.trim(),
        username: result.user.username || null,
        phone: result.user.phone
      }
    };
  } catch (error) {
    console.log('Auth check error:', error);
    return {
      authorized: false,
      error: error.message
    };
  }
};

// Export các hàm
module.exports = {
  mtproto,
  callApi,
  sendCode,
  signIn,
  uploadFile,
  checkAuth
}; 