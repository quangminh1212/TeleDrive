# 🚀 Quick Start - TeleDrive

## Cài Đặt & Chạy (3 Bước)

### 1️⃣ Cài Python Portable + Dependencies
```bash
setup_portable_python.bat
```
⏱️ Mất ~5 phút (download + install)

### 2️⃣ Kiểm Tra Setup
```bash
test_setup.bat
```
✅ Verify tất cả packages đã cài đúng

### 3️⃣ Chạy Ứng Dụng
```bash
run.bat
```
🎉 Ứng dụng sẽ tự động mở!

---

## 📋 Yêu Cầu

- ✅ Windows 10/11
- ✅ Kết nối Internet (lần đầu)
- ✅ ~500MB dung lượng trống

## 🎯 Tính Năng Chính

- 📤 Upload files lên Telegram (unlimited storage)
- 📥 Download files từ Telegram
- 🔗 Share files với link + password
- 🔐 Auto-login từ Telegram Desktop
- 🌐 Web interface đẹp & dễ dùng

## 💡 Tips

### Auto-Login
Nếu bạn có **Telegram Desktop** đang chạy:
- ✅ Ứng dụng sẽ tự động login
- ✅ Không cần nhập phone/code

Nếu không có Telegram Desktop:
- 📱 Login bằng phone number
- 🔢 Nhập verification code

### Embedded Window
Ứng dụng mở trong window riêng (không cần browser):
- ✅ pywebview (tốt nhất)
- ✅ tkinterweb (backup)
- 🌐 Browser (fallback)

---

## 🐛 Gặp Lỗi?

### "Cannot import setuptools"
```bash
python311\python.exe -m pip install --target python311\Lib\site-packages setuptools wheel
```

### "Port 5000 already in use"
```bash
netstat -ano | findstr :5000
taskkill /F /PID <PID_NUMBER>
```

### Cài lại từ đầu
```bash
# Xóa folder python311
rmdir /s /q python311

# Chạy lại setup
setup_portable_python.bat
```

---

## 📚 Đọc Thêm

- 📖 [README.md](README.md) - Full documentation
- 🇻🇳 [README_VI.md](README_VI.md) - Tiếng Việt
- ✅ [SETUP_SUCCESS.md](SETUP_SUCCESS.md) - Setup guide

---

**Happy coding! 🎉**
