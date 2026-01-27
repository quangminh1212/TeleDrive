# Changelog

Tất cả thay đổi quan trọng của dự án sẽ được ghi lại ở đây.

## [2.0.0] - 2026-01-28

### 🎉 Major Changes - Desktop Application

#### Added
- ✨ **Desktop Application**: Chuyển đổi hoàn toàn sang ứng dụng desktop native
- 🖥️ **PyWebView Integration**: Sử dụng PyWebView cho native window rendering
- 📦 **Executable Build**: Hỗ trợ build thành .exe với PyInstaller
- 🎨 **Application Icon**: Thêm icon generator và icon cho ứng dụng
- 📝 **Build Scripts**: Thêm build.py và run_desktop.bat
- 📚 **Build Guide**: Hướng dẫn chi tiết về build và distribution

#### Changed
- 🔄 **Entry Point**: main.py thay thế run_with_log.py
- 📖 **Documentation**: Cập nhật README cho desktop focus
- 🗂️ **Project Structure**: Tối ưu hóa cấu trúc cho desktop app

#### Fixed
- 🐛 **Python 3.14 Compatibility**: Sửa lỗi SQLAlchemy với Python 3.14
- 🐛 **Flask-SQLAlchemy**: Cập nhật lên version 3.1.1 tương thích Flask 3.x
- 🐛 **opentele Error**: Xử lý lỗi import opentele trên Python 3.14

#### Removed
- 🗑️ **Obsolete Files**: Xóa run_with_log.py, fix_dependencies.bat

### Dependencies Updates
- ⬆️ sqlalchemy: 1.4.41 → 2.0.46
- ⬆️ flask-sqlalchemy: 2.5.1 → 3.1.1
- ⬆️ alembic: 1.8.0 → 1.13.1
- ⬆️ flask-migrate: 3.1.0 → 4.0.5
- ➕ pywebview: ^5.0.0
- ➕ pystray: ^0.19.5
- ➕ pyinstaller: ^6.0.0

## [1.0.0] - 2025-08-25

### Initial Release - Web Application

#### Features
- 🌐 Flask web application
- 📱 Telegram integration
- 🔐 Auto-login from Telegram Desktop
- 📁 File management (upload, download, organize)
- 🔍 Advanced search and filtering
- 🔗 Secure file sharing with links
- 📊 Smart folders with auto-organization
- 👥 User authentication and authorization
- 🎨 Modern Google Drive-like UI
- 📡 Real-time updates with WebSocket
- 🔒 Security features (bcrypt, rate limiting)

#### Core Components
- Flask 3.1.0
- SQLAlchemy 1.4.41
- Telethon 1.34.0
- Flask-Login, Flask-WTF
- Bootstrap UI

---

## Version Format

Format: `[MAJOR.MINOR.PATCH]`

- **MAJOR**: Thay đổi lớn, breaking changes
- **MINOR**: Tính năng mới, backward compatible
- **PATCH**: Bug fixes, improvements

## Categories

- **Added**: Tính năng mới
- **Changed**: Thay đổi trong tính năng hiện có
- **Deprecated**: Tính năng sẽ bị xóa
- **Removed**: Tính năng đã xóa
- **Fixed**: Bug fixes
- **Security**: Bảo mật

---

[2.0.0]: https://github.com/yourusername/teledrive/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/yourusername/teledrive/releases/tag/v1.0.0
