# TeleDrive - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Setup
```bash
# Run the setup script
setup.bat

# This will:
# - Create virtual environment
# - Install dependencies
# - Create .env file
# - Create necessary directories
```

### 2. Configure
Edit the `.env` file with your Telegram API credentials:

```env
API_ID=21272067
API_HASH=b7690dc86952dbc9b16717b101164af3
PHONE_NUMBER=+1234567890
```

**Get your API credentials:**
1. Go to https://my.telegram.org/apps
2. Create a new application
3. Copy API_ID and API_HASH

### 3. Run

Choose your preferred interface:

#### 🖥️ Desktop App (Recommended)
```bash
run.bat
# or: python desktop.py
```

#### 💻 Command Line
```bash
python cli.py list @mychannel 10
```

## 📋 Common Tasks

### Connect to Telegram
1. Open the desktop app
2. Click "Connect" button
3. Enter phone verification code when prompted

### Browse Channel Files
1. Make sure you're connected
2. Go to "Files" tab
3. Enter channel username (e.g., @mychannel)
4. Click "Load Files"

### Download Files
1. Browse to the files you want
2. Click the "Download" button
3. Choose where to save the file

### Upload Files
1. Go to "Upload" tab
2. Enter target channel
3. Click "Select Files"
4. Add optional caption
5. Click "Upload Files"

### Search Files
1. In the Files tab
2. Use the search box to filter files

## ⚙️ Settings

Configure your API credentials in the Settings tab:
- API ID
- API Hash  
- Phone Number
- Theme (Light/Dark)

## 🔧 Troubleshooting

### "Connection failed"
- Check your API credentials in Settings
- Make sure your phone number is correct
- Disable 2FA temporarily if needed

### "No files found"
- Make sure the channel username is correct
- Check if you have access to the channel
- Try with @ prefix (e.g., @mychannel)

### "Import error"
- Run `pip install -r requirements.txt`
- Make sure you're in the correct directory

## 📁 File Structure

```
desktop.py          # Desktop application
cli.py              # CLI application
core.py             # Core functionality
requirements.txt    # Dependencies
.env                # Configuration
README.md           # Documentation
setup.bat           # Setup script
run.bat             # Run desktop app
downloads/          # Downloaded files
```

## 💡 Tips

1. **Use Desktop App** for daily file management
2. **Use CLI** for automation and scripting
3. **Use search** to quickly find specific files
4. **Check Settings** if connection fails

## 🆘 Need Help?

1. Check the main README.md for detailed documentation
2. Make sure all dependencies are installed
3. Check your .env configuration

---

**Happy file managing! 🎉**
