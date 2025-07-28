<<<<<<< HEAD
# TeleDrive - Telegram File Manager

Công cụ quét và quản lý file từ các kênh Telegram với giao diện web hiện đại.

## 🚀 Sử dụng nhanh

### Khởi động Web Interface (mặc định):
```batch
run.bat
=======
# TeleDrive - Google Drive-like Telegram File Manager

Modern web interface for scanning and managing files from Telegram channels with Google Drive-inspired design.

## 🚀 Quick Start

### Web Interface (Recommended)
1. **Start web server**: Double-click `start.bat` or `web.bat`
2. **Open browser**: Go to http://localhost:3000
3. **Configure**: Visit Settings page to set up Telegram API
4. **Start scanning**: Use the web interface to scan channels

### Command Line Interface
1. **Setup**: Run `setup.bat`
2. **Configure**: Run `config.bat` (option 2 for phone number)
3. **Scan**: Run `run.bat`

## 🌐 Web Interface Features

### Google Drive-like Design
- **Clean, modern interface** with familiar Google Drive styling
- **Responsive design** that works on desktop, tablet, and mobile
- **Drag & drop file upload** with progress indicators
- **Real-time scanning progress** with live updates
- **File grid and list views** with sorting and filtering
- **Context menus** for file operations

### Core Functionality
- **Telegram Channel Scanning**: Scan public and private channels
- **File Management**: Upload, download, preview, and organize files
- **Search & Filter**: Find files quickly with advanced search
- **Settings Management**: Configure API credentials and preferences
- **Progress Tracking**: Monitor scanning operations in real-time

### Access Points
- **Main Dashboard**: http://localhost:3000
- **Settings Page**: http://localhost:3000/settings
- **Channel Scanner**: http://localhost:3000/scan

## 🔧 Manual Setup

1. **Run setup**: Execute `setup.bat`
2. **Edit .env**: Replace `+84xxxxxxxxx` with your real phone number
3. **Edit config.json**: Customize configuration (optional)
4. **Run scanner**: Execute `run.bat` for CLI or `start.bat` for web

## Quan ly cau hinh

### File .env (API Credentials)
>>>>>>> 7.addGGDriveUI
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

