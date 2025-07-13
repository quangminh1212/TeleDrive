# TeleDrive Login System - Hướng Dẫn Sử Dụng

## 🔐 Tổng Quan

TeleDrive hiện đã có hệ thống đăng nhập hoàn chỉnh với giao diện đẹp mắt, tương tự như Telegram Desktop. Hệ thống hỗ trợ:

- ✅ **Đăng nhập bằng số điện thoại**
- ✅ **Xác thực mã OTP qua Telegram**
- ✅ **Hỗ trợ xác thực hai bước (2FA)**
- ✅ **Giao diện responsive cho mobile**
- ✅ **Quản lý session tự động**
- ✅ **Logout an toàn**

## 🚀 Cách Sử Dụng

### 1. Khởi Động Ứng Dụng

```bash
# Chạy server UI
python ui_server.py

# Hoặc sử dụng batch file (Windows)
run_ui.bat
```

### 2. Truy Cập Giao Diện

Mở trình duyệt và truy cập: `http://localhost:5000`

### 3. Quy Trình Đăng Nhập

#### Bước 1: Nhập Số Điện Thoại
- Chọn mã quốc gia (mặc định: +84 cho Việt Nam)
- Nhập số điện thoại (ví dụ: 936374950)
- Click "Gửi mã xác thực"

#### Bước 2: Nhập Mã Xác Thực
- Telegram sẽ gửi mã 5 số đến tài khoản của bạn
- Nhập mã vào ô input
- Mã sẽ tự động submit khi đủ 5 số
- Có thể click "Gửi lại mã" sau 60 giây

#### Bước 3: Xác Thực Hai Bước (Nếu Có)
- Nếu tài khoản có bật 2FA, sẽ hiện form nhập mật khẩu
- Nhập mật khẩu hai bước của Telegram
- Click "Đăng nhập"

#### Bước 4: Hoàn Thành
- Hiển thị màn hình chào mừng
- Tự động chuyển đến giao diện chính
- Thông tin user hiển thị ở header

## 🎨 Giao Diện Login

### Thiết Kế
- **Background**: Gradient xanh Telegram (#0088cc → #00a0e6)
- **Modal**: Card trắng bo góc với shadow đẹp
- **Logo**: Tích hợp logo.png của dự án
- **Animation**: Smooth transitions và loading states
- **Responsive**: Hoạt động tốt trên mobile

### Các Thành Phần
1. **Header**: Logo + tên ứng dụng + mô tả
2. **Phone Step**: Country selector + phone input
3. **Code Step**: 5-digit code input với countdown
4. **2FA Step**: Password input với toggle visibility
5. **Success Step**: Welcome message với user info
6. **Error Display**: Thông báo lỗi rõ ràng

## 🔧 Tính Năng Kỹ Thuật

### Frontend (JavaScript)
- **Class-based architecture** với TeleDriveApp
- **Async/await** cho API calls
- **Step management** với smooth transitions
- **Error handling** với user-friendly messages
- **Auto-focus** và keyboard shortcuts
- **Countdown timer** cho resend code

### Backend (Python/Flask)
- **RESTful API** endpoints cho authentication
- **Telethon integration** cho Telegram API
- **Session management** tự động
- **Error handling** với proper HTTP codes
- **Security** với input validation

### API Endpoints
```
POST /api/auth/send-code     # Gửi mã xác thực
POST /api/auth/verify-code   # Xác thực mã
POST /api/auth/verify-2fa    # Xác thực 2FA
POST /api/auth/logout        # Đăng xuất
GET  /api/auth/status        # Kiểm tra trạng thái
GET  /api/config/phone       # Lấy số điện thoại từ config
```

## 🛠️ Cấu Hình

### Config.json
Đảm bảo file `config.json` có thông tin đúng:

```json
{
  "telegram": {
    "api_id": "your_api_id",
    "api_hash": "your_api_hash",
    "phone_number": "+84936374950",
    "session_name": "telegram_scanner_session"
  }
}
```

### Session File
- Session được lưu tự động sau khi đăng nhập thành công
- File session: `telegram_scanner_session.session`
- Không cần đăng nhập lại nếu session còn hợp lệ

## 🔍 Troubleshooting

### Lỗi Thường Gặp

**1. "Số điện thoại không hợp lệ"**
- Kiểm tra format: +84936374950
- Đảm bảo có mã quốc gia
- Số phải đã đăng ký Telegram

**2. "Mã xác thực không đúng"**
- Kiểm tra mã trong Telegram app
- Mã có thể hết hạn (5 phút)
- Thử gửi lại mã mới

**3. "Lỗi kết nối"**
- Kiểm tra internet connection
- Verify API credentials trong config.json
- Restart server nếu cần

**4. "Mật khẩu hai bước không đúng"**
- Nhập đúng password 2FA của Telegram
- Không phải password của email/phone
- Có thể reset 2FA trong Telegram nếu quên

### Debug Mode

Chạy server với debug để xem log chi tiết:
```bash
python ui_server.py --debug
```

Kiểm tra browser console (F12) để xem lỗi JavaScript.

## 📱 Mobile Support

### Responsive Design
- **Phone input**: Stack vertically trên mobile
- **Code input**: Larger font size và spacing
- **Buttons**: Touch-friendly size
- **Modal**: Fit screen với proper margins

### Touch Interactions
- **Auto-focus**: Tự động focus input khi chuyển step
- **Keyboard**: Numeric keypad cho code input
- **Gestures**: Swipe back support

## 🔒 Bảo Mật

### Client-Side
- **Input validation** trước khi gửi API
- **XSS protection** với proper escaping
- **HTTPS ready** cho production

### Server-Side
- **Rate limiting** cho API calls
- **Input sanitization** 
- **Session security** với Telethon
- **Error masking** không expose sensitive info

## 🎯 Tính Năng Nâng Cao

### Auto-Login
- Kiểm tra session khi load app
- Tự động đăng nhập nếu session hợp lệ
- Redirect đến login nếu session expired

### User Management
- Hiển thị thông tin user ở header
- Click vào user info để logout
- Confirm dialog trước khi logout

### Error Recovery
- Retry mechanism cho network errors
- Graceful fallback cho API failures
- User-friendly error messages

## 🚀 Sử Dụng Thực Tế

### Lần Đầu Sử Dụng
1. Chạy `python test_login.py` để test cấu hình
2. Start UI server: `python ui_server.py`
3. Mở browser: `http://localhost:5000`
4. Đăng nhập với số điện thoại Telegram

### Sử Dụng Hàng Ngày
1. Mở browser: `http://localhost:5000`
2. Tự động đăng nhập (nếu có session)
3. Sử dụng các tính năng scan channel
4. Logout khi cần thiết

### Production Deployment
- Sử dụng HTTPS
- Configure proper domain
- Set up reverse proxy (nginx)
- Enable rate limiting
- Monitor logs

## 📞 Hỗ Trợ

Nếu gặp vấn đề:

1. **Kiểm tra logs** trong console
2. **Test cấu hình** với `test_login.py`
3. **Verify API credentials** trong config.json
4. **Check network connection**
5. **Restart server** nếu cần

## 🎉 Kết Luận

Hệ thống login TeleDrive đã hoàn thiện với:
- ✅ Giao diện đẹp, user-friendly
- ✅ Tích hợp hoàn chỉnh với Telegram API
- ✅ Bảo mật cao với session management
- ✅ Responsive design cho mọi thiết bị
- ✅ Error handling tốt
- ✅ Easy deployment và maintenance

Giờ bạn có thể sử dụng TeleDrive với giao diện web hiện đại và an toàn! 🚀
