# Hướng dẫn Build TeleDrive Desktop

## Yêu cầu

- Python 3.11 hoặc 3.12 (khuyến nghị)
- Windows 10 hoặc mới hơn
- 2GB dung lượng trống

## Bước 1: Chuẩn bị môi trường

```bash
# Clone repository
git clone https://github.com/yourusername/teledrive.git
cd teledrive

# Tạo virtual environment
python -m venv .venv

# Kích hoạt virtual environment
.venv\Scripts\activate

# Cài đặt dependencies
pip install -r requirements.txt
```

## Bước 2: Tạo icon (Tùy chọn)

```bash
python create_icon.py
```

Hoặc tự tạo file `icon.ico` với kích thước 256x256px.

## Bước 3: Test ứng dụng

```bash
# Test desktop mode
python main.py
```

Đảm bảo ứng dụng chạy tốt trước khi build.

## Bước 4: Build executable

### Option A: Quick Build (Development)

```bash
python build.py
```

### Option B: Release Build (Production)

```bash
release.bat
```

Script sẽ:
1. Kiểm tra prerequisites
2. Dọn dẹp build cũ
3. Tạo/verify icon
4. Build executable với PyInstaller
5. Tạo Portable version (folder + ZIP)
6. Build Installer với Inno Setup (nếu có)
7. Generate SHA256 checksums
8. Mở thư mục release

**Output:**
- `release/TeleDrive-Portable-v2.0.0/` - Portable folder
- `release/TeleDrive-Portable-v2.0.0-Windows.zip` - Portable ZIP
- `release/TeleDrive-Setup-v2.0.0.exe` - Installer (nếu có Inno Setup)
- `release/checksums.txt` - SHA256 checksums

## Bước 5: Kiểm tra kết quả

### Development Build (build.py)

```
dist/
└── TeleDrive/
    ├── TeleDrive.exe       # Executable chính
    ├── _internal/          # Dependencies
    ├── .env.example        # File cấu hình mẫu
    └── README.txt          # Hướng dẫn sử dụng
```

### Release Build (release.bat)

```
release/
├── TeleDrive-Portable-v2.0.0/              # Portable folder
│   ├── TeleDrive.exe
│   ├── _internal/
│   ├── data/                                # Pre-created directories
│   ├── logs/
│   ├── .portable                            # Portable marker
│   ├── README.txt                           # Portable guide
│   └── ...
├── TeleDrive-Portable-v2.0.0-Windows.zip   # Portable ZIP
├── TeleDrive-Setup-v2.0.0.exe              # Installer
└── checksums.txt                            # SHA256 hashes
```

## Bước 6: Test executable

```bash
cd dist/TeleDrive
TeleDrive.exe
```

## Bước 7: Đóng gói distribution

### Tạo ZIP

```bash
# Từ thư mục gốc
cd dist
powershell Compress-Archive -Path TeleDrive -DestinationPath TeleDrive-v2.0.0-windows.zip
```

### Tạo Installer (Tùy chọn)

Sử dụng Inno Setup:

1. Tải Inno Setup: https://jrsoftware.org/isdl.php
2. Tạo file `installer.iss`:

```iss
[Setup]
AppName=TeleDrive
AppVersion=2.0.0
DefaultDirName={pf}\TeleDrive
DefaultGroupName=TeleDrive
OutputDir=installer
OutputBaseFilename=TeleDrive-Setup-v2.0.0

[Files]
Source: "dist\TeleDrive\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\TeleDrive"; Filename: "{app}\TeleDrive.exe"
Name: "{commondesktop}\TeleDrive"; Filename: "{app}\TeleDrive.exe"
```

3. Compile với Inno Setup

## Troubleshooting

### Lỗi: Module not found

```bash
# Cài lại dependencies
pip install -r requirements.txt --force-reinstall
```

### Lỗi: PyInstaller failed

```bash
# Xóa cache và thử lại
rmdir /s /q build dist
del TeleDrive.spec
python build.py
```

### Executable quá lớn

Thêm vào `build.py`:
```python
# Trong phần excludes của Analysis
excludes=['matplotlib', 'numpy', 'scipy', 'pandas']
```

### Lỗi khi chạy .exe

1. Kiểm tra log: `teledrive.log`
2. Chạy từ command line để xem lỗi:
   ```bash
   TeleDrive.exe
   ```

## Build Options

### Build với console (debug)

Sửa trong `TeleDrive.spec`:
```python
console=True,  # Hiện console window
```

### Build single file

Sửa trong `build.py`:
```python
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,  # Thêm dòng này
    a.zipfiles,  # Thêm dòng này
    a.datas,     # Thêm dòng này
    [],
    name='TeleDrive',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    icon='icon.ico'
)
# Xóa phần COLLECT
```

## Best Practices

1. **Test trước khi build**: Luôn test `python main.py` trước
2. **Version control**: Tag version trước khi build
3. **Clean build**: Xóa `build/` và `dist/` trước mỗi build
4. **Test executable**: Test trên máy sạch (không có Python)
5. **Antivirus**: Thêm exception cho PyInstaller

## Phân phối

### Checklist trước khi release

- [ ] Test executable trên máy sạch
- [ ] Kiểm tra file size hợp lý
- [ ] Test auto-login
- [ ] Test upload/download
- [ ] Kiểm tra README.txt
- [ ] Tạo .env.example
- [ ] Tag version trong git
- [ ] Tạo release notes

### Upload lên GitHub Releases

```bash
# Tag version
git tag -a v2.0.0 -m "Desktop version 2.0.0"
git push origin v2.0.0

# Upload ZIP file lên GitHub Releases
```

## Cập nhật

Khi có version mới:

1. Cập nhật version trong `build.py`
2. Cập nhật CHANGELOG
3. Build lại
4. Test
5. Tag và release

---

**Happy Building! 🚀**
