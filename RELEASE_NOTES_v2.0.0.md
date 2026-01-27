# TeleDrive v2.0.0 - Release Notes

## 🎉 Major Release: Desktop Application

**Release Date**: 2026-01-28  
**Version**: 2.0.0  
**Type**: Major Update

---

## 🌟 Highlights

### Desktop Application
- ✨ **Native Desktop App** - Chạy như phần mềm thông thường
- 🖥️ **PyWebView Integration** - Native window rendering (optional)
- 🌐 **Browser Fallback** - Tự động mở browser nếu không có PyWebView
- 📦 **Portable Version** - Giải nén và chạy, không cần cài đặt
- 💿 **Windows Installer** - Cài đặt truyền thống với shortcuts

### Session Management
- 🔐 **Copy Session from Telegram Desktop** - Không cần login lại!
- 🚀 **Auto-login** - Tự động sử dụng session đã có
- 🔧 **Python 3.14 Compatible** - Workaround cho opentele issues

### Build System
- 🏗️ **Automated Release Build** - `release.bat` tự động hóa mọi thứ
- 📦 **Portable + Installer** - Build cả 2 versions cùng lúc
- 🔒 **SHA256 Checksums** - Verify integrity
- 📝 **Comprehensive Documentation** - Đầy đủ hướng dẫn

---

## 📋 What's New

### Features

#### Desktop Application
- **main.py** - Entry point cho desktop app
- **PyWebView support** - Native window với fallback
- **Browser mode** - Tự động mở browser nếu cần
- **System tray** - Minimize to tray (planned)

#### Session Copy Utility
- **copy_telegram_session.py** - Copy session từ Telegram Desktop
- **Auto-detection** - Tự động tìm và kiểm tra Telegram Desktop
- **Multi-session support** - Copy tất cả session folders
- **Session marker** - Đánh dấu session đã copy

#### Build System
- **release.bat** - Automated release builder
  - Clean old builds
  - Create icon
  - Build executable
  - Package portable version
  - Build installer (Inno Setup)
  - Generate checksums
  
- **build.py** - Development build script
- **installer.iss** - Inno Setup configuration
- **run_desktop.bat** - Desktop mode launcher

### Improvements

#### Python 3.14 Compatibility
- ✅ SQLAlchemy 2.0.46 - Full Python 3.14 support
- ✅ Flask-SQLAlchemy 3.1.1 - Flask 3.x compatible
- ⚠️ PyWebView optional - Fallback to browser
- ⚠️ opentele workaround - Use session copy instead

#### Documentation
- 📖 **README.md** - Desktop focus
- 🔨 **BUILD_GUIDE.md** - Build instructions
- 🚀 **RELEASE_GUIDE.md** - Release process
- 📝 **QUICK_START.md** - Quick reference
- 🐍 **PYTHON_COMPATIBILITY.md** - Compatibility notes
- 📋 **SESSION_COPY_GUIDE.md** - Session copy guide
- 📜 **CHANGELOG.md** - Version history
- 🔄 **MIGRATION_TO_DESKTOP.md** - Migration docs

### Bug Fixes
- 🐛 Fix run.bat - Use app/app.py instead of deleted file
- 🐛 Fix opentele import - Graceful error handling
- 🐛 Fix auto-login - Better error messages
- 🐛 Fix session detection - More reliable checks

---

## 🔧 Technical Changes

### Dependencies Updated
```
sqlalchemy: 1.4.41 → 2.0.46
flask-sqlalchemy: 2.5.1 → 3.1.1
alembic: 1.8.0 → 1.13.1
flask-migrate: 3.1.0 → 4.0.5
```

### Dependencies Added
```
pywebview>=5.0.0 (optional)
pystray>=0.19.5
Pillow>=10.0.0
pyinstaller>=6.0.0
```

### Files Added
```
main.py                      - Desktop entry point
build.py                     - Build script
release.bat                  - Release automation
run_desktop.bat              - Desktop launcher
copy_telegram_session.py     - Session copy utility
create_icon.py               - Icon generator
installer.iss                - Inno Setup script
PORTABLE_README.txt          - Portable guide
+ 8 documentation files
```

### Files Removed
```
run_with_log.py             - Merged into main.py
fix_dependencies.bat        - No longer needed
```

---

## 📦 Downloads

### Portable Version (Recommended)
**File**: `TeleDrive-Portable-v2.0.0-Windows.zip`  
**Size**: ~50-100MB  
**SHA256**: `[see checksums.txt]`

**Features**:
- ✅ No installation required
- ✅ Run from any location
- ✅ Portable data folder
- ✅ Easy to backup

**Usage**:
1. Extract ZIP
2. Run `TeleDrive.exe`
3. Done!

### Installer Version
**File**: `TeleDrive-Setup-v2.0.0.exe`  
**Size**: ~50-100MB  
**SHA256**: `[see checksums.txt]`

**Features**:
- ✅ Traditional Windows installer
- ✅ Start Menu shortcuts
- ✅ Desktop shortcut (optional)
- ✅ Uninstaller included

**Usage**:
1. Run installer
2. Follow wizard
3. Launch from Start Menu

---

## 🚀 Getting Started

### Quick Start

#### Option 1: Copy Session (Recommended)
```bash
# Copy session from Telegram Desktop
python copy_telegram_session.py

# Run desktop app
python main.py
```

#### Option 2: Manual Login
```bash
# Run app
python main.py

# Login with phone number + code
```

### System Requirements
- Windows 10 or later
- 4GB RAM
- 500MB free disk space
- Internet connection
- Telegram Desktop (for session copy)

---

## ⚠️ Known Issues

### Python 3.14 Limitations

1. **opentele not working**
   - **Impact**: Auto-login from Desktop không hoạt động
   - **Workaround**: Sử dụng `copy_telegram_session.py`

2. **PyWebView build issues**
   - **Impact**: Native window không khả dụng
   - **Workaround**: Tự động fallback sang browser

### Recommendations
- ✅ Use Python 3.11 or 3.12 for best experience
- ✅ Use `copy_telegram_session.py` for easy login
- ✅ Keep Telegram Desktop installed

---

## 🔄 Migration from v1.x

### For Users
1. Backup your `data/` folder
2. Download v2.0.0
3. Copy session: `python copy_telegram_session.py`
4. Run: `python main.py`

### For Developers
1. Pull latest changes
2. Update dependencies: `pip install -r requirements.txt`
3. Review `MIGRATION_TO_DESKTOP.md`
4. Test desktop mode: `python main.py`

---

## 📚 Documentation

- [README.md](README.md) - Overview
- [QUICK_START.md](QUICK_START.md) - Quick start guide
- [BUILD_GUIDE.md](BUILD_GUIDE.md) - Build instructions
- [RELEASE_GUIDE.md](RELEASE_GUIDE.md) - Release process
- [SESSION_COPY_GUIDE.md](SESSION_COPY_GUIDE.md) - Session copy guide
- [PYTHON_COMPATIBILITY.md](PYTHON_COMPATIBILITY.md) - Compatibility notes
- [CHANGELOG.md](CHANGELOG.md) - Full changelog

---

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 🐛 Bug Reports

Found a bug? Please report it:
- GitHub Issues: https://github.com/yourusername/teledrive/issues
- Include: Python version, OS, error message, steps to reproduce

---

## 💬 Support

- 📖 Documentation: See docs above
- 🐛 Issues: GitHub Issues
- 💡 Discussions: GitHub Discussions

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

- Telethon - Telegram client library
- Flask - Web framework
- PyWebView - Desktop window library
- PyInstaller - Executable builder
- Inno Setup - Windows installer

---

## 🎯 What's Next?

### v2.1.0 (Planned)
- System tray integration
- Auto-update mechanism
- macOS support
- Linux support

### v2.2.0 (Planned)
- Native notifications
- File drag & drop
- Improved UI/UX
- Performance optimizations

---

**TeleDrive Team**  
2026-01-28

---

**Download**: [GitHub Releases](https://github.com/yourusername/teledrive/releases/tag/v2.0.0)  
**Source**: [GitHub Repository](https://github.com/yourusername/teledrive)

🚀 **Happy File Managing!**
