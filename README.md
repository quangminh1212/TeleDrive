# TeleDrive

[![Python Version](https://img.shields.io/badge/python-3.8+-blue.svg)](https://python.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Code Style](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![Pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit&logoColor=white)](https://github.com/pre-commit/pre-commit)

**Advanced Telegram Channel File Scanner with Private Channel Support**

TeleDrive is a powerful, modern Python application for scanning Telegram channels and extracting comprehensive file information. It features special support for private channels, multiple output formats, and a rich command-line interface.

## ✨ Features

- 🔐 **Private Channel Support** - Scan private channels with invite links
- 📊 **Multiple Output Formats** - JSON, CSV, Excel with customizable fields
- 🎯 **Advanced Filtering** - Filter by file type, size, date, patterns
- 🚀 **High Performance** - Async processing with configurable batch sizes
- 🎨 **Rich CLI Interface** - Beautiful command-line interface with progress bars
- ⚙️ **Flexible Configuration** - Pydantic-based config with validation
- 📝 **Comprehensive Logging** - Detailed logging with file rotation
- 🔧 **Developer Friendly** - Modern Python packaging with full tooling support

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# Run the setup script
scripts\setup.bat

# Configure your credentials
# Edit config.json with your Telegram API credentials

# Start scanning
scripts\run.bat
```

### Option 2: Manual Installation
```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements/dev.txt

# Install in development mode
pip install -e .

<<<<<<< HEAD
### 🚀 Workflow toi uu:
```bash
# Lan dau su dung
setup.bat → config.bat → run.bat

# Su dung hang ngay
run.bat
```

### 🔐 Login tu dong:
- He thong se tu dong xu ly login khi can
- Khong can chay rieng login.bat nua
- Chi can chay run.bat la du cho moi tinh huong

### 📋 Dinh dang channel ho tro:
- **Private channel**: `https://t.me/joinchat/xxxxx` hoac `https://t.me/+xxxxx`
=======
# Run the application
python -m teledrive.cli.main scan
```

## 📋 Prerequisites

- Python 3.8 or higher
- Telegram API credentials (get from [my.telegram.org/apps](https://my.telegram.org/apps))
- Windows (scripts provided for Windows, but works on Linux/Mac too)

## ⚙️ Configuration

### 1. Telegram API Setup

1. Visit [my.telegram.org/apps](https://my.telegram.org/apps)
2. Create a new application
3. Note down your `api_id` and `api_hash`

### 2. Configuration File

Edit `config.json` with your credentials:

```json
{
  "telegram": {
    "api_id": "YOUR_API_ID",
    "api_hash": "YOUR_API_HASH",
    "phone_number": "+1234567890"
  },
  "output": {
    "directory": "output",
    "formats": {
      "json": {"enabled": true},
      "csv": {"enabled": true},
      "excel": {"enabled": true}
    }
  },
  "scanning": {
    "max_messages": null,
    "batch_size": 100,
    "file_types": {
      "documents": true,
      "photos": true,
      "videos": true,
      "audio": true
    }
  }
}
```

### 3. Environment Variables (Optional)

You can also use environment variables:

```bash
set TELEDRIVE_API_ID=your_api_id
set TELEDRIVE_API_HASH=your_api_hash
set TELEDRIVE_PHONE_NUMBER=+1234567890
```

## 🎯 Usage

### Command Line Interface

```bash
# Scan a public channel
teledrive scan --channel @channelname

# Scan a private channel with invite link
teledrive scan --private --channel https://t.me/joinchat/xxxxx

# Scan with specific output format
teledrive scan --channel @channelname --format json

# Limit number of messages
teledrive scan --channel @channelname --max-messages 1000

# Interactive mode
teledrive scan
```

### Script Usage

```bash
# Quick start
scripts\run.bat

# Development workflow
scripts\dev.bat test      # Run tests
scripts\dev.bat format    # Format code
scripts\dev.bat lint      # Run linting
scripts\dev.bat build     # Build package
```

### Configuration Management

```bash
# Show current configuration
teledrive config --show

# Validate configuration
teledrive config --validate

# Set configuration values
teledrive config --set telegram.api_id 12345
teledrive config --set output.directory ./my_output
```
>>>>>>> 5cd311c28ab0746a2cc2ce9f78e7bad7d2103098
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

## 📊 Output Formats

TeleDrive supports multiple output formats:

### JSON Format
```json
{
  "files": [
    {
      "name": "document.pdf",
      "size": 1048576,
      "type": "document",
      "date": "2025-01-15T10:30:00Z",
      "download_link": "https://t.me/c/123456/789",
      "sender": "username",
      "message_id": 789
    }
  ],
  "summary": {
    "total_files": 1,
    "total_size": 1048576,
    "scan_date": "2025-01-15T12:00:00Z"
  }
}
```

### CSV Format
Comma-separated values with columns: Name, Size, Type, Date, Download Link, Sender, Message ID

### Excel Format
Formatted Excel file with auto-filtering and frozen headers

## 🛠️ Development

### Modern Project Structure
```
teledrive/
├── src/teledrive/          # Main package
│   ├── cli/               # Command line interface
│   ├── config/            # Configuration management
│   ├── core/              # Core business logic
│   └── utils/             # Utility functions
├── tests/                 # Test suite
├── scripts/               # Automation scripts
├── requirements/          # Dependency files
└── docs/                  # Documentation
```

### Development Workflow
```bash
# Setup development environment
scripts\setup.bat

# Run tests
scripts\test.bat

# Format code
scripts\format.bat

# Run all quality checks
scripts\dev.bat check
```

## 🚀 Advanced Features

- ✅ **Private channel support** - Scan private channels/groups
- ✅ **Rich CLI interface** - Beautiful command-line with progress bars
- ✅ **Pydantic configuration** - Type-safe config with validation
- ✅ **Async processing** - High-performance async scanning
- ✅ **Advanced filtering** - Filter by size, type, date, patterns
- ✅ **Comprehensive logging** - Detailed logging with file rotation
- ✅ **Modern packaging** - Following Python packaging standards
- ✅ **Developer tools** - Pre-commit hooks, testing, linting
- ✅ **Cross-platform** - Works on Windows, Linux, macOS

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Telethon](https://github.com/LonamiWebs/Telethon) - Telegram client library
- [Click](https://github.com/pallets/click) - Command line interface framework
- [Rich](https://github.com/Textualize/rich) - Rich text and beautiful formatting
- [Pydantic](https://github.com/pydantic/pydantic) - Data validation library

---

<p align="center">
  Made with ❤️ by the TeleDrive Team
</p>
