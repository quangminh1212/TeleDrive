# TeleDrive - Usage Guide

## 🚀 Quick Start

### Lần đầu sử dụng

1. **Setup**
   ```bash
   setup.bat
   ```

2. **Copy session từ Telegram Desktop** (Khuyến nghị)
   ```bash
   python copy_telegram_session.py
   ```

3. **Chạy ứng dụng**
   ```bash
   run.bat
   ```

---

## 📱 Chế độ chạy

### Desktop Mode (Mặc định)

**Command**: `run.bat`

**Đặc điểm**:
- ✅ Mở cửa sổ desktop app
- ✅ Native window (nếu có pywebview)
- ✅ Tự động fallback sang browser
- ✅ Trải nghiệm desktop native

**Khi nào dùng**:
- Sử dụng hàng ngày
- Muốn app riêng biệt
- Không muốn mở browser

### Web Mode (Browser)

**Command**: `run_web.bat`

**Đặc điểm**:
- 🌐 Chạy trong browser
- 🌐 Truy cập: http://localhost:5000
- 🌐 Có thể mở nhiều tab
- 🌐 Dễ debug

**Khi nào dùng**:
- Development
- Testing
- Muốn dùng browser tools
- Truy cập từ nhiều thiết bị (LAN)

---

## 🎯 Các lệnh chính

### Chạy ứng dụng

```bash
# Desktop mode (recommended)
run.bat

# Web mode (browser)
run_web.bat

# Desktop mode (alternative)
run_desktop.bat

# Python direct
python main.py          # Desktop
python app/app.py       # Web
```

### Copy session

```bash
# Copy từ Telegram Desktop
python copy_telegram_session.py
```

### Build release

```bash
# Build portable + installer
release.bat

# Build development
python build.py
```

### Tạo icon

```bash
python create_icon.py
```

---

## 📂 Cấu trúc thư mục

```
TeleDrive/
├── run.bat              ← Chạy desktop mode
├── run_web.bat          ← Chạy web mode
├── run_desktop.bat      ← Chạy desktop mode (alias)
├── main.py              ← Desktop entry point
├── app/
│   └── app.py          ← Web entry point
├── data/               ← Dữ liệu ứng dụng
│   ├── uploads/        ← Files uploaded
│   ├── temp/           ← Temporary files
│   └── teledrive.db    ← Database
└── logs/               ← Log files
```

---

## ⚙️ Cấu hình

### File .env (Tùy chọn)

Tạo file `.env` nếu muốn custom:

```env
# Telegram API (optional)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# Flask
SECRET_KEY=your_secret_key
FLASK_ENV=development

# Database
DATABASE_URL=sqlite:///data/teledrive.db
```

### Port mặc định

- **Desktop mode**: 5000
- **Web mode**: 5000

Thay đổi trong code nếu cần.

---

## 🔧 Troubleshooting

### run.bat không mở cửa sổ

**Nguyên nhân**: pywebview không cài đặt hoặc lỗi

**Giải pháp**:
1. App sẽ tự động mở browser
2. Hoặc cài pywebview:
   ```bash
   pip install pywebview
   ```

### Lỗi: Port already in use

**Giải pháp**:
```bash
# Tắt process đang dùng port
netstat -ano | findstr :5000
taskkill /F /PID <PID>
```

### Không tìm thấy session

**Giải pháp**:
```bash
# Copy lại session
python copy_telegram_session.py

# Hoặc login thủ công
# Chạy app và nhập số điện thoại
```

### Database error

**Giải pháp**:
```bash
# Backup database
copy data\teledrive.db data\teledrive.db.backup

# Xóa và tạo lại
del data\teledrive.db
run.bat
```

---

## 💡 Tips & Tricks

### 1. Chạy nhanh

Tạo shortcut trên Desktop:
- Target: `C:\Dev\TeleDrive\run.bat`
- Start in: `C:\Dev\TeleDrive`

### 2. Auto-start với Windows

1. Press `Win + R`
2. Type: `shell:startup`
3. Copy shortcut của `run.bat` vào đây

### 3. Multiple instances

Không khuyến nghị, nhưng nếu cần:
```bash
# Instance 1
run.bat

# Instance 2 (web mode, port khác)
run_web.bat
```

### 4. Development mode

```bash
# Với auto-reload
set FLASK_ENV=development
python app/app.py
```

### 5. Production mode

```bash
# Build executable
release.bat

# Chạy .exe
dist\TeleDrive\TeleDrive.exe
```

---

## 📊 So sánh modes

| Feature | Desktop Mode | Web Mode |
|---------|-------------|----------|
| **Command** | `run.bat` | `run_web.bat` |
| **Window** | Native/Browser | Browser only |
| **Port** | 5000 | 5000 |
| **Use case** | Daily use | Development |
| **Performance** | Better | Good |
| **Multi-tab** | No | Yes |
| **Debug** | Harder | Easier |

---

## 🎓 Best Practices

### Cho Users
1. ✅ Dùng `run.bat` (desktop mode)
2. ✅ Copy session từ Telegram Desktop
3. ✅ Backup `data/` thường xuyên
4. ✅ Cập nhật dependencies định kỳ

### Cho Developers
1. ✅ Dùng `run_web.bat` khi develop
2. ✅ Test cả desktop và web mode
3. ✅ Commit thường xuyên
4. ✅ Viết tests cho features mới

---

## 📚 Xem thêm

- [README.md](README.md) - Tổng quan
- [QUICK_START.md](QUICK_START.md) - Bắt đầu nhanh
- [BUILD_GUIDE.md](BUILD_GUIDE.md) - Hướng dẫn build
- [SESSION_COPY_GUIDE.md](SESSION_COPY_GUIDE.md) - Copy session

---

**Happy Using! 🎉**
