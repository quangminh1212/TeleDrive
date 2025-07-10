# TeleDrive - Telegram Channel File Manager

A desktop application for managing files in Telegram channels with download and upload capabilities.

## Features

- **Desktop Interface**: Clean, Telegram-inspired design with milk white theme
- **Telegram Authentication**: Secure login with phone number and verification code
- **Channel Management**: Browse and select from your Telegram channels
- **File Operations**: 
  - List all files in selected channels
  - Download files to local storage
  - Upload files to channels
- **Progress Tracking**: Visual progress indicators for file operations
- **Session Persistence**: Stay logged in between app sessions

## Requirements

- Python 3.7+
- Telegram API credentials (API_ID and API_HASH)

## Installation

### Option 1: Quick Start (Recommended)
1. Double-click `install.bat` to automatically install dependencies
2. Double-click `run.bat` to start the application

### Option 2: Manual Installation
1. Clone or download this repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Easy Start
- Double-click `run.bat` - Full featured launcher with error checking
- Double-click `start.bat` - Simple launcher

### Manual Start
```bash
python main.py
```

2. **First Time Setup**:
   - Enter your phone number (with country code, e.g., +1234567890)
   - Enter the verification code sent to your phone
   - If you have two-factor authentication enabled, enter your cloud password

3. **Using the Application**:
   - Select a channel from the left panel
   - Browse files in the selected channel on the right panel
   - Click "Download Selected" to download files
   - Click "Upload File" to upload new files to the channel

## Configuration

The application uses the following Telegram API credentials (already configured):
- API_ID: 21272067
- API_HASH: b7690dc86952dbc9b16717b101164af3

## File Structure

```
TeleDrive/
├── main.py              # Main application file
├── requirements.txt     # Python dependencies
├── teledrive.png       # Application logo
├── run.bat             # Full featured launcher (recommended)
├── start.bat           # Simple launcher
├── install.bat         # Dependency installer
└── README.md           # This file
```

## Security

- Session data is stored locally in `teledrive_session.session`
- No passwords or sensitive data are stored in plain text
- Uses official Telegram API for secure communication

## Troubleshooting

- **Login Issues**: Make sure your phone number includes the country code
- **Channel Not Loading**: Ensure you have access to the channel and it's not private
- **File Download Fails**: Check your internet connection and available disk space
- **Upload Fails**: Verify you have permission to send files to the selected channel

## License

This project is for educational and personal use only.
