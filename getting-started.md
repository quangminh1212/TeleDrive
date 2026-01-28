# 🚀 Getting Started - TeleDrive

## Cài Đặt & Chạy (2 Bước Đơn Giản)

### Bước 1: Cài Đặt Python Portable + Dependencies
```bash
setup-python.bat
```
⏱️ Mất ~5-10 phút (download Python + install packages)

### Bước 2: Chạy Ứng Dụng
```bash
run.bat
```
🎉 Ứng dụng sẽ tự động:
- Kiểm tra Python
- Cài đặt dependencies (nếu thiếu)
- Tạo database
- Mở embedded window

---

## 📋 File Scripts

### 🔧 Setup Scripts
- **`setup-python.bat`** - Cài Python 3.11 portable + tất cả dependencies
- **`run.bat`** - Script chính để chạy ứng dụng (tự động setup nếu cần)

### ❌ Đã Xóa (Không Cần Nữa)
Tất cả logic đã được tích hợp vào `run.bat`:
- ~~AUTO_FIX.bat~~
- ~~FIX_AUTO_LOGIN.bat~~
- ~~QUICK_FIX.bat~~
- ~~check_python.bat~~
- ~~install_python311.bat~~
- ~~test_setup.bat~~
- ~~test_full_workflow.bat~~

---

## 🎯 Tính Năng `run.bat`

Script `run.bat` giờ đây **tự động xử lý mọi thứ**:

✅ **Tự động tìm Python 3.11**
- Ưu tiên: Python portable trong folder dự án
- Fallback: Python 3.11 system-wide
- Tự động cài nếu không tìm thấy

✅ **Tự động cài setuptools**
- Kiểm tra và cài setuptools nếu thiếu
- Cài đúng vị trí cho Python embeddable

✅ **Tự động cài dependencies**
- Kiểm tra Flask, Telethon, SQLAlchemy
- Cài đặt nếu thiếu
- Update nếu cần

✅ **Tự động cài optional packages**
- pywebview / tkinterweb (embedded browser)
- cryptg (encryption 10x faster)

✅ **Tự động cleanup**
- Dọn dẹp ports (5000, 8000, 3000)
- Tạo thư mục cần thiết
- Setup environment variables

✅ **Chạy ứng dụng**
- Embedded webview window
- Fallback to browser nếu cần

---

## 💡 Sử Dụng

### Lần Đầu Tiên
```bash
# 1. Cài Python portable
setup-python.bat

# 2. Chạy ứng dụng
run.bat
```

### Lần Sau
```bash
# Chỉ cần chạy
run.bat
```

Script sẽ tự động kiểm tra và cài đặt những gì còn thiếu!

---

## 🔧 Cấu Trúc Dự Án

```
TeleDrive/
├── run.bat                    # ⭐ Script chính - chạy file này
├── setup-python.bat           # Setup Python portable
├── python311/                 # Python 3.11 portable (tự động tạo)
├── app/                       # Source code
├── data/                      # Database & uploads
├── logs/                      # Log files
└── main.py                    # Entry point
```

---

## 🐛 Troubleshooting

### Lỗi "Cannot import setuptools"
```bash
# Chạy lại setup
setup-python.bat
```

### Lỗi "Port already in use"
```bash
# run.bat sẽ tự động cleanup ports
# Hoặc manual:
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

---

## 📚 Tài Liệu Khác

- [README.md](README.md) - Full documentation (English)
- [README_VI.md](README_VI.md) - Tài liệu đầy đủ (Tiếng Việt)
- [quick-start.md](quick-start.md) - Quick start guide
- [setup-success.md](setup-success.md) - Setup details

---

**Chúc bạn sử dụng vui vẻ! 🎉**
