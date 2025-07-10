# TeleDrive - File Structure

## 📁 Core Files

### `desktop.py` - Main Desktop Application
- Modern GUI using CustomTkinter
- 4 main sections: Dashboard, Files, Upload, Settings
- Real-time connection status
- File browser with search
- Upload with progress tracking
- Settings panel for API configuration

### `cli.py` - Command Line Interface
- Simple CLI for automation
- Commands: list, search, download, upload
- Perfect for scripting and batch operations

### `core.py` - Core Functionality
- Shared logic between desktop and CLI
- Telegram API integration using Telethon
- Async file operations
- Error handling and session management

## 🔧 Configuration Files

### `requirements.txt` - Dependencies
```
telethon>=1.24.0
python-dotenv>=0.19.0
customtkinter>=5.2.0
pillow>=9.0.0
tkinterdnd2>=0.3.0
```

### `.env` - API Configuration
```
API_ID=21272067
API_HASH=b7690dc86952dbc9b16717b101164af3
PHONE_NUMBER=+1234567890
SESSION_NAME=teledrive_session
DOWNLOAD_DIR=./downloads
```

### `setup.bat` - Setup Script
- Creates virtual environment
- Installs dependencies
- Creates .env file
- Creates directories

### `run.bat` - Run Desktop App
- Activates virtual environment
- Starts desktop application

## 📖 Documentation

### `README.md` - Main Documentation
- Project overview
- Installation instructions
- Usage examples
- Features list

### `GUIDE.md` - Quick Start Guide
- Step-by-step setup
- Common tasks
- Troubleshooting
- Tips and tricks

### `FILES.md` - This File
- File structure explanation
- Purpose of each file
- Dependencies overview

## 📂 Directories

### `downloads/` - Downloaded Files
- Auto-created directory
- Default location for downloaded files
- Can be configured in .env

### `__pycache__/` - Python Cache
- Auto-generated Python bytecode
- Can be safely deleted
- Improves startup performance

## 🎯 Usage Patterns

### Desktop App Workflow
1. Run `setup.bat` (first time only)
2. Edit `.env` with your credentials
3. Run `run.bat` or `python desktop.py`
4. Connect to Telegram
5. Browse/upload/download files

### CLI Workflow
1. Run `setup.bat` (first time only)
2. Edit `.env` with your credentials
3. Use commands like `python cli.py list @channel`

## 🔄 File Dependencies

```
desktop.py
├── core.py (shared logic)
├── customtkinter (GUI framework)
├── tkinter (file dialogs)
└── threading (async operations)

cli.py
├── core.py (shared logic)
├── argparse (command parsing)
└── asyncio (async operations)

core.py
├── telethon (Telegram API)
├── python-dotenv (config loading)
├── pathlib (file operations)
└── asyncio (async operations)
```

## 🚀 Quick Commands

```bash
# Setup (first time)
setup.bat

# Run desktop app
run.bat
# or
python desktop.py

# CLI examples
python cli.py list @mychannel 20
python cli.py search @mychannel "pdf" 10
python cli.py download @mychannel 1
python cli.py upload @mychannel file.pdf "Caption"
```

## 📊 File Sizes (Approximate)

- `desktop.py` - ~25KB (main GUI application)
- `cli.py` - ~8KB (command line interface)
- `core.py` - ~15KB (shared functionality)
- `requirements.txt` - ~200B (dependencies list)
- `.env` - ~300B (configuration)
- `README.md` - ~5KB (documentation)
- `GUIDE.md` - ~3KB (quick start)

**Total Project Size: ~60KB** (excluding dependencies)

## 🎨 Design Philosophy

- **Minimalist**: Only essential files
- **Modular**: Shared core logic
- **Simple**: Easy to understand and modify
- **Clean**: No unnecessary complexity
- **Focused**: File management only

---

**Clean, simple, and effective! 🎯**
