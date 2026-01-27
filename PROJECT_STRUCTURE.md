# 📁 Cấu Trúc Dự Án TeleDrive

## Cấu Trúc Chính

```
TeleDrive/
├── run.bat                    # 🚀 ENTRY POINT - Chạy dự án
├── requirements.txt           # Dependencies Python
├── config.json               # Cấu hình ứng dụng
├── .env                      # Biến môi trường (không commit)
├── README.md                 # Tài liệu chính
├── QUICK_START.md           # Hướng dẫn nhanh
│
├── app/                      # 📦 Core Application
│   ├── app.py               # Flask app chính
│   ├── auth.py              # Telegram authentication (có auto-login)
│   ├── db.py                # Database models
│   ├── forms.py             # WTForms
│   ├── scanner.py           # Telegram file scanner
│   ├── telegram_storage.py  # Telegram storage manager
│   ├── config.py            # Config manager
│   ├── i18n.py              # Internationalization
│   ├── log.py               # Logging
│   ├── web_config.py        # Web config
│   ├── static/              # CSS, JS, images
│   └── templates/           # HTML templates
│
├── data/                     # 💾 Data Storage
│   ├── teledrive.db         # SQLite database
│   ├── session.session      # Telegram session (auto-generated)
│   ├── uploads/             # Uploaded files
│   ├── temp/                # Temporary files
│   └── backups/             # Backups
│
├── tests/                    # 🧪 Test Suite
│   ├── comprehensive_test_suite.py
│   ├── test_*.py            # Various test files
│   └── ...
│
├── scripts/                  # 🔧 Utility Scripts
│   └── migrate_telegram_storage.py
│
├── docs/                     # 📚 Documentation
│   ├── API_SHARE_DELETE.md
│   ├── TEST_REPORT.md
│   └── ...
│
└── logs/                     # 📝 Application Logs
    └── *.log
```

## Files Quan Trọng

### 🚀 Entry Point
- **run.bat**: Script duy nhất cần chạy
  - Tự động tạo virtual environment
  - Cài đặt dependencies
  - Dọn dẹp ports
  - Khởi động ứng dụng

### 🔐 Authentication
- **app/auth.py**: 
  - Class `TelegramAuthenticator`
  - Tích hợp auto-login từ Telegram Desktop
  - Xử lý phone login
  - Xử lý verification code

### 🌐 Web Application
- **app/app.py**:
  - Flask routes
  - WebSocket handlers
  - Session management
  - Auto-login integration

### 💾 Database
- **app/db.py**:
  - SQLAlchemy models
  - User, File, Folder, ShareLink, etc.

## Workflow Chạy Dự Án

```
1. User chạy: run.bat
   ↓
2. run.bat:
   - Kiểm tra Python
   - Tạo/activate venv
   - Cài dependencies
   - Dọn dẹp ports
   - Chạy app/app.py
   ↓
3. app.py khởi động:
   - Kiểm tra session Telegram
   - Khởi động Flask server
   - Mở port 3000
   ↓
4. User truy cập http://localhost:3000
   ↓
5. Route /telegram_login:
   - Thử check_existing_session()
   - Thử try_auto_login_from_desktop()
   - Nếu thành công → auto-login
   - Nếu thất bại → hiển thị form
```

## Tính Năng Auto-Login

### Cách Hoạt Động
1. User có Telegram Desktop đã đăng nhập
2. Truy cập `/telegram_login`
3. App tự động:
   - Tìm Telegram Desktop tdata
   - Import session bằng opentele
   - Validate session
   - Đăng nhập user
4. Redirect đến dashboard

### Code Location
- **app/auth.py**:
  - `_find_telegram_desktop()`: Tìm tdata folder
  - `try_auto_login_from_desktop()`: Import & login
  - `check_existing_session()`: Validate session
  - `has_existing_session()`: Check session file

- **app/app.py**:
  - Route `/telegram_login`: Tích hợp auto-login
  - Startup check: Validate session khi khởi động

## Dependencies Chính

```
telethon==1.34.0          # Telegram client
opentele==1.15.1          # Telegram Desktop session import
flask==2.3.0              # Web framework
sqlalchemy==1.4.41        # Database ORM
flask-login==0.6.3        # User session management
```

## Không Cần Nữa ❌

- ~~setup_telegram_auto_login.bat~~ → Tích hợp vào app
- ~~check_telegram_setup.bat~~ → Tích hợp vào app
- ~~scripts/import_telegram_desktop_session.py~~ → Tích hợp vào auth.py
- ~~scripts/check_telegram_session.py~~ → Tích hợp vào auth.py
- ~~scripts/auto_login_telegram.py~~ → Tích hợp vào auth.py
- ~~scripts/reset_telegram_session.py~~ → Không cần thiết
- ~~app/telegram_session_manager.py~~ → Tích hợp vào auth.py
- ~~docs/HUONG_DAN_DANG_NHAP_TELEGRAM.md~~ → Có trong README

## Chỉ Cần Nhớ ✅

**Chạy dự án:**
```bash
run.bat
```

**Xong!** Tất cả đã được tự động hóa.
