# TeleDrive - Telegram File Manager

Công cụ quét và quản lý file từ các kênh Telegram với giao diện web hiện đại theo phong cách Telegram.

## 🚀 Sử dụng đơn giản

### Lần đầu:
```batch
setup.bat
```

### Chạy scanner:
```batch
run.bat
```

### Khởi động Web Interface:
```batch
web.bat           # Khởi động web interface
run.bat web       # Từ menu chính
```

### Cấu hình nhanh:
```batch
run.bat config
```

## ✨ Tính năng

### Scanner
- ✅ **Tự động hoàn toàn** - Không cần input
- ✅ **Menu cấu hình** - Thay đổi setting dễ dàng
- ✅ **Đa định dạng** - CSV, JSON, Excel
- ✅ **Tiếng Việt** - Giao diện tiếng Việt
- ✅ **Logging chi tiết** - Theo dõi quá trình

### Web Interface 🌐
- ✅ **Giao diện Telegram-style** - Thiết kế theo phong cách Telegram
- ✅ **File Manager** - Quản lý file trực quan
- ✅ **Tìm kiếm & Lọc** - Tìm file nhanh chóng
- ✅ **Responsive** - Tương thích mobile
- ✅ **Chi tiết file** - Xem thông tin đầy đủ
- ✅ **Download links** - Tải file trực tiếp
- ✅ **Multiple sessions** - Quản lý nhiều lần scan
- ✅ **Authentication System** - Đăng nhập/đăng xuất bảo mật
- ✅ **User Management** - Quản lý người dùng
- ✅ **Route Protection** - Bảo vệ tất cả endpoints

## 📁 Cấu hình

### File `.env` (API)
```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash  
TELEGRAM_PHONE=+84xxxxxxxxx
```

### File `config.json` (Cấu hình chính)
```json
{
  "telegram": {
    "api_id": "your_api_id",
    "api_hash": "your_api_hash",
    "phone_number": "+84xxxxxxxxx"
  },
  "channels": {
    "use_default_channel": true,
    "default_channel": "@your_channel_here"
  },
  "scanning": {
    "max_messages": 1000,
    "batch_size": 50,
    "file_types": {
      "documents": true,
      "photos": true,
      "videos": true,
      "audio": true
    }
  },
  "output": {
    "formats": {
      "csv": {"enabled": true},
      "json": {"enabled": true},
      "excel": {"enabled": true}
    }
  }
}
```

**⚠️ Quan trọng:**
- Thay `@your_channel_here` bằng channel thực tế
- **Public channel:** `@channelname`
- **Private channel:** `https://t.me/+xxxxx`

## 📊 Kết quả

File lưu trong `output/`:
- `telegram_files.csv`
- `telegram_files.json`
- `telegram_files.xlsx`

## 🌐 Web Interface

Sau khi chạy scanner, bạn có thể sử dụng giao diện web để quản lý file:

1. **Khởi động web interface:**
   ```batch
   web.bat
   ```

2. **Lần đầu sử dụng:**
   - Truy cập: http://localhost:5000/setup
   - Tạo tài khoản admin đầu tiên
   - Đăng nhập tại: http://localhost:5000/login

3. **Truy cập hàng ngày:**
   - URL: http://localhost:5000
   - Đăng nhập nếu chưa đăng nhập
   - Sử dụng như bình thường

4. **Tính năng:**
   - **🔐 Authentication:** Đăng nhập/đăng xuất bảo mật
   - **👤 User Management:** Quản lý người dùng
   - **🛡️ Route Protection:** Bảo vệ tất cả endpoints
   - **📁 File Manager:** Xem danh sách file theo dạng grid/list
   - **🔍 Search & Filter:** Tìm kiếm và lọc file
   - **📊 Statistics:** Thống kê chi tiết
   - **📱 Responsive:** Tương thích mobile
   - **⬇️ Download:** Tải file trực tiếp

5. **Giao diện:**
   - **Header:** Logo, search bar, user menu, thống kê
   - **Sidebar:** Danh sách các scan sessions
   - **Main:** File grid với toolbar và pagination
   - **Modal:** Chi tiết file với thông tin đầy đủ

## 🎮 Các file batch

### `setup.bat` - Cài đặt ban đầu
- Cài đặt Python packages
- Tạo file .env từ template
- Tạo thư mục output

### `run.bat` - Script chính (đã tích hợp web)
- `run.bat` - Chạy scanner
- `run.bat config` - Menu cấu hình
- `run.bat web` - Khởi động web interface
- `run.bat web-setup` - Cài đặt web dependencies

### `web.bat` - Khởi động web interface
- Khởi động web interface đơn giản và nhanh
- Tự động tạo venv và cài Flask + Authentication packages
- Khởi động Flask server tại http://localhost:5000

### `start_auth_test.bat` - Test authentication system
- Khởi động server với authentication
- Cài đặt tự động các dependencies cần thiết
- Hướng dẫn setup admin user đầu tiên

## 🔐 Authentication System

TeleDrive hiện có hệ thống xác thực bảo mật:

### Lần đầu sử dụng:
1. **Khởi động server:**
   ```batch
   start_auth_test.bat
   ```

2. **Thiết lập admin:**
   - Truy cập: http://localhost:5000/setup
   - Tạo tài khoản admin đầu tiên
   - Username, email, password

3. **Đăng nhập:**
   - Truy cập: http://localhost:5000/login
   - Sử dụng thông tin vừa tạo

### Tính năng bảo mật:
- ✅ **Mã hóa mật khẩu** với Werkzeug
- ✅ **Session management** với Flask-Login
- ✅ **Route protection** cho tất cả endpoints
- ✅ **User management** cơ bản
- ✅ **Responsive login UI** theo phong cách Telegram
- ✅ **Auto logout** khi session hết hạn

### Chi tiết:
Xem file `AUTHENTICATION.md` để biết thêm chi tiết về:
- Cách sử dụng
- API endpoints
- User management
- Troubleshooting
- Testing

## 🛠️ Troubleshooting

- **Lỗi API:** Kiểm tra `.env`
- **Lỗi config:** Chạy `run.bat config`
- **Thiếu dependencies:** Chạy `setup.bat`
- **Web interface không khởi động:** Chạy `web.bat`
- **Lỗi config.json.tmp:** Đã được khắc phục trong phiên bản mới
- **Không có dữ liệu:** Chạy scanner trước khi mở web interface
