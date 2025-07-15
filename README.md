# TeleDrive - Professional Telegram File Scanner

A modern, professional tool for scanning and extracting file information from Telegram channels with clean architecture and comprehensive logging.

## ✨ Features

- 🔐 **Private Channel Support**: Scan private channels with invite links
- 📁 **Multiple Output Formats**: CSV, Excel, JSON, and Simple JSON
- 🚀 **Modern Architecture**: Clean, maintainable code structure
- 📊 **Detailed Logging**: Comprehensive logging system for debugging
- ⚙️ **Flexible Configuration**: JSON-based configuration with validation
- 🔄 **Auto-sync**: Environment variables to configuration sync

## Cai dat nhanh

1. **Chay setup**: Nhap doi `setup.bat`
2. **Cau hinh**: Nhap doi `config.bat` (chon option 2 de cau hinh so dien thoai)
3. **Chay scanner**: Nhap doi `run.bat`

## Cai dat thu cong

1. **Chay setup**: Nhap doi `setup.bat`
2. **Chinh sua .env**: Thay `+84xxxxxxxxx` bang so dien thoai that
3. **Chinh sua config.json**: Tuy chinh cau hinh (tuy chon)
4. **Chay scanner**: Nhap doi `run.bat`

## Quan ly cau hinh

### File .env (API Credentials)
```
TELEGRAM_API_ID=21272067
TELEGRAM_API_HASH=b7690dc86952dbc9b16717b101164af3
TELEGRAM_PHONE=+84936374950
```

### File config.json (Cau hinh chi tiet)
- **Telegram**: API credentials, session name, connection settings
- **Output**: Thu muc, format file (CSV, JSON, Excel, Simple JSON)
- **Scanning**: Gioi han message, batch size, loai file, performance
- **Download**: Tao link download, auto download, file size limits
- **Display**: Hien thi progress, ngon ngu, format ngay, colors
- **Filters**: Loc theo kich thuoc, phan mo rong, ngay thang, patterns
- **Logging**: Chi tiet log cho tung buoc, API calls, file operations
- **Security**: Session management, timeout, privacy settings

### Config Manager
Chay `config.bat` de quan ly cau hinh qua giao dien:
- Xem cau hinh hien tai
- Thay doi cau hinh Telegram API
- Cau hinh so dien thoai
- Tuy chinh output format
- Cau hinh scanning options
- Dat filter cho file
- Dong bo tu .env sang config.json
- Kiem tra validation cau hinh

## Su dung

- **Private channel**: `https://t.me/joinchat/xxxxx` hoac `https://t.me/+xxxxx`
- **Neu da join**: `@channelname`
- **Ket qua**: Luu trong thu muc `output/`

## Logging System

Du an co he thong logging chi tiet de theo doi tung buoc:

### Cac loai log:
- **scanner.log**: Log chinh cho toan bo qua trinh
- **config.log**: Log thay doi cau hinh
- **api.log**: Log cac API call den Telegram
- **files.log**: Log cac thao tac file (doc/ghi)
- **errors.log**: Log chi tiet cac loi xay ra

### Cau hinh logging trong config.json:
```json
{
  "logging": {
    "enabled": true,
    "level": "DEBUG",
    "detailed_steps": true,
    "log_api_calls": true,
    "log_file_operations": true,
    "separate_files": {
      "enabled": true
    }
  }
}
```

### Xem log:
- **Tat ca log**: Thu muc `logs/`
- **Log realtime**: Hien thi tren console
- **Log rotation**: Tu dong backup khi file qua lon

## 📁 Project Structure

```
TeleDrive/
├── src/
│   └── teledrive/
│       ├── __init__.py
│       ├── core/
│       │   ├── __init__.py
│       │   ├── scanner.py      # Main scanner functionality
│       │   └── client.py       # Telegram client management
│       ├── config/
│       │   ├── __init__.py
│       │   ├── manager.py      # Configuration management
│       │   └── settings.py     # Configuration settings
│       ├── utils/
│       │   ├── __init__.py
│       │   └── logger.py       # Logging system
│       └── cli/
│           ├── __init__.py
│           └── main.py         # Command line interface
├── config/
│   └── config.json             # Configuration file
├── logs/                       # Log files directory
├── output/                     # Scan results directory
├── tests/                      # Test files
├── docs/                       # Documentation
├── pyproject.toml              # Project configuration
├── setup.py                    # Setup script
├── requirements.txt            # Dependencies
├── run.bat                     # Run scanner
├── setup.bat                   # Setup dependencies
├── config.bat                  # Configuration manager
└── README.md                   # This file
```

## 🏗️ Architecture

The project follows modern Python packaging standards:

- **src/teledrive/**: Main package with modular structure
- **core/**: Core functionality (scanner, client)
- **config/**: Configuration management
- **utils/**: Utility functions (logging, etc.)
- **cli/**: Command line interface

## Loi thuong gap

- **"invalid literal for int()"**: Chua cau hinh .env
- **"Could not find entity"**: Sai ten channel hoac chua join
- **"Python not found"**: Chua cai Python

## Output format

- CSV: Du lieu bang
- Excel: Format dep
- JSON: Du lieu chi tiet
- Simple JSON: Chi ten file + link
