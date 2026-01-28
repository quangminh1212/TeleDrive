# TeleDrive Desktop

Ứng dụng desktop quản lý file Telegram với giao diện hiện đại - Quản lý files trên Telegram như Google Drive!

## ✨ Tính năng

- 🖥️ **Desktop App Native** - Chạy như phần mềm thông thường với embedded webview
- 🔐 **Auto Login** - Tự động đăng nhập từ Telegram Desktop, không cần nhập số điện thoại
- 📁 **Quản lý File** - Upload, download, tổ chức file từ Telegram (unlimited storage)
- 🔍 **Tìm kiếm** - Lọc theo loại file, kích thước, ngày tháng
- 🔗 **Chia sẻ** - Tạo link chia sẻ có bảo mật với password & expiry
- 📊 **Smart Folders** - Tự động phân loại file
- ⚡ **Hiệu năng cao** - Xử lý file nhanh với Telegram API
- 🌐 **Multi-language** - Hỗ trợ tiếng Anh và tiếng Việt

## 📋 Yêu cầu

- Windows 10/11
- Python 3.11 (khuyến nghị - auto-login hoạt động tốt nhất)
- Telegram Desktop (khuyến nghị cho auto-login)
- 4GB RAM
- Kết nối Internet

## ⚠️ Quan trọng về Python Version

**OPENTELE (auto-login) chỉ hoạt động với Python 3.11**

| Python Version | Auto-login | Embedded Webview | Tất cả Packages |
|---------------|------------|------------------|-----------------|
| 3.11.x | ✅ Hoạt động | ✅ Hoạt động | ✅ Ổn định |
| 3.12.x | ⚠️ Một số lỗi | ⚠️ Một số lỗi | ⚠️ Một số lỗi |
| 3.13.x | ❌ Không hoạt động | ❌ Không hoạt động | ❌ Nhiều lỗi |
| 3.14.x | ❌ Không hoạt động | ❌ Không hoạt động | ❌ Nhiều lỗi |

**Khuyến nghị**: Dùng Python 3.11 cho trải nghiệm tốt nhất!

## 🚀 Cài đặt & Chạy (Chỉ 2 Bước)

### Bước 1: Setup Python Portable + Dependencies
```bash
setup-python.bat
```
⏱️ Mất ~5-10 phút (download Python + install packages)

Script sẽ tự động:
- Download Python 3.11 embeddable
- Cài pip, setuptools & wheel
- Cài tất cả dependencies
- Verify installation

### Bước 2: Chạy Ứng Dụng
```bash
run.bat
```

Script `run.bat` sẽ **TỰ ĐỘNG**:
- ✅ Tìm Python 3.11 (portable hoặc system-wide)
- ✅ Cài setuptools nếu thiếu
- ✅ Cài dependencies nếu thiếu
- ✅ Cài webview libraries (pywebview/tkinterweb)
- ✅ Cleanup ports đang dùng
- ✅ Tạo thư mục cần thiết
- ✅ Chạy ứng dụng với embedded webview
- ✅ Auto-login từ Telegram Desktop

🎉 **Xong!** Ứng dụng sẽ tự động mở!

## 📖 Sử dụng

### Desktop Mode (Mặc định)
```bash
run.bat
```
Mở cửa sổ desktop app với embedded webview (1280x800)

### Nếu Không Có Webview
Ứng dụng tự động fallback:
1. Thử pywebview
2. Thử tkinterweb
3. Mở browser (http://localhost:5000)

## 🔐 Đăng Nhập

### Phương Pháp 1: Auto-Login (Khuyến nghị)

Nếu bạn có **Telegram Desktop** đang chạy và đã đăng nhập:
- ✅ Ứng dụng tự động login khi khởi động
- ✅ Không cần nhập số điện thoại hay mã xác thực
- ✅ Chỉ hoạt động với Python 3.11

**Yêu cầu**:
- Python 3.11
- Telegram Desktop đã đăng nhập
- Package opentele đã cài đặt

### Phương Pháp 2: Đăng Nhập Thủ Công

Nếu auto-login không hoạt động:
1. Vào trang login
2. Chọn mã vùng (ví dụ: +84 cho Vietnam)
3. Nhập số điện thoại (không cần số 0 đầu)
4. Click "Send Code"
5. Nhập mã xác thực từ Telegram
6. Click "Verify"

✅ **Nhanh, đơn giản, đáng tin cậy!**

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

### Lỗi: "Cannot import setuptools"
```bash
# Chạy lại setup
setup-python.bat
```

### Lỗi: "opentele không tương thích"
→ Đang dùng Python 3.12+, cần Python 3.11
```bash
# Cài Python 3.11 portable
setup-python.bat
```

### Lỗi: "pythonnet build failed"
→ Bỏ qua, ứng dụng vẫn chạy được. Desktop mode sẽ fallback sang browser.

### Lỗi: "pywebview not available"
→ Bình thường! Ứng dụng sẽ dùng tkinterweb hoặc browser.

### Không tìm thấy Telegram Desktop
1. Cài đặt Telegram Desktop: https://desktop.telegram.org/
2. Đăng nhập vào Telegram Desktop
3. Thử lại auto-login trong TeleDrive

**Vị trí tìm kiếm**:
- Windows: `%APPDATA%\Telegram Desktop\tdata`
- macOS: `~/Library/Application Support/Telegram Desktop/tdata`
- Linux: `~/.local/share/TelegramDesktop/tdata`

### Lỗi: "Telegram Desktop chưa có account nào được đăng nhập"
1. Mở Telegram Desktop
2. Đăng nhập vào account của bạn
3. Đợi sync xong
4. Thử lại auto-login trong TeleDrive

### Port already in use
```bash
# run.bat tự động cleanup, hoặc manual:
netstat -ano | findstr :5000
taskkill /F /PID <PID>
```

### Cài lại từ đầu
```bash
# Xóa Python portable
rmdir /s /q python311

# Chạy lại setup
setup-python.bat
run.bat
```

## 📁 Cấu trúc

```
TeleDrive/
├── run.bat              # ⭐ Script chính - chạy file này
├── setup-python.bat     # Setup Python portable
├── python311/           # Python 3.11 portable (tự động tạo)
├── main.py              # Desktop entry point
├── app/                 # Core application
│   ├── app.py          # Flask backend
│   ├── auth.py         # Authentication
│   ├── scanner.py      # Telegram scanner
│   ├── telegram_auth.py # Telegram authentication
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
- ✅ Quản lý session an toàn (mã hóa)
- ✅ Mã hóa mật khẩu với bcrypt
- ✅ Kiểm tra quyền truy cập file
- ✅ Rate limiting
- ✅ Input validation
- ✅ Secure file sharing với password & expiry

## 💡 Tips & Best Practices

### Tăng Tỷ Lệ Thành Công Auto-Login

1. **Đảm bảo Telegram Desktop đã đăng nhập**
   - Mở Telegram Desktop
   - Kiểm tra có thấy tin nhắn không
   - Đợi sync xong

2. **Sử dụng Python 3.11**
   - Dùng Python portable từ `setup-python.bat`
   - Hoặc cài Python 3.11 system-wide

3. **Không xóa tdata**
   - Không xóa folder `%APPDATA%\Telegram Desktop\tdata`
   - Không logout khỏi Telegram Desktop

4. **Thử lại nếu thất bại**
   - Click nút "Try Auto-Login" để retry
   - Hoặc refresh trang

### Downgrade Python (Nếu Cần)
```bash
# Xóa virtual environment
rmdir /s /q .venv

# Tạo lại với Python 3.11
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Kiểm Tra Python Version
```bash
python --version
# Hoặc
python311\python.exe --version
```

## 📊 Changelog

### [2026-01-28] - Major Refactoring & Consolidation

**Added**:
- Smart `run.bat` - Tích hợp tất cả logic setup và chạy
- `setup-python.bat` - Cài Python 3.11 portable hoàn chỉnh
- Comprehensive documentation

**Changed**:
- `run.bat` hoàn toàn viết lại với auto-setup
- Không còn phụ thuộc vào các script khác

**Removed**:
- Xóa 11 script dư thừa (logic đã tích hợp vào `run.bat`)

**Statistics**:
- Scripts: 11 files → 2 files (giảm 82%)
- Lines of code: ~1500 lines → ~400 lines (giảm 73%)
- User steps: 5-6 steps → 2 steps (giảm 67%)

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
