# TeleDrive Simple

A minimalist Telegram channel file manager in a single Python file.

## Features

- 📋 List files from Telegram channels
- 🔍 Search files by name
- ⬇️ Download files
- ⬆️ Upload files
- 🚀 Single file, easy to use

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements_simple.txt
   ```

2. **Configure:**
   ```bash
   cp .env_simple .env
   # Edit .env with your Telegram API credentials
   ```

3. **Use:**
   ```bash
   # List files
   python teledrive_simple.py list @mychannel 10
   
   # Search files
   python teledrive_simple.py search @mychannel "video" 5
   
   # Download file (by number from list)
   python teledrive_simple.py download @mychannel 1
   
   # Upload file
   python teledrive_simple.py upload @mychannel ./file.pdf "My document"
   ```

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `list <channel> [limit]` | List files from channel | `list @mychannel 20` |
| `search <channel> <query> [limit]` | Search files by name | `search @mychannel "pdf" 10` |
| `download <channel> <file_number>` | Download file by number | `download @mychannel 1` |
| `upload <channel> <file_path> [caption]` | Upload file to channel | `upload @mychannel ./file.pdf "Doc"` |

## Configuration

Create `.env` file with:

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
teledrive_simple.py    # Main application (single file)
requirements_simple.txt # Dependencies
.env                   # Configuration
README_simple.md       # This file
downloads/             # Downloaded files (auto-created)
```

## Advantages of Simple Version

- ✅ Single file - easy to understand and modify
- ✅ Minimal dependencies - only Telethon and python-dotenv
- ✅ Command-line interface - scriptable and automatable
- ✅ No complex UI - fast and lightweight
- ✅ Easy deployment - just copy one Python file
- ✅ Simple maintenance - all code in one place

## Migration from Full Version

If you have the full TeleDrive version, you can:

1. Copy your `.env` file
2. Copy your session file (`teledrive_session.session`)
3. Use the simple version immediately

The simple version is fully compatible with sessions from the full version.
