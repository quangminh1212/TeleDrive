# TeleDrive

Modern Telegram channel file management with both CLI and Web interface.

## Features

- 📋 List files from Telegram channels
- 🔍 Search files by name
- ⬇️ Download files
- ⬆️ Upload files
- 🌐 Modern web interface
- 💻 Command-line interface
- 🎨 Clean, minimalist design

## Quick Start

### Option 1: Web Interface (Recommended)

1. **Setup:**
   ```bash
   # Run setup script
   setup.bat

   # Or manually:
   pip install -r requirements.txt
   ```

2. **Configure:**
   Edit `.env` with your Telegram API credentials

3. **Run Web Interface:**
   ```bash
   python app.py
   # Or use: run_web.bat
   ```

4. **Access:** Open http://localhost:5000 in your browser

### Option 2: Command Line Interface

```bash
# List files
python teledrive.py list @mychannel 10

# Search files
python teledrive.py search @mychannel "video" 5

# Download file (by number from list)
python teledrive.py download @mychannel 1

# Upload file
python teledrive.py upload @mychannel ./file.pdf "My document"
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
app.py                 # Web application
teledrive.py          # CLI application
teledrive_core.py     # Core functionality
requirements.txt      # Dependencies
.env                  # Configuration
README.md            # This file
setup.bat            # Setup script
run_web.bat          # Run web interface
templates/           # HTML templates
static/              # CSS, JS, images
downloads/           # Downloaded files (auto-created)
uploads/             # Temporary upload files (auto-created)
```

## Web Interface Features

- 🎨 **Modern Design** - Clean, minimalist interface
- 📱 **Responsive** - Works on desktop and mobile
- 🔄 **Real-time Updates** - Live connection status
- 📁 **File Management** - Grid and list views
- 🔍 **Search** - Real-time file search
- ⬆️ **Drag & Drop Upload** - Easy file uploading
- 📊 **Progress Tracking** - Upload/download progress
- 🌙 **Dark Mode Ready** - Modern color scheme

## Advantages

- ✅ **Dual Interface** - Both web and CLI
- ✅ **Modern UI** - Beautiful, responsive design
- ✅ **Easy to Use** - Intuitive web interface
- ✅ **Minimal Dependencies** - Flask, Telethon, python-dotenv
- ✅ **Real-time Updates** - WebSocket support
- ✅ **Cross-platform** - Works on Windows, Linux, macOS
- ✅ **Drag & Drop** - Modern file upload experience

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
