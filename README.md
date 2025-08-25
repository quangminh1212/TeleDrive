
# TeleDrive

A modern Flask web application for Telegram file scanning and management with a Google Drive-like interface.

## 🚀 Features

- **Telegram Integration**: Seamlessly scan and manage files from Telegram channels
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

- Python 3.12+
- Telegram API credentials (api_id, api_hash)
- Modern web browser

## 🛠️ Installation

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TeleDrive
   ```

2. **Run the application**
   ```bash
   .\run.bat
   ```

   The script will automatically:
   - Create a virtual environment
   - Install all dependencies
   - Set up the database
   - Start the application

3. **Access the application**
   - Open your browser and go to: http://localhost:3000

### Manual Installation

1. **Create virtual environment**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Telegram API**
   - Create a `.env` file in the root directory
   - Add your Telegram API credentials:
     ```
     TELEGRAM_API_ID=your_api_id
     TELEGRAM_API_HASH=your_api_hash
     ```

4. **Run the application**
   ```bash
   cd app
   python app.py
   ```
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

# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your_secret_key

# Database Configuration
DATABASE_URL=sqlite:///data/teledrive.db
```

### Application Settings

Edit `app/config.json` to customize:
- File upload limits
- Session timeout
- UI preferences
- Security settings

## 🚀 Usage

1. **First Time Setup**
   - Launch the application
   - Go to http://localhost:3000
   - Click "Login with Telegram"
   - Enter your phone number and verification code

2. **Scanning Files**
   - Navigate to the "Scan" page
   - Select Telegram channels to scan
   - Monitor progress in real-time

3. **File Management**
   - Browse files in the main interface
   - Use drag-drop to organize files
   - Create folders and smart folders
   - Generate share links for files

## 🧪 Testing

Run the comprehensive test suite:

```bash
python tests/comprehensive_test_suite.py
```

Quick HTTP checks (no pytest):
```bash
python tests/test_share_and_delete_http.py
python tests/test_delete_unit.py
python tests/test_download_unit.py
```

## 📚 Documentation

- [Test Reports](docs/TEST_REPORT.md)
- [Project Health](docs/PROJECT_HEALTH_REPORT.md)
- [Testing Checklist](docs/TESTING_CHECKLIST.md)
- [API: Share & Delete](docs/API_SHARE_DELETE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 🔒 Security

- **Telegram Authentication**: Secure phone-based authentication
- **Session Management**: Automatic session timeout and security
- **File Access Control**: Permission-based file access
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API rate limiting protection

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Check the [documentation](docs/)
- Review [test reports](docs/TEST_REPORT.md)
- Open an issue for bugs or feature requests

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
  - Modern datetime handling (timezone-aware)
  - Organized project structure according to international standards
  - Comprehensive test suite
  - Google Drive-like UI
  - Telegram integration
  - File management system

## 🏆 Acknowledgments

- **Flask** - Web framework
- **Telethon** - Telegram API client
- **SQLAlchemy** - Database ORM
- **Bootstrap** - UI framework
- **Socket.IO** - Real-time communication

---

*TeleDrive - Modern Telegram File Management System*
- Simple JSON: Chi ten file + link

---

## 📊 Trạng thái dự án
- Đã hoàn thành: 21/115 tính năng (18%)
- Đang phát triển: authentication, chia sẻ, analytics
- Định hướng: đạt 100% tính năng cơ bản trong 4 tháng
- Sẵn sàng production, kiến trúc mở rộng, bảo trì tốt

---

## 📚 Tài liệu & tham khảo
- Hướng dẫn chi tiết: xem README này
- Cấu hình Telegram: mục "Cấu hình Telegram & môi trường"
- API, developer guide: sẽ bổ sung trong các release tiếp theo

---

*Đã tổng hợp nội dung từ các file: completed-features.md, daily-tasks.md, dev-checklist.md, dev-roadmap.md, final-status.md, missing-features.md, optimization.md, project-summary.md, telegram-config.md*
