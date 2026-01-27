# Release Guide - TeleDrive Desktop

Hướng dẫn tạo và phát hành phiên bản mới của TeleDrive Desktop.

## Prerequisites

### Required
- Python 3.11 or 3.12
- Git
- PyInstaller (auto-installed by release.bat)

### Optional (for Installer)
- Inno Setup 6: https://jrsoftware.org/isdl.php

## Release Process

### 1. Chuẩn bị Release

#### Update Version

Cập nhật version trong các file sau:

**build.py:**
```python
# Line ~50
version = "2.0.0"  # Update this
```

**installer.iss:**
```iss
#define MyAppVersion "2.0.0"  ; Update this
```

**release.bat:**
```batch
set VERSION=2.0.0  REM Update this
```

**CHANGELOG.md:**
```markdown
## [2.0.0] - 2026-01-28
...
```

#### Update Documentation

- [ ] Update README.md với tính năng mới
- [ ] Update CHANGELOG.md với changes
- [ ] Review BUILD_GUIDE.md
- [ ] Check all documentation links

#### Test Application

```bash
# Test desktop mode
python main.py

# Test all features:
# - Login
# - Upload files
# - Download files
# - Search
# - Share links
# - Settings
```

### 2. Build Release

#### Run Release Script

```bash
release.bat
```

Script sẽ tự động:
1. ✅ Check prerequisites
2. ✅ Clean old builds
3. ✅ Create icon
4. ✅ Build executable
5. ✅ Package portable version
6. ✅ Build installer (if Inno Setup available)
7. ✅ Generate checksums

#### Verify Output

Kiểm tra thư mục `release/`:

```
release/
├── TeleDrive-Portable-v2.0.0/              # Portable folder
├── TeleDrive-Portable-v2.0.0-Windows.zip   # Portable ZIP (~50-100MB)
├── TeleDrive-Setup-v2.0.0.exe              # Installer (~50-100MB)
└── checksums.txt                            # SHA256 hashes
```

### 3. Test Release Builds

#### Test Portable Version

1. Giải nén ZIP vào thư mục test
2. Chạy TeleDrive.exe
3. Test các tính năng chính
4. Kiểm tra data/ và logs/ được tạo đúng

#### Test Installer

1. Chạy installer trên máy test (không có Python)
2. Cài đặt vào thư mục mặc định
3. Test ứng dụng
4. Test uninstaller

#### Test Checklist

- [ ] Application starts without errors
- [ ] Login works (auto-login or manual)
- [ ] Upload files
- [ ] Download files
- [ ] Search and filter
- [ ] Create share links
- [ ] Settings save correctly
- [ ] Application closes cleanly
- [ ] No console window appears
- [ ] Icon displays correctly
- [ ] Uninstaller works (installer only)

### 4. Create Git Tag

```bash
# Commit all changes
git add .
git commit -m "chore: prepare release v2.0.0"

# Create annotated tag
git tag -a v2.0.0 -m "Release version 2.0.0

Major Changes:
- Desktop application with native window
- Portable and installer versions
- Improved performance
- Bug fixes

See CHANGELOG.md for full details"

# Push commits and tags
git push origin main
git push origin v2.0.0
```

### 5. Create GitHub Release

#### Via GitHub Web Interface

1. Go to: https://github.com/yourusername/teledrive/releases/new
2. Select tag: `v2.0.0`
3. Release title: `TeleDrive Desktop v2.0.0`
4. Description:

```markdown
# TeleDrive Desktop v2.0.0

## 🎉 What's New

- 🖥️ Native desktop application
- 📦 Portable version (no installation required)
- 💿 Windows installer
- ⚡ Improved performance
- 🐛 Bug fixes and stability improvements

## 📥 Downloads

### Portable Version (Recommended)
- **TeleDrive-Portable-v2.0.0-Windows.zip** - Extract and run, no installation needed
- Size: ~XX MB
- SHA256: `[from checksums.txt]`

### Installer Version
- **TeleDrive-Setup-v2.0.0.exe** - Traditional Windows installer
- Size: ~XX MB
- SHA256: `[from checksums.txt]`

## 📋 System Requirements

- Windows 10 or later
- 4GB RAM
- 500MB free disk space
- Internet connection

## 🚀 Quick Start

### Portable
1. Download and extract ZIP
2. Run TeleDrive.exe
3. Login with Telegram

### Installer
1. Download and run installer
2. Follow installation wizard
3. Launch TeleDrive from Start Menu

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for full details.

## 🐛 Known Issues

- opentele not compatible with Python 3.14 (use manual login)

## 💬 Support

- [Documentation](README.md)
- [Report Bug](https://github.com/yourusername/teledrive/issues)
- [Request Feature](https://github.com/yourusername/teledrive/issues)
```

5. Upload files:
   - `TeleDrive-Portable-v2.0.0-Windows.zip`
   - `TeleDrive-Setup-v2.0.0.exe`
   - `checksums.txt`

6. Check "Set as the latest release"
7. Click "Publish release"

#### Via GitHub CLI (gh)

```bash
# Create release
gh release create v2.0.0 \
  --title "TeleDrive Desktop v2.0.0" \
  --notes-file release_notes.md \
  release/TeleDrive-Portable-v2.0.0-Windows.zip \
  release/TeleDrive-Setup-v2.0.0.exe \
  release/checksums.txt
```

### 6. Post-Release

#### Announce Release

- [ ] Update README.md download links
- [ ] Post on social media (if applicable)
- [ ] Notify users via email/Discord/etc.
- [ ] Update documentation site

#### Monitor

- [ ] Watch for bug reports
- [ ] Monitor download statistics
- [ ] Check user feedback
- [ ] Prepare hotfix if needed

## Hotfix Release

Nếu cần hotfix (e.g., v2.0.1):

1. Create hotfix branch:
   ```bash
   git checkout -b hotfix/v2.0.1
   ```

2. Fix bug và test

3. Update version to 2.0.1

4. Build release:
   ```bash
   release.bat
   ```

5. Commit và tag:
   ```bash
   git commit -m "fix: critical bug in file upload"
   git tag -a v2.0.1 -m "Hotfix v2.0.1"
   ```

6. Merge vào main:
   ```bash
   git checkout main
   git merge hotfix/v2.0.1
   git push origin main
   git push origin v2.0.1
   ```

7. Create GitHub release

## Troubleshooting

### Build fails

```bash
# Clean everything
rmdir /s /q build dist release
del TeleDrive.spec

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Try again
release.bat
```

### Installer build fails

- Check Inno Setup installation path in release.bat
- Verify installer.iss syntax
- Check file paths in installer.iss

### Antivirus flags executable

- Submit false positive report to antivirus vendor
- Consider code signing certificate
- Add build instructions for users to build themselves

### Large file size

- Review dependencies in build.py
- Exclude unnecessary packages
- Use UPX compression (already enabled)

## Best Practices

1. **Always test before release**
   - Test on clean Windows VM
   - Test both portable and installer
   - Test all major features

2. **Version numbering**
   - MAJOR: Breaking changes
   - MINOR: New features
   - PATCH: Bug fixes

3. **Keep changelog updated**
   - Document all changes
   - Include migration notes
   - Link to issues/PRs

4. **Security**
   - Scan builds with antivirus
   - Verify checksums
   - Consider code signing

5. **Backup**
   - Keep old releases
   - Archive source code
   - Document build environment

## Checklist

### Pre-Release
- [ ] Update version numbers
- [ ] Update CHANGELOG.md
- [ ] Update documentation
- [ ] Test application thoroughly
- [ ] Run release.bat
- [ ] Verify all outputs
- [ ] Test portable version
- [ ] Test installer version

### Release
- [ ] Commit all changes
- [ ] Create git tag
- [ ] Push to GitHub
- [ ] Create GitHub release
- [ ] Upload files
- [ ] Verify downloads work

### Post-Release
- [ ] Announce release
- [ ] Monitor for issues
- [ ] Update download links
- [ ] Archive release files

---

**Happy Releasing! 🚀**
