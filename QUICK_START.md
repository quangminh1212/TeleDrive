# 🚀 TeleDrive - Hướng dẫn khởi động nhanh

## ✅ API đã được cấu hình sẵn

### 📱 Telegram API Credentials
- **API ID**: 21272067
- **API Hash**: b7690dc86952dbc9b16717b101164af3
- **App Title**: Telegram Unlimited Driver
- **Phone**: +84936374950

### 🔐 Đăng nhập lần đầu
Nếu chưa đăng nhập Telegram, chạy:
```bash
python telegram_login.py
```

## ❌ Lỗi "Số điện thoại chưa được đăng ký" - ĐÃ SỬA

### 🔧 Nguyên nhân
Lỗi này xảy ra vì hệ thống chưa có admin user nào được tạo.

### ✅ Giải pháp

#### Cách 1: Sử dụng Web Interface (Khuyến nghị)
1. **Khởi động server:**
   ```bash
   python main.py
   ```

2. **Truy cập trang setup:**
   - Mở browser: http://localhost:5000
   - Hệ thống sẽ tự động redirect đến `/setup`

3. **Tạo admin user:**
   - Nhập username (ít nhất 3 ký tự)
   - Nhập số điện thoại (VD: 0936374950)
   - Nhập email (tùy chọn)
   - Click "Tạo tài khoản Admin"

4. **Đăng nhập:**
   - Sau khi tạo thành công, truy cập `/login`
   - Nhập số điện thoại đã đăng ký
   - Nhận và nhập mã OTP từ Telegram

#### Cách 2: Sử dụng Command Line
```bash
python create_admin.py
```

### 📱 Quy trình đăng nhập
1. **Nhập số điện thoại** đã đăng ký
2. **Nhận mã OTP** qua Telegram
3. **Nhập mã OTP** để đăng nhập

### 🔍 Kiểm tra admin user hiện có
```bash
python create_admin.py
```
Script sẽ hiển thị danh sách users nếu đã có admin.

### 🛠️ Troubleshooting

#### Lỗi "Không tìm thấy user với số điện thoại"
- Đảm bảo số điện thoại đã được đăng ký trong hệ thống
- Kiểm tra format số điện thoại (VD: +84936374950)

#### Lỗi "Mã OTP không đúng"
- Kiểm tra kết nối Telegram
- Đảm bảo bot có thể gửi tin nhắn đến số điện thoại

#### Server không khởi động
```bash
# Kiểm tra dependencies
pip install -r requirements.txt

# Kiểm tra cấu hình
cp .env.example .env
# Chỉnh sửa .env với API credentials
```

### 📋 Thông tin hệ thống
- **Database:** SQLite (instance/teledrive.db)
- **Port:** 5000
- **Debug mode:** Enabled (development)

### 🎯 Các bước tiếp theo
1. ✅ Tạo admin user
2. ✅ Đăng nhập thành công
3. 🔧 Cấu hình Telegram API credentials
4. 📱 Test gửi/nhận OTP
5. 🚀 Sử dụng TeleDrive File Manager

---
**Lưu ý:** Đây là phiên bản development. Trong production, hãy thay đổi SECRET_KEY và sử dụng HTTPS.
