# TeleDrive - Google Drive-like Telegram File Manager

Modern web interface for scanning and managing files from Telegram channels with Google Drive-inspired design.

## 🚀 Quick Start

### Web Interface (Recommended)
1. **Start web server**: Double-click `start.bat` or `web.bat`
2. **Open browser**: Go to http://localhost:3000
3. **Configure**: Visit Settings page to set up Telegram API
4. **Start scanning**: Use the web interface to scan channels

### Command Line Interface
1. **Setup**: Run `setup.bat`
2. **Configure**: Run `config.bat` (option 2 for phone number)
3. **Scan**: Run `run.bat`

## 🌐 Web Interface Features

### Google Drive-like Design
- **Clean, modern interface** with familiar Google Drive styling
- **Responsive design** that works on desktop, tablet, and mobile
- **Drag & drop file upload** with progress indicators
- **Real-time scanning progress** with live updates
- **File grid and list views** with sorting and filtering
- **Context menus** for file operations

### Core Functionality
- **Telegram Channel Scanning**: Scan public and private channels with real-time progress
- **Advanced File Management**: Upload, download, preview, rename, move, and organize files
- **Folder Organization**: Create hierarchical folder structures with drag-and-drop support
- **File Preview**: Support for 10+ file types including images, videos, audio, text, PDF, JSON, CSV, Excel
- **Advanced Search**: Real-time search with auto-suggestions and filtering by type, folder, and tags
- **Bulk Operations**: Select multiple files for batch operations (delete, move, tag)
- **Database Integration**: SQLite database with full data persistence and migration support
- **Mobile Responsive**: Optimized interface for all device sizes with touch-friendly controls
- **Real-time Updates**: WebSocket integration for live progress and connection status
- **Settings Management**: Configure API credentials and application preferences

### Access Points
- **Main Dashboard**: http://localhost:3000
- **Settings Page**: http://localhost:3000/settings
- **Channel Scanner**: http://localhost:3000/scan

## 🔧 Manual Setup

1. **Run setup**: Execute `setup.bat`
2. **Edit .env**: Replace `+84xxxxxxxxx` with your real phone number
3. **Edit config.json**: Customize configuration (optional)
4. **Run scanner**: Execute `run.bat` for CLI or `start.bat` for web

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

## File structure

```
TeleDrive/
├── setup.bat         # Cai dat dependencies
├── config.bat        # Quan ly cau hinh (bao gom phone + chi tiet)
├── run.bat           # Chay scanner
├── main.py           # Script chinh voi logging chi tiet
├── engine.py         # Core engine voi logging chi tiet
├── config.py         # Load cau hinh voi logging
├── config_manager.py # Quan ly cau hinh tich hop (sync + validation)
├── logger.py         # He thong logging chi tiet
├── config.json       # Cau hinh chi tiet (bao gom logging)

├── logs/             # Thu muc chua tat ca log files
│   ├── scanner.log   # Log chinh
│   ├── config.log    # Log cau hinh
│   ├── api.log       # Log API calls
│   ├── files.log     # Log file operations
│   └── errors.log    # Log loi chi tiet
└── output/           # Ket qua scan
```

## Loi thuong gap

- **"invalid literal for int()"**: Chua cau hinh .env
- **"Could not find entity"**: Sai ten channel hoac chua join
- **"Python not found"**: Chua cai Python

## Output format

- CSV: Du lieu bang
- Excel: Format dep
- JSON: Du lieu chi tiet
- Simple JSON: Chi ten file + link
