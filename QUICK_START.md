# TeleDrive - Quick Start Guide

## 🚀 Chạy nhanh (Recommended)

### Bước 1: Copy Session từ Telegram Desktop (Khuyến nghị)

```bash
python copy_telegram_session.py
```

Script sẽ tự động copy session từ Telegram Desktop đã đăng nhập.
**Lợi ích**: Không cần đăng nhập lại!

### Bước 2: Chạy ứng dụng

**Desktop Mode (Recommended)**
```bash
run.bat
```
Mở cửa sổ desktop app (hoặc browser nếu không có pywebview)

**Web Mode (Browser)**
```bash
run_web.bat
```
Chạy trong browser: http://localhost:5000

**Alternative**
```bash
# Desktop mode
python main.py

# Web mode  
python app/app.py
```

## 📦 Build Release

```bash
release.bat
```

Output:
- `release/TeleDrive-Portable-v2.0.0-Windows.zip` - Portable version
- `release/TeleDrive-Setup-v2.0.0.exe` - Installer (nếu có Inno Setup)

## ⚠️ Python 3.14 Users

**Lưu ý**: Một số tính năng có hạn chế trên Python 3.14:

1. **Auto-login từ Telegram Desktop**: Không hoạt động
   - Workaround: Đăng nhập thủ công

2. **Native Desktop Window**: Không khả dụng
   - Workaround: Tự động mở browser

**Khuyến nghị**: Sử dụng Python 3.11 hoặc 3.12 cho trải nghiệm tốt nhất.

### Downgrade Python (Nếu cần)

```bash
# Xóa virtual environment
rmdir /s /q .venv

# Tạo lại với Python 3.11
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 📚 Documentation

- [README.md](README.md) - Tổng quan
- [BUILD_GUIDE.md](BUILD_GUIDE.md) - Hướng dẫn build
- [RELEASE_GUIDE.md](RELEASE_GUIDE.md) - Quy trình release
- [PYTHON_COMPATIBILITY.md](PYTHON_COMPATIBILITY.md) - Tương thích Python
- [CHANGELOG.md](CHANGELOG.md) - Lịch sử thay đổi

## 🐛 Troubleshooting

### Lỗi: pythonnet build failed
```bash
# Bỏ qua - ứng dụng vẫn chạy được
# Desktop mode sẽ tự động fallback sang browser
```

### Lỗi: run_with_log.py not found
```bash
# Đã sửa trong run.bat
# Pull latest changes: git pull
```

### Lỗi: opentele import error
```bash
# Bình thường trên Python 3.14
# Sử dụng manual login thay vì auto-login
```

## 💡 Tips

- **Development**: Dùng `python app/app.py` hoặc `run.bat`
- **Desktop**: Dùng `python main.py` hoặc `run_desktop.bat`
- **Production**: Build với `release.bat`

## 🔗 Links

- GitHub: https://github.com/yourusername/teledrive
- Issues: https://github.com/yourusername/teledrive/issues

---

**Happy Coding! 🎉**
