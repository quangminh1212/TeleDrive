# 🚀 TeleDrive - Quick Start Guide

## 📋 Cách chạy TeleDrive

### 🎯 **Cách đơn giản nhất:**

```bash
# Từ thư mục gốc TeleDrive:
run.bat
```

### 🔧 **Các tùy chọn khác:**

```bash
# Chạy web interface (mặc định)
run.bat

# Chạy production server
run.bat production

# Chạy scanner CLI
run.bat scanner

# Menu cấu hình
run.bat config

# Setup web interface
run.bat web-setup

# Chạy web mode
run.bat web
```

## 📁 **Cấu trúc thư mục:**

```
TeleDrive/
├── run.bat              ← File chính để chạy ứng dụng
├── config/
│   └── config.json      ← Cấu hình Telegram API
├── scripts/
│   ├── check_config.py  ← Script kiểm tra config
│   └── run.bat          ← File cũ (deprecated)
├── src/                 ← Source code
├── static/              ← CSS, JS, images
├── templates/           ← HTML templates
└── output/              ← Kết quả scan
```

## ⚡ **Khởi động nhanh:**

1. **Mở Command Prompt hoặc PowerShell**
2. **Chuyển đến thư mục TeleDrive:**
   ```bash
   cd C:\VF\TeleDrive
   ```
3. **Chạy ứng dụng:**
   ```bash
   run.bat
   ```
4. **Mở browser và truy cập:** http://localhost:5000

## 🔑 **Lần đầu sử dụng:**

1. **Chạy `run.bat`** - Hệ thống sẽ tự động kiểm tra và cài đặt dependencies
2. **Truy cập `/setup`** để tạo admin user đầu tiên
3. **Đăng nhập** với thông tin vừa tạo
4. **Bắt đầu sử dụng!**

## 🛠️ **Troubleshooting:**

### Nếu gặp lỗi "Python not found":
```bash
# Cài đặt Python từ: https://python.org/downloads/
# Hoặc kiểm tra PATH environment variable
```

### Nếu gặp lỗi "Config not found":
```bash
# Chạy menu cấu hình:
run.bat config
```

### Nếu gặp lỗi dependencies:
```bash
# Cài đặt thủ công:
pip install -r requirements.txt
```

## 📊 **Các tính năng chính:**

- 🌐 **Web Interface** - Giao diện web hiện đại
- 📱 **Telegram Scanner** - Quét files từ Telegram
- 👥 **User Management** - Quản lý người dùng
- 📁 **File Explorer** - Duyệt files như Windows Explorer
- 🔐 **Authentication** - Đăng nhập bảo mật
- 📈 **Dashboard** - Thống kê và báo cáo

## 🎨 **Giao diện:**

- ✅ **Windows 11 Style** - Thiết kế hiện đại
- ✅ **Responsive Design** - Tương thích mobile
- ✅ **Dark/Light Mode** - Chế độ sáng/tối
- ✅ **Admin Panel** - Panel quản trị
- ✅ **File Preview** - Xem trước files

## 🔗 **Liên kết hữu ích:**

- **Web Interface:** http://localhost:5000
- **Setup Page:** http://localhost:5000/setup
- **Admin Panel:** Click vào nút "ADMIN" ở góc trên phải
- **API Docs:** http://localhost:5000/api/

## 📞 **Hỗ trợ:**

Nếu gặp vấn đề, hãy:
1. Kiểm tra logs trong thư mục `logs/`
2. Chạy `test_run.bat` để kiểm tra cấu hình
3. Xem file `CHANGELOG.md` để biết các thay đổi mới nhất

---

**🎉 Chúc bạn sử dụng TeleDrive vui vẻ!**
