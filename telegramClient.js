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
console.log('[MTProto] Bắt đầu khởi tạo kết nối MTProto...');
console.log('[MTProto] API_ID:', process.env.TELEGRAM_API_ID);
console.log('[MTProto] API_HASH:', process.env.TELEGRAM_API_HASH ? `${process.env.TELEGRAM_API_HASH.substring(0, 5)}...` : 'không có');
console.log('[MTProto] Session path:', path.join(SESSION_DIR, 'telegram-session.json'));

const mtproto = new MTProto({
  api_id: parseInt(process.env.TELEGRAM_API_ID || 0),
  api_hash: process.env.TELEGRAM_API_HASH || '',
  storageOptions: {
    path: path.join(SESSION_DIR, 'telegram-session.json'),
  },
});

// Hàm xử lý các method API của Telegram
const callApi = async (method, params = {}, options = {}) => {
  console.log(`[Telegram API] Gọi method ${method} với tham số:`, JSON.stringify(params, null, 2));
  try {
    const result = await mtproto.call(method, params, options);
    console.log(`[Telegram API] Kết quả từ method ${method}:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.log(`[Telegram API] Lỗi trong method ${method}:`, error);
    
    // Xử lý lỗi chi tiết hơn
    if (error.error_code) {
      console.log(`[Telegram API] Mã lỗi: ${error.error_code}, Thông báo: ${error.error_message}`);
    }
    
    // Xử lý lỗi AUTH_KEY_UNREGISTERED - cần đăng nhập lại
    if (error.error_code === 401) {
      console.log('[Telegram API] Lỗi xác thực 401: Cần đăng nhập lại');
      return {
        error: error.error_message || 'Bạn cần phải đăng nhập lại'
      };
    }
    
    // Xử lý lỗi FLOOD_WAIT
    if (error.error_message && error.error_message.includes('FLOOD_WAIT')) {
      const waitTime = error.error_message.match(/FLOOD_WAIT_(\d+)/);
      const seconds = waitTime ? parseInt(waitTime[1]) : 60;
      
      console.log(`[Telegram API] FLOOD_WAIT: Cần chờ ${seconds} giây trước khi thử lại`);
      
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
  console.log('[SendCode] Bắt đầu gửi mã xác nhận...');
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
      console.log('[SendCode] Phát hiện số Việt Nam bắt đầu bằng 0, đang định dạng lại...');
      formattedPhone = '+84' + formattedPhone.substring(4);
    }
    
    console.log(`[SendCode] Gửi mã xác nhận đến SĐT: ${formattedPhone} với API ID: ${apiId}`);
    
    // Kiểm tra API ID và API Hash
    if (!apiId || !apiHash) {
      console.log('[SendCode] Lỗi: Thiếu API ID hoặc API Hash');
      throw new Error('Không tìm thấy API ID hoặc API Hash. Vui lòng kiểm tra cấu hình.');
    }
    
    console.log('[SendCode] Gọi auth.sendCode với các tham số:');
    console.log({
      phone_number: formattedPhone.replace('+', ''),
      api_id: apiId,
      api_hash: apiHash
    });
    
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
    
    console.log('[SendCode] Kết quả gửi mã:', JSON.stringify(result, null, 2));
    return {
      success: true,
      phone_code_hash: result.phone_code_hash,
      type: result.type?._,
      phone: formattedPhone // Trả về số điện thoại đã được định dạng
    };
  } catch (error) {
    console.error('[SendCode] Lỗi gửi mã xác nhận:', error);
    console.error('[SendCode] Stack trace:', error.stack);
    
    // Xử lý các lỗi cụ thể
    if (error.error_message?.includes('PHONE_NUMBER_INVALID')) {
      console.log('[SendCode] Lỗi: Số điện thoại không hợp lệ');
      return {
        success: false,
        error: 'PHONE_NUMBER_INVALID',
        details: {
          message: 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.',
          providedPhone: phone
        }
      };
    }
    
    if (error.error_message?.includes('API_ID_INVALID')) {
      console.log('[SendCode] Lỗi: API ID không hợp lệ');
      return {
        success: false,
        error: 'API_ID_INVALID',
        details: {
          message: 'API ID không hợp lệ. Vui lòng kiểm tra lại cấu hình.',
          providedApiId: apiId
        }
      };
    }
    
    return {
      success: false,
      error: error.message,
      details: {
        phone: phone,
        apiIdProvided: !!apiId,
        apiHashProvided: !!apiHash
      }
    };
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
  console.log('[CheckAuth] Đang kiểm tra trạng thái đăng nhập...');
  try {
    console.log('[CheckAuth] Gọi users.getFullUser với inputUserSelf');
    const result = await mtproto.call('users.getFullUser', {
      id: {
        _: 'inputUserSelf'
      }
    });
    
    console.log('[CheckAuth] Nhận được kết quả từ users.getFullUser:', JSON.stringify(result, null, 2));
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
    console.log('[CheckAuth] Lỗi kiểm tra đăng nhập:', error);
    
    // Log chi tiết về lỗi
    if (error.error_code) {
      console.log(`[CheckAuth] Mã lỗi: ${error.error_code}, Thông báo: ${error.error_message}`);
    }
    
    if (error.error_message === 'AUTH_KEY_UNREGISTERED') {
      console.log('[CheckAuth] Chưa đăng nhập: AUTH_KEY_UNREGISTERED');
      console.log('[CheckAuth] Cần đăng nhập thông qua giao diện web với API ID và API Hash');
    }
    
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