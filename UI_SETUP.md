# TeleDrive Web UI Setup Guide

This guide will help you set up and run the modern Telegram-like web interface for TeleDrive.

## 🎯 Overview

The TeleDrive Web UI provides a modern, user-friendly interface for scanning Telegram channels and managing files. It features:

- **Telegram-inspired design** with clean, modern aesthetics
- **Responsive layout** that works on desktop and mobile
- **Real-time scanning** with progress tracking
- **File management** with grid/list views and export options
- **Channel management** with search and statistics

## 📋 Prerequisites

Before setting up the UI, ensure you have:

1. **Python 3.7+** installed
2. **TeleDrive project** already configured with valid Telegram API credentials
3. **Internet connection** for downloading dependencies

## 🚀 Quick Start

### Option 1: Using the Batch File (Windows)

1. **Run the launcher:**
   ```cmd
   run_ui.bat
   ```

2. **Open your browser:**
   Navigate to `http://localhost:5000`

The batch file will automatically:
- Create a virtual environment
- Install required dependencies
- Copy the logo to the UI assets
- Start the web server

### Option 2: Manual Setup

1. **Install dependencies:**
   ```bash
   pip install flask flask-cors
   ```

2. **Copy logo to UI assets:**
   ```bash
   mkdir -p ui/assets
   cp logo.png ui/assets/logo.png
   ```

3. **Start the UI server:**
   ```bash
   python ui_server.py
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5000`

## 📁 File Structure

After setup, your project structure will include:

```
TeleDrive/
├── ui/                          # Web UI files
│   ├── index.html              # Main HTML structure
│   ├── css/
│   │   └── style.css           # Telegram-like styling
│   ├── js/
│   │   └── app.js              # JavaScript functionality
│   ├── assets/
│   │   └── logo.png            # Application logo
│   └── README.md               # UI documentation
├── ui_server.py                # Flask web server
├── run_ui.bat                  # Windows launcher
├── main.py                     # Original CLI application
├── engine.py                   # Telegram scanning engine
├── config.json                 # Configuration file
└── requirements.txt            # Python dependencies
```

## 🎨 UI Features

### Header Section
- **Logo and Title**: TeleDrive branding with your logo.png
- **Connection Status**: Real-time Telegram connection indicator
- **User Info**: Shows logged-in phone number
- **Settings Button**: Access to configuration options

### Sidebar
- **Channel Search**: Find channels quickly
- **Channel List**: All added channels with file counts
- **Add Channel Button**: Quick access to add new channels
- **Statistics**: Total files and channels count

### Main Content Area
- **Welcome Screen**: Guides new users to add channels
- **File Display**: Grid or list view of channel files
- **View Toggle**: Switch between grid and list layouts
- **Filter Options**: Filter files by type and other criteria
- **Pagination**: Navigate through large file lists

### Input Panel
- **Channel Input**: Add channels by username or invite link
- **File Type Filters**: Select which file types to scan
- **Export Buttons**: Export file lists in various formats
- **Scan Button**: Start scanning with progress tracking

## 🔧 Configuration

The UI uses your existing `config.json` file. Key settings:

```json
{
  "telegram": {
    "api_id": "your_api_id",
    "api_hash": "your_api_hash",
    "phone_number": "+your_phone_number"
  },
  "scanning": {
    "max_messages": null,
    "file_types": {
      "documents": true,
      "photos": true,
      "videos": true,
      "audio": true
    }
  }
}
```

## 🌐 Using the Web Interface

### 1. First Time Setup

1. **Start the server** using `run_ui.bat` or `python ui_server.py`
2. **Open browser** and go to `http://localhost:5000`
3. **Check connection status** in the header (should show "Connected")

### 2. Adding Channels

**Method 1: Using the Add Channel Button**
1. Click the **+** button in the sidebar
2. Choose channel type:
   - **Already a member**: For channels you've joined
   - **Join via invite link**: For private channels
3. Enter channel username (e.g., `@channelname`) or invite link
4. Set maximum messages to scan
5. Click **Add Channel**

**Method 2: Using the Input Panel**
1. Enter channel username or link in the bottom input field
2. Select file types to include
3. Click **Scan** to add and scan immediately

### 3. Scanning Channels

1. **Select a channel** from the sidebar or add a new one
2. **Configure file types** using the checkboxes
3. **Click Scan** to start the scanning process
4. **Monitor progress** in the progress modal
5. **View results** in the main content area

### 4. Managing Files

**Viewing Files:**
- Switch between **grid** and **list** views using the toggle buttons
- Use **pagination** to navigate through large file collections
- **Search channels** using the sidebar search box

**File Actions:**
- **Download**: Click the download button to save files locally
- **Copy Link**: Copy the Telegram download link to clipboard
- **Preview**: View file information and metadata

**Exporting:**
- **JSON**: Export complete file data with metadata
- **CSV**: Export basic file information (coming soon)
- **Excel**: Export formatted spreadsheet (coming soon)

## 🔍 Troubleshooting

### Common Issues

**1. Server Won't Start**
```
Error: Address already in use
```
- **Solution**: Another application is using port 5000
- **Fix**: Stop other applications or change port in `ui_server.py`

**2. Connection Status Shows "Disconnected"**
```
Status: Disconnected
```
- **Solution**: Check Telegram API configuration
- **Fix**: Verify `config.json` has correct API credentials

**3. Can't Add Channels**
```
Error: Channel not found
```
- **Solution**: Check channel username/link format
- **Fix**: Use correct format: `@channelname` or full invite link

**4. Files Not Loading**
```
No files found
```
- **Solution**: Channel may not have been scanned
- **Fix**: Click "Scan Channel" to refresh file list

### Debug Mode

For detailed error information:

```bash
python ui_server.py --debug
```

### Browser Console

Check browser console (F12) for JavaScript errors and network issues.

## 🔒 Security Notes

- The UI server runs on `localhost:5000` by default
- Only accessible from your local machine
- Uses existing Telegram session from CLI application
- No additional authentication required

## 📱 Mobile Support

The interface is fully responsive and works on:
- **Smartphones**: iOS Safari, Android Chrome
- **Tablets**: iPad, Android tablets
- **Desktop**: All modern browsers

## 🎯 Performance Tips

1. **Limit message scanning**: Set reasonable `max_messages` values
2. **Filter file types**: Only scan needed file types
3. **Use pagination**: Don't load too many files at once
4. **Regular cleanup**: Remove unused channels periodically

## 🔄 Updates and Maintenance

To update the UI:

1. **Backup your data**: Save `output/` folder and `config.json`
2. **Update files**: Replace UI files with new versions
3. **Restart server**: Stop and restart `ui_server.py`
4. **Clear browser cache**: Refresh with Ctrl+F5

## 📞 Support

If you encounter issues:

1. **Check logs**: Look at console output and browser console
2. **Verify config**: Ensure `config.json` is properly configured
3. **Test CLI**: Verify the original CLI application works
4. **Check network**: Ensure internet connection is stable

## 🎉 Enjoy TeleDrive!

You now have a modern, user-friendly web interface for managing your Telegram file scanning. The interface provides all the functionality of the command-line version with an intuitive, Telegram-like design that makes it easy to scan channels, manage files, and export data.

Happy scanning! 🚀
