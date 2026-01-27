# TeleDrive Desktop

Ứng dụng desktop quản lý file Telegram với giao diện hiện đại, chạy native trên Windows.

## ✨ Tính năng

- **🖥️ Ứng dụng Desktop Native**: Chạy như phần mềm thông thường, không cần browser
- **🔐 Auto Login**: Tự động đăng nhập từ Telegram Desktop
- **📁 Quản lý File**: Upload, download, tổ chức file từ Telegram
- **🔍 Tìm kiếm nâng cao**: Lọc theo loại file, kích thước, ngày tháng
- **🔗 Chia sẻ File**: Tạo link chia sẻ có bảo mật
- **📊 Smart Folders**: Tự động phân loại file theo tiêu chí
- **🎨 Giao diện đẹp**: UI hiện đại, dễ sử dụng
- **⚡ Hiệu năng cao**: Xử lý file nhanh với Telegram API

## 📋 Yêu cầu hệ thống

- Windows 10 hoặc mới hơn
- Python 3.11+ (để chạy từ source)
- Telegram Desktop (khuyến nghị)
- 4GB RAM
- Kết nối Internet

## 🚀 Cài đặt & Sử dụng

### Cách 1: Chạy từ Source (Dành cho Developer)

1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/teledrive.git
   cd teledrive
   ```

2. **Chạy setup**
   ```bash
   setup.bat
   ```

3. **Copy session từ Telegram Desktop (Khuyến nghị)**
   ```bash
   python copy_telegram_session.py
   ```
   
   Script sẽ tự động:
   - Tìm Telegram Desktop
   - Kiểm tra đã đăng nhập chưa
   - Copy session files
   - Không cần đăng nhập lại!

4. **Chạy ứng dụng desktop**
   ```bash
   run.bat
   ```
   
   Hoặc web mode (browser):
   ```bash
   run_web.bat
   ```

### Cách 2: Build thành .exe

1. **Cài đặt dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Tạo icon** (tùy chọn)
   ```bash
   python create_icon.py
   ```

3. **Build executable**
   ```bash
   python build.py
   ```

4. **Chạy ứng dụng**
   - Vào thư mục `dist/TeleDrive/`
   - Chạy `TeleDrive.exe`

## 📁 Cấu trúc dự án

```
TeleDrive/
├── main.py                 # Entry point cho desktop app
├── build.py               # Script build executable
├── run_desktop.bat        # Script chạy desktop mode
├── create_icon.py         # Tạo icon cho app
├── app/                   # Core application
│   ├── app.py            # Flask backend
│   ├── db.py             # Database models
│   ├── auth.py           # Authentication
│   ├── scanner.py        # Telegram scanner
│   ├── static/           # CSS, JS
│   └── templates/        # HTML templates
├── data/                  # Application data
│   ├── uploads/          # Uploaded files
│   ├── temp/             # Temporary files
│   └── teledrive.db      # SQLite database
├── logs/                  # Log files
└── requirements.txt       # Python dependencies
```

## 🔧 Cấu hình

### File .env (Tùy chọn)

Nếu không dùng Telegram Desktop, tạo file `.env`:

```env
# Telegram API (lấy từ https://my.telegram.org)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# Flask
SECRET_KEY=your_secret_key_here

# Database
DATABASE_URL=sqlite:///data/teledrive.db
```

### Cấu hình ứng dụng

Chỉnh sửa `app/config.json`:
- Giới hạn upload
- Timeout session
- Cài đặt UI
- Bảo mật

## 🎯 Sử dụng

1. **Khởi động ứng dụng**
   - Chạy `TeleDrive.exe` hoặc `run_desktop.bat`
   - Ứng dụng sẽ mở trong cửa sổ desktop

2. **Đăng nhập**
   - Tự động nếu có Telegram Desktop
   - Hoặc nhập số điện thoại + mã xác thực

3. **Quản lý file**
   - Browse files trong giao diện
   - Upload/download files
   - Tạo folders và smart folders
   - Chia sẻ files với link

## 🛠️ Development

### Chạy ở chế độ development

```bash
# Web mode (browser)
python app/app.py

# Desktop mode
python main.py
```

### Chạy tests

```bash
python -m pytest tests/
```

### Build distribution

```bash
python build.py
```

## 🔒 Bảo mật

- ✅ Xác thực Telegram
- ✅ Quản lý session an toàn
- ✅ Mã hóa mật khẩu với bcrypt
- ✅ Kiểm tra quyền truy cập file
- ✅ Rate limiting
- ✅ Input validation

## 📝 Changelog

### Version 2.0.0 (Desktop)
- ✨ Chuyển đổi thành ứng dụng desktop
- ✨ Sử dụng PyWebView cho native window
- ✨ Tích hợp system tray
- ✨ Build thành .exe với PyInstaller
- 🐛 Sửa lỗi tương thích Python 3.14
- 🐛 Sửa lỗi Flask-SQLAlchemy

### Version 1.0.0 (Web)
- 🎉 Phiên bản web đầu tiên
- ✨ Quản lý file Telegram
- ✨ Auto-login từ Desktop
- ✨ Share links

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

MIT License - xem file [LICENSE](LICENSE)

## 🆘 Hỗ trợ

- 📖 [Documentation](docs/)
- 🐛 [Report Bug](https://github.com/yourusername/teledrive/issues)
- 💡 [Request Feature](https://github.com/yourusername/teledrive/issues)

## 👨‍💻 Tác giả

TeleDrive Team

---

**TeleDrive Desktop** - Quản lý file Telegram chuyên nghiệp 🚀
