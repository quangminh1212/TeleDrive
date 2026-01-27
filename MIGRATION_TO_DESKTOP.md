# Migration to Desktop Application

## Tổng quan

TeleDrive đã được chuyển đổi từ ứng dụng web Flask sang ứng dụng desktop native chạy trên Windows.

## Thay đổi chính

### 1. Kiến trúc

**Trước (Web):**
```
Browser → Flask Server (port 3000) → Database
```

**Sau (Desktop):**
```
PyWebView Window → Flask Server (localhost:5000) → Database
```

### 2. Entry Point

- **Trước**: `python app/app.py` hoặc `run.bat`
- **Sau**: `python main.py` hoặc `run_desktop.bat`

### 3. Dependencies mới

```
pywebview>=5.0.0      # Native window rendering
pystray>=0.19.5       # System tray integration
Pillow>=10.0.0        # Icon handling
pyinstaller>=6.0.0    # Build executable
```

### 4. Cấu trúc file mới

```
TeleDrive/
├── main.py              # Desktop entry point (MỚI)
├── build.py             # Build script (MỚI)
├── run_desktop.bat      # Desktop launcher (MỚI)
├── create_icon.py       # Icon generator (MỚI)
├── BUILD_GUIDE.md       # Build documentation (MỚI)
├── CHANGELOG.md         # Version history (MỚI)
├── app/                 # Core app (GIỮ NGUYÊN)
│   ├── app.py          # Flask backend
│   ├── templates/      # HTML templates
│   └── static/         # CSS, JS
└── requirements.txt     # Updated dependencies
```

## Lợi ích của Desktop App

### ✅ Ưu điểm

1. **Native Experience**: Chạy như phần mềm thông thường
2. **Không cần Browser**: Giao diện riêng, không phụ thuộc browser
3. **Dễ phân phối**: Build thành .exe, user chỉ cần double-click
4. **Tích hợp OS**: System tray, notifications, file associations
5. **Bảo mật tốt hơn**: Không expose port ra ngoài
6. **Offline-ready**: Có thể hoạt động offline (trừ Telegram API)

### ⚠️ Cân nhắc

1. **File size lớn hơn**: ~50-100MB (bao gồm Python runtime)
2. **Platform-specific**: Cần build riêng cho Windows/Mac/Linux
3. **Update phức tạp hơn**: Cần redistribute .exe mới

## Compatibility

### Hỗ trợ

- ✅ Windows 10, 11
- ✅ Python 3.11, 3.12
- ✅ Python 3.14 (với một số hạn chế)

### Không hỗ trợ

- ❌ Python 3.14 + opentele (lỗi import)
- ❌ Python < 3.11

## Migration Steps (Đã thực hiện)

### Phase 1: Dependencies ✅
- Thêm pywebview, pystray, pyinstaller
- Cập nhật SQLAlchemy 2.0.46 (Python 3.14 compatible)
- Cập nhật Flask-SQLAlchemy 3.1.1

### Phase 2: Desktop Entry Point ✅
- Tạo main.py với PyWebView integration
- Flask server chạy trong background thread
- Window management và configuration

### Phase 3: Build System ✅
- Tạo build.py với PyInstaller
- Auto-generate spec file
- Distribution packaging

### Phase 4: Assets ✅
- Icon generator (create_icon.py)
- Application icon (icon.ico, icon.png)

### Phase 5: Documentation ✅
- Cập nhật README.md
- Tạo BUILD_GUIDE.md
- Tạo CHANGELOG.md

### Phase 6: Cleanup ✅
- Xóa run_with_log.py
- Xóa fix_dependencies.bat
- Cập nhật .gitignore

## Cách sử dụng

### Development Mode

```bash
# Web mode (browser)
python app/app.py

# Desktop mode
python main.py
```

### Production Build

```bash
# Build executable
python build.py

# Run executable
dist\TeleDrive\TeleDrive.exe
```

## Testing Checklist

- [x] Desktop window mở đúng
- [x] Flask server khởi động
- [x] UI hiển thị chính xác
- [x] Auto-login hoạt động
- [ ] Upload/download files
- [ ] Database operations
- [ ] Build thành .exe
- [ ] Test .exe trên máy sạch

## Known Issues

### 1. opentele + Python 3.14
**Vấn đề**: opentele 1.15.1 không tương thích Python 3.14
**Giải pháp**: 
- Sử dụng Python 3.11/3.12
- Hoặc đăng nhập thủ công (không dùng auto-login)

### 2. Antivirus False Positive
**Vấn đề**: Một số antivirus có thể cảnh báo .exe
**Giải pháp**:
- Code signing certificate
- Thêm exception trong antivirus

## Future Improvements

### Short-term
- [ ] System tray icon với menu
- [ ] Auto-update mechanism
- [ ] Minimize to tray
- [ ] Startup with Windows

### Long-term
- [ ] macOS support
- [ ] Linux support
- [ ] Electron alternative
- [ ] Native notifications

## Rollback Plan

Nếu cần quay lại web version:

```bash
# Checkout version 1.0.0
git checkout v1.0.0

# Hoặc chỉ chạy web mode
python app/app.py
```

Web version vẫn hoạt động bình thường!

## Support

- 📖 [README.md](README.md) - Hướng dẫn sử dụng
- 🔨 [BUILD_GUIDE.md](BUILD_GUIDE.md) - Hướng dẫn build
- 📝 [CHANGELOG.md](CHANGELOG.md) - Lịch sử thay đổi

## Contributors

- Migration to Desktop: TeleDrive Team
- Date: 2026-01-28
- Version: 2.0.0

---

**Status**: ✅ Migration Complete
