
# TeleDrive

A modern Flask web application for Telegram file scanning and management with a Google Drive-like interface.

## 🚀 Features

- **Telegram Integration**: Seamlessly scan and manage files from Telegram channels
- **🆕 Auto Login**: Đăng nhập tự động từ Telegram Desktop - **KHÔNG CẦN API credentials!**
- **No API Required**: Sử dụng session từ Telegram Desktop, không cần API_ID/API_HASH
- **Google Drive-like UI**: Clean, modern interface with drag-drop functionality
- **File Management**: Upload, download, organize, and share files
- **Smart Folders**: Automated file organization based on criteria
- **Share Links**: Generate secure, time-limited sharing links
- **Search & Filter**: Advanced search capabilities with multiple filters
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Security**: Telegram authentication with session management
- **Real-time Updates**: WebSocket support for live progress tracking
- **File Preview**: Support for 10+ file types including images, videos, PDFs
- **RESTful API**: Complete API for all file and folder operations

## 📋 Requirements

- Python 3.8+
- Telegram Desktop (khuyến nghị - không cần API)
- Hoặc: Telegram API credentials nếu không dùng Desktop
- Modern web browser

## 🛠️ Installation

### 🚀 Quick Start - Zero Config (Khuyến Nghị)

**Bước 1: Setup (chỉ lần đầu)**
```bash
setup.bat
```

**Bước 2: Run**
```bash
run.bat
```

**Xong!**
- Truy cập: http://localhost:3000
- Tự động đăng nhập nếu có Telegram Desktop!

### Chi Tiết

#### Lần Đầu Sử Dụng

1. **Cài Telegram Desktop** (khuyến nghị)
   - Tải: https://desktop.telegram.org/
   - Đăng nhập tài khoản

2. **Chạy setup**
   ```bash
   setup.bat
   ```
   Script sẽ:
   - Kiểm tra Python
   - Tạo virtual environment
   - Cài đặt dependencies
   - Tạo thư mục cần thiết
   - Kiểm tra Telegram Desktop

3. **Chạy ứng dụng**
   ```bash
   run.bat
   ```

#### Các Lần Sau

Chỉ cần chạy:
```bash
run.bat
```

### Alternative: Manual Login (Không có Telegram Desktop)

1. **Lấy API credentials**
   - Truy cập: https://my.telegram.org
   - Tạo app và lấy API_ID, API_HASH

2. **Cấu hình .env**
   ```env
   TELEGRAM_API_ID=your_api_id
   TELEGRAM_API_HASH=your_api_hash
   ```

3. **Chạy**
   ```bash
   run.bat
   ```

4. **Đăng nhập**
   - Nhập số điện thoại
   - Nhập mã xác thực từ Telegram
## 📁 Project Structure

```
TeleDrive/
├── app/                    # Main application code
│   ├── static/            # CSS, JS, and other static files
│   ├── templates/         # HTML templates
│   ├── app.py            # Main Flask application
│   ├── db.py             # Database models
│   ├── auth.py           # Authentication logic
│   ├── scanner.py        # Telegram file scanning
│   ├── config.py         # Configuration management
│   └── ...
├── tests/                 # Test suite
├── scripts/              # Utility scripts
├── docs/                 # Documentation
├── data/                 # Application data and database
├── logs/                 # Application logs
├── requirements.txt      # Python dependencies
├── run.bat              # Quick start script
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Telegram API Configuration
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
## 🔧 Configuration

### Environment Variables (.env)

Chỉ cần nếu không dùng Telegram Desktop:

```env
# Telegram API (optional - không cần nếu có Desktop)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# Flask
FLASK_ENV=development
SECRET_KEY=your_secret_key

# Database
DATABASE_URL=sqlite:///data/teledrive.db
```

### Application Settings

Edit `app/config.json` để tùy chỉnh:
- File upload limits
- Session timeout
- UI preferences
- Security settings

## 🚀 Usage

1. **Lần đầu sử dụng**
   - Chạy `run.bat`
   - Truy cập http://localhost:3000
   - Tự động đăng nhập (nếu có Telegram Desktop)
   - Hoặc đăng nhập bằng số điện thoại

2. **Quản lý Files**
   - Browse files trong giao diện chính
   - Drag-drop để sắp xếp
   - Tạo folders và smart folders
   - Tạo share links

## 🧪 Testing

```bash
python tests/comprehensive_test_suite.py
```

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Submit pull request

## 🔒 Security

- Telegram authentication
- Session management
- File access control
- Input validation
- Rate limiting

## 📄 License

MIT License - see LICENSE file

## 🆘 Support

- Xem [documentation](docs/)
- Tạo issue cho bugs/features

---

*TeleDrive - Modern Telegram File Management System*
