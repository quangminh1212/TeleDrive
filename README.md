# TeleDrive - Telegram File Manager

Công cụ quét và quản lý file từ các kênh Telegram với giao diện web hiện đại.

## 🚀 Sử dụng nhanh

### Khởi động Web Interface (mặc định):
```batch
run.bat
```
Truy cập: http://localhost:5000

### Chạy Scanner CLI:
```batch
run.bat scanner
```

### Cấu hình:
```batch
run.bat config
```

## ✨ Tính năng

- 🌐 **Web Interface** - Giao diện web hiện đại
- 🔐 **Authentication** - Đăng nhập bảo mật
- 📊 **Dashboard** - Xem và quản lý file
- 🔍 **Search & Filter** - Tìm kiếm và lọc file
- 📁 **Multi-format** - CSV, JSON, Excel
- 🇻🇳 **Tiếng Việt** - Giao diện tiếng Việt


## 🔧 Cấu hình API

### 1. Lấy Telegram API Credentials
1. Truy cập: https://my.telegram.org/apps
2. Đăng nhập bằng số điện thoại
3. Tạo ứng dụng mới:
   - **App title**: Telegram Unlimited Driver
   - **Short name**: TeleDrive
4. Lưu lại **API ID** và **API Hash**

### 2. Cấu hình credentials
API credentials đã được cấu hình sẵn:
- **API ID**: 21272067
- **API Hash**: b7690dc86952dbc9b16717b101164af3
- **Phone**: +84936374950

### 3. Đăng nhập lần đầu
```bash
python telegram_login.py
```

## 📁 Cấu hình nâng cao

Chỉnh sửa file `config.json` nếu cần:
```json
{
  "telegram": {
    "api_id": "21272067",
    "api_hash": "b7690dc86952dbc9b16717b101164af3",
    "phone_number": "+84936374950"
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

## 📊 Kết quả

File lưu trong `output/`: CSV, JSON, Excel

## 🌐 Web Interface

**Lần đầu sử dụng:**
1. Truy cập: http://localhost:5000/setup
2. Tạo tài khoản admin
3. Đăng nhập và sử dụng

**Tính năng:**
- 🔐 Authentication & User Management
- 📁 File Manager với Search & Filter
- 📊 Statistics & Download links
- 📱 Responsive design

## 🛠️ Yêu cầu

- Python 3.7+
- Telegram API credentials
- Windows (batch files)

