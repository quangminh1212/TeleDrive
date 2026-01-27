# Python Compatibility Notes

## Recommended Python Versions

- ✅ **Python 3.11** - Fully supported, recommended
- ✅ **Python 3.12** - Fully supported
- ⚠️ **Python 3.14** - Supported with limitations

## Python 3.14 Limitations

### 1. opentele (Auto-login from Telegram Desktop)

**Issue**: opentele 1.15.1 không tương thích với Python 3.14

**Workaround**:
- Sử dụng manual login (nhập số điện thoại + mã xác thực)
- Hoặc downgrade xuống Python 3.11/3.12

**Error message**:
```
BaseException: err
```

### 2. pywebview (Desktop Window)

**Issue**: pywebview 6.x yêu cầu pythonnet, có vấn đề build trên Python 3.14

**Solution**: Đã giới hạn pywebview ở version 5.x trong requirements.txt
```
pywebview>=5.0.0,<6.0.0
```

## Installation Issues

### pythonnet Build Error

Nếu gặp lỗi:
```
ERROR: Failed building wheel for pythonnet
```

**Giải pháp**:
1. Sử dụng Python 3.11 hoặc 3.12
2. Hoặc cài đặt pre-built wheel:
   ```bash
   pip install pywebview==5.2.0
   ```

### SQLAlchemy Compatibility

**Fixed**: Đã cập nhật lên SQLAlchemy 2.0.46 tương thích Python 3.14

## Recommended Setup

### For Development

```bash
# Use Python 3.11 or 3.12
python --version  # Should show 3.11.x or 3.12.x

# Create virtual environment
python -m venv .venv

# Activate
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### For Production Build

```bash
# Use Python 3.11 for best compatibility
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python build.py
```

## Testing Compatibility

```bash
# Test imports
python -c "import pywebview; print('pywebview OK')"
python -c "import flask; print('flask OK')"
python -c "import sqlalchemy; print('sqlalchemy OK')"
python -c "import telethon; print('telethon OK')"

# Test desktop app
python main.py
```

## Downgrading Python

Nếu cần downgrade từ 3.14 xuống 3.11:

1. Download Python 3.11: https://www.python.org/downloads/
2. Cài đặt Python 3.11
3. Xóa virtual environment cũ:
   ```bash
   rmdir /s /q .venv
   ```
4. Tạo lại với Python 3.11:
   ```bash
   py -3.11 -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

## Version Matrix

| Component | Python 3.11 | Python 3.12 | Python 3.14 |
|-----------|-------------|-------------|-------------|
| Flask 3.1.0 | ✅ | ✅ | ✅ |
| SQLAlchemy 2.0.46 | ✅ | ✅ | ✅ |
| Telethon 1.34.0 | ✅ | ✅ | ✅ |
| pywebview 5.x | ✅ | ✅ | ✅ |
| pywebview 6.x | ✅ | ✅ | ❌ |
| opentele 1.15.1 | ✅ | ✅ | ❌ |
| PyInstaller 6.x | ✅ | ✅ | ✅ |

## Future Updates

Theo dõi các issues:
- opentele Python 3.14 support
- pywebview/pythonnet Python 3.14 support

## Support

Nếu gặp vấn đề tương thích:
1. Kiểm tra Python version: `python --version`
2. Kiểm tra log: `teledrive.log`
3. Thử với Python 3.11/3.12
4. Report issue với thông tin:
   - Python version
   - OS version
   - Error message
   - Full traceback

---

**Last Updated**: 2026-01-28
