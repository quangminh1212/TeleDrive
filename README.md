# TeleDrive

Modern Telegram channel file management with desktop app and CLI.

## Features

- 📋 List files from Telegram channels
- 🔍 Search files by name
- ⬇️ Download files
- ⬆️ Upload files
- 🖥️ Modern desktop app
- 💻 Command-line interface
- 🎨 Clean, minimalist design

## Quick Start

### Option 1: Desktop App (Recommended)

1. **Setup:**
   ```bash
   # Run setup script
   setup.bat

   # Or manually:
   pip install -r requirements.txt
   ```

2. **Configure:**
   Edit `.env` with your Telegram API credentials

3. **Run Desktop App:**
   ```bash
   python desktop.py
   # Or use: run.bat
   ```

### Option 2: Command Line Interface

```bash
# List files
python cli.py list @mychannel 10

# Search files
python cli.py search @mychannel "video" 5

# Download file (by number from list)
python cli.py download @mychannel 1

# Upload file
python cli.py upload @mychannel ./file.pdf "My document"
```

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `list <channel> [limit]` | List files from channel | `list @mychannel 20` |
| `search <channel> <query> [limit]` | Search files by name | `search @mychannel "pdf" 10` |
| `download <channel> <file_number>` | Download file by number | `download @mychannel 1` |
| `upload <channel> <file_path> [caption]` | Upload file to channel | `upload @mychannel ./file.pdf "Doc"` |

## Configuration

Edit `.env` file:

```env
API_ID=your_api_id
API_HASH=your_api_hash
PHONE_NUMBER=+your_phone_number
SESSION_NAME=teledrive_session
DOWNLOAD_DIR=./downloads
```

## Getting Telegram API Credentials

1. Go to https://my.telegram.org/apps
2. Create a new application
3. Copy API_ID and API_HASH to your `.env` file

## File Structure

```
desktop.py          # Desktop application
cli.py              # CLI application
core.py             # Core functionality
requirements.txt    # Dependencies
.env                # Configuration
README.md           # This file
setup.bat           # Setup script
run.bat             # Run desktop app
downloads/          # Downloaded files (auto-created)
```

## Desktop App Features

- 🖥️ **Native Desktop** - True desktop application
- 🎨 **Modern UI** - Clean, professional interface
- 🚀 **Fast Performance** - No browser overhead
- 📁 **File Management** - Browse, search, download files
- ⬆️ **Easy Upload** - File picker support
- 📊 **Progress Tracking** - Real-time upload/download progress
- ⚙️ **Settings Panel** - Configure API credentials
- 🌓 **Theme Support** - Light and dark modes
- 💾 **Simple & Clean** - Minimalist design

## Advantages

- ✅ **Dual Interface** - Desktop app and CLI
- ✅ **Modern UI** - Beautiful, professional design
- ✅ **Native Performance** - Fast desktop application
- ✅ **Easy to Use** - Intuitive graphical interface
- ✅ **Cross-platform** - Works on Windows, Linux, macOS
- ✅ **Minimal Dependencies** - Simple and lightweight
- ✅ **Real-time Updates** - Live status and progress tracking
- ✅ **Clean Design** - Minimalist and focused

## Examples

```bash
# List 20 files from a channel
python teledrive.py list @mychannel 20

# Search for PDF files
python teledrive.py search @mychannel "pdf" 10

# Download the first file from the list
python teledrive.py download @mychannel 1

# Upload a document with caption
python teledrive.py upload @mychannel ./document.pdf "Important document"
```
