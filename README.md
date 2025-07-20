# 🚀 TeleDrive - Modern Telegram File Manager

> **Professional file management for your Telegram files with Windows Explorer-style interface**

TeleDrive là một ứng dụng web hiện đại để quản lý và tổ chức files từ Telegram. Với giao diện giống Windows Explorer, TeleDrive giúp bạn dễ dàng tìm kiếm, xem trước và tải xuống files từ các cuộc trò chuyện Telegram của mình.

## 🚀 Sử dụng nhanh

### ⚡ Quick Start:
```batch
# Chạy từ thư mục gốc (KHUYẾN NGHỊ)
run.bat

# Hoặc chạy trực tiếp
python main.py
```
Truy cập: http://localhost:5000

### 🔧 Các tùy chọn:
```batch
run.bat            # Web interface (mặc định)
run.bat production # Production server
run.bat scanner    # Scanner CLI
run.bat config     # Menu cấu hình
```

### 📖 Hướng dẫn chi tiết:
Xem file [QUICK_START.md](QUICK_START.md) để biết hướng dẫn đầy đủ.

## ✨ Tính năng

- 🌐 **Web Interface** - Giao diện web hiện đại
- 🔐 **Authentication** - Đăng nhập bảo mật
- 📊 **Dashboard** - Xem và quản lý file
- 🔍 **Search & Filter** - Tìm kiếm và lọc file
- 📁 **Multi-format** - CSV, JSON, Excel
- 🇻🇳 **Tiếng Việt** - Giao diện tiếng Việt


## 📁 Cấu hình

Chỉnh sửa file `config.json`:
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

