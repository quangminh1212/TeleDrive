# 📝 Changelog - TeleDrive

## [1.1.0] - 2026-01-27

### ✨ Tính Năng Mới

#### Auto-Login từ Telegram Desktop
- ✅ Tự động đăng nhập từ Telegram Desktop (Windows)
- ✅ Không cần API_ID, API_HASH
- ✅ Không cần nhập mã xác thực
- ✅ Tích hợp hoàn toàn vào flow chính của app

#### Đơn Giản Hóa Cấu Trúc
- ✅ Xóa tất cả scripts riêng biệt
- ✅ Tích hợp mọi thứ vào `run.bat`
- ✅ Chỉ cần 1 lệnh để chạy toàn bộ dự án

### 🔧 Cải Tiến

#### Code Structure
- Tích hợp auto-login vào `TelegramAuthenticator` class
- Xóa `telegram_session_manager.py` (tích hợp vào `auth.py`)
- Đơn giản hóa session check trong `app.py`

#### User Experience
- Tự động thử đăng nhập khi truy cập `/telegram_login`
- Thông báo rõ ràng về trạng thái session
- Fallback thông minh sang manual login nếu cần

#### Documentation
- README đơn giản hơn, tập trung vào `run.bat`
- Thêm `QUICK_START.md` - hướng dẫn 2 bước
- Thêm `PROJECT_STRUCTURE.md` - tổng quan dự án

### 🗑️ Đã Xóa

#### Scripts Không Cần Thiết
- ❌ `setup_telegram_auto_login.bat`
- ❌ `check_telegram_setup.bat`
- ❌ `scripts/import_telegram_desktop_session.py`
- ❌ `scripts/check_telegram_session.py`
- ❌ `scripts/auto_login_telegram.py`
- ❌ `scripts/reset_telegram_session.py`

#### Modules Dư Thừa
- ❌ `app/telegram_session_manager.py`

#### Documentation Trùng Lặp
- ❌ `docs/HUONG_DAN_DANG_NHAP_TELEGRAM.md`

### 📊 Thống Kê

**Files Xóa**: 8 files
**Files Thêm**: 2 files (QUICK_START.md, PROJECT_STRUCTURE.md)
**Files Cập Nhật**: 3 files (app.py, auth.py, README.md)
**Commits**: 7 commits

### 🎯 Kết Quả

**Trước đây**:
```
1. Cài Telegram Desktop
2. Chạy setup_telegram_auto_login.bat
3. Chạy run.bat
4. Truy cập app
```

**Bây giờ**:
```
1. Cài Telegram Desktop (nếu muốn auto-login)
2. Chạy run.bat
3. Xong!
```

### 🔐 Bảo Mật

- Session files tự động được gitignore
- Không lưu trữ mật khẩu
- Sử dụng session chính thức của Telegram
- Mã nguồn mở, có thể audit

### 🐛 Bug Fixes

- Không có (tính năng mới)

### ⚠️ Breaking Changes

- Không có
- Tương thích ngược 100%
- Phương thức cũ (phone + code) vẫn hoạt động

### 📝 Migration Guide

**Nếu đã sử dụng scripts cũ**:
- Không cần làm gì
- Chỉ cần chạy `run.bat` như bình thường
- Auto-login tự động hoạt động

**Nếu mới bắt đầu**:
- Đọc `QUICK_START.md`
- Chạy `run.bat`
- Thế thôi!

---

## [1.0.0] - 2025-01-XX

### Initial Release
- Flask web application
- Telegram integration
- File management
- Share links
- Google Drive-like UI

---

**Ghi chú**: Phiên bản 1.1.0 tập trung vào đơn giản hóa và tự động hóa, giúp người dùng mới dễ dàng bắt đầu với dự án.
