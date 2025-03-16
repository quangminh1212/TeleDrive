/**
 * TeleDrive - Controller xác thực người dùng
 * File này quản lý xử lý logic xác thực người dùng
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

/**
 * Đọc thông tin người dùng từ file
 * @returns {Object} Thông tin người dùng
 */
function readUserInfo() {
  try {
    // Đường dẫn đến file thông tin người dùng
    const userPath = path.join(config.STORAGE_PATH, 'db', 'user.json');
    
    // Nếu file không tồn tại, tạo file mới với thông tin mặc định
    if (!fs.existsSync(userPath)) {
      const defaultUser = {
        password: generateHash('admin'), // Mật khẩu mặc định là 'admin'
        lastLogin: null,
        settings: {
          darkMode: false,
          autoSync: true
        }
      };
      
      const dbDir = path.dirname(userPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      fs.writeFileSync(userPath, JSON.stringify(defaultUser, null, 2));
      return defaultUser;
    }
    
    // Đọc file thông tin người dùng
    const data = fs.readFileSync(userPath, 'utf8');
    const user = JSON.parse(data);
    
    return user;
  } catch (error) {
    console.error('Lỗi khi đọc thông tin người dùng:', error);
    
    // Trả về thông tin mặc định nếu có lỗi
    return {
      password: generateHash('admin'),
      lastLogin: null,
      settings: {
        darkMode: false,
        autoSync: true
      }
    };
  }
}

/**
 * Lưu thông tin người dùng vào file
 * @param {Object} user Thông tin người dùng cần lưu
 * @returns {boolean} Kết quả lưu
 */
function saveUserInfo(user) {
  try {
    // Đường dẫn đến file thông tin người dùng
    const userPath = path.join(config.STORAGE_PATH, 'db', 'user.json');
    
    // Đảm bảo thư mục chứa file tồn tại
    const dbDir = path.dirname(userPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Ghi dữ liệu vào file
    fs.writeFileSync(userPath, JSON.stringify(user, null, 2));
    console.log('Đã lưu thông tin người dùng vào cơ sở dữ liệu.');
    return true;
  } catch (error) {
    console.error('Lỗi khi lưu thông tin người dùng:', error);
    return false;
  }
}

/**
 * Tạo hash mật khẩu
 * @param {string} password Mật khẩu cần hash
 * @returns {string} Hash của mật khẩu
 */
function generateHash(password) {
  // Sử dụng SHA-256 để hash mật khẩu
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
}

/**
 * Xác thực người dùng
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function login(req, res) {
  try {
    const { password } = req.body;
    
    // Kiểm tra mật khẩu
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập mật khẩu'
      });
    }
    
    // Đọc thông tin người dùng
    const user = readUserInfo();
    
    // Hash mật khẩu nhập vào
    const passwordHash = generateHash(password);
    
    // So sánh với mật khẩu đã lưu
    if (passwordHash !== user.password) {
      return res.status(401).json({
        success: false,
        error: 'Mật khẩu không đúng'
      });
    }
    
    // Cập nhật thời gian đăng nhập cuối cùng
    user.lastLogin = new Date().toISOString();
    saveUserInfo(user);
    
    // Tạo token đăng nhập
    const token = crypto.randomBytes(32).toString('hex');
    
    // Lưu token vào session hoặc cookie
    req.session.token = token;
    req.session.authenticated = true;
    
    return res.json({
      success: true,
      message: 'Đăng nhập thành công'
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Đăng xuất
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function logout(req, res) {
  try {
    // Xóa session
    req.session.destroy(err => {
      if (err) {
        console.error('Lỗi khi xóa session:', err);
        return res.status(500).json({
          success: false,
          error: 'Lỗi khi đăng xuất'
        });
      }
      
      return res.json({
        success: true,
        message: 'Đăng xuất thành công'
      });
    });
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Đổi mật khẩu
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Kiểm tra mật khẩu
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới'
      });
    }
    
    // Đọc thông tin người dùng
    const user = readUserInfo();
    
    // Hash mật khẩu hiện tại
    const currentPasswordHash = generateHash(currentPassword);
    
    // So sánh với mật khẩu đã lưu
    if (currentPasswordHash !== user.password) {
      return res.status(401).json({
        success: false,
        error: 'Mật khẩu hiện tại không đúng'
      });
    }
    
    // Hash mật khẩu mới
    const newPasswordHash = generateHash(newPassword);
    
    // Cập nhật mật khẩu
    user.password = newPasswordHash;
    saveUserInfo(user);
    
    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Lỗi khi đổi mật khẩu:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Kiểm tra xác thực
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function checkAuth(req, res, next) {
  // Kiểm tra xem người dùng đã đăng nhập chưa
  const isAuthenticated = req.session && req.session.authenticated;
  
  if (isAuthenticated) {
    // Người dùng đã đăng nhập
    return next();
  } else {
    // Người dùng chưa đăng nhập
    return res.status(401).json({
      success: false,
      error: 'Chưa đăng nhập'
    });
  }
}

/**
 * Lấy thông tin cài đặt người dùng
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function getSettings(req, res) {
  try {
    // Đọc thông tin người dùng
    const user = readUserInfo();
    
    // Lấy thông tin cài đặt
    const settings = user.settings || {
      darkMode: false,
      autoSync: true
    };
    
    return res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin cài đặt:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

/**
 * Cập nhật thông tin cài đặt người dùng
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function updateSettings(req, res) {
  try {
    const { settings } = req.body;
    
    // Kiểm tra dữ liệu cài đặt
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu cài đặt không hợp lệ'
      });
    }
    
    // Đọc thông tin người dùng
    const user = readUserInfo();
    
    // Cập nhật thông tin cài đặt
    user.settings = {
      ...user.settings,
      ...settings
    };
    
    // Lưu thông tin người dùng
    saveUserInfo(user);
    
    return res.json({
      success: true,
      message: 'Cập nhật cài đặt thành công',
      settings: user.settings
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật thông tin cài đặt:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + (error.message || 'Không xác định')
    });
  }
}

module.exports = {
  login,
  logout,
  changePassword,
  checkAuth,
  getSettings,
  updateSettings,
  readUserInfo,
  saveUserInfo
}; 