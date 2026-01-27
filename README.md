# TeleDrive Desktop

Ứng dụng desktop quản lý file Telegram với giao diện hiện đại.

## ✨ Tính năng

- 🖥️ **Desktop App Native** - Chạy như phần mềm thông thường
- 🔐 **Auto Login** - Copy session từ Telegram Desktop, không cần đăng nhập lại
- 📁 **Quản lý File** - Upload, download, tổ chức file từ Telegram
- 🔍 **Tìm kiếm** - Lọc theo loại file, kích thước, ngày tháng
- 🔗 **Chia sẻ** - Tạo link chia sẻ có bảo mật
- 📊 **Smart Folders** - Tự động phân loại file
- ⚡ **Hiệu năng cao** - Xử lý file nhanh với Telegram API

## 📋 Yêu cầu

- Windows 10+
- Python 3.11+ (khuyến nghị 3.11 hoặc 3.12)
- Telegram Desktop (khuyến nghị)
- 4GB RAM
- Kết nối Internet

## 🚀 Cài đặt

### 1. Clone repository
```bash
git clone https://github.com/yourusername/teledrive.git
cd teledrive
```

### 2. Chạy setup
```bash
setup.bat
```

### 3. Copy session từ Telegram Desktop (Khuyến nghị)
```bash
python copy_telegram_session.py
```

Script sẽ tự động:
- Tìm Telegram Desktop
- Kiểm tra đã đăng nhập chưa
- Copy session files
- Không cần đăng nhập lại!

### 4. Chạy ứng dụng
```bash
run.bat
```

## 📖 Sử dụng

### Desktop Mode (Mặc định)
```bash
run.bat
```
Mở cửa sổ desktop app (hoặc browser nếu không có pywebview)

### Web Mode
```bash
run_web.bat
```
Chạy trong browser: http://localhost:5000

### Copy Session
```bash
python copy_telegram_session.py
```
Copy session từ Telegram Desktop để không cần login lại

### Build Release
```bash
release.bat
```
Build portable + installer versions

## 🔧 Cấu hình

### File .env (Tùy chọn)

Nếu không dùng Telegram Desktop, tạo file `.env`:

```env
# Telegram API (lấy từ https://my.telegram.org)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# Flask
SECRET_KEY=your_secret_key

# Database
DATABASE_URL=sqlite:///data/teledrive.db
```

## 🐛 Troubleshooting

### Lỗi: pythonnet build failed
Bỏ qua - ứng dụng vẫn chạy được. Desktop mode sẽ tự động fallback sang browser.

### Lỗi: opentele import error
Bình thường trên Python 3.14. Sử dụng `copy_telegram_session.py` thay vì auto-login.

### Không tìm thấy Telegram Desktop
1. Cài đặt Telegram Desktop: https://desktop.telegram.org/
2. Đăng nhập vào Telegram Desktop
3. Chạy lại `python copy_telegram_session.py`

### Port already in use
```bash
netstat -ano | findstr :5000
taskkill /F /PID <PID>
```

## 📁 Cấu trúc

```
TeleDrive/
├── run.bat              # Chạy desktop mode
├── run_web.bat          # Chạy web mode
├── main.py              # Desktop entry point
├── copy_telegram_session.py  # Copy session utility
├── app/                 # Core application
│   ├── app.py          # Flask backend
│   ├── auth.py         # Authentication
│   ├── scanner.py      # Telegram scanner
│   ├── static/         # CSS, JS
│   └── templates/      # HTML templates
├── data/               # Application data
│   ├── uploads/        # Uploaded files
│   ├── temp/           # Temporary files
│   └── teledrive.db    # SQLite database
└── logs/               # Log files
```

## 🔒 Bảo mật

- ✅ Xác thực Telegram
- ✅ Quản lý session an toàn
- ✅ Mã hóa mật khẩu với bcrypt
- ✅ Kiểm tra quyền truy cập file
- ✅ Rate limiting
- ✅ Input validation

## 💡 Tips

### Python 3.14 Users
- ⚠️ Auto-login từ Telegram Desktop không hoạt động
- ✅ Sử dụng `copy_telegram_session.py` để copy session
- ⚠️ Native desktop window không khả dụng
- ✅ Tự động fallback sang browser

**Khuyến nghị**: Dùng Python 3.11 hoặc 3.12 cho trải nghiệm tốt nhất.

### Downgrade Python
```bash
# Xóa virtual environment
rmdir /s /q .venv

# Tạo lại với Python 3.11
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

MIT License - xem file [LICENSE](LICENSE)

## 🆘 Hỗ trợ

- 🐛 [Report Bug](https://github.com/yourusername/teledrive/issues)
- 💡 [Request Feature](https://github.com/yourusername/teledrive/issues)

## 👨‍💻 Tác giả

TeleDrive Team

---

**TeleDrive Desktop** - Quản lý file Telegram chuyên nghiệp 🚀
