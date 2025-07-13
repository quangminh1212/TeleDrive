# TeleDrive Web UI

A modern, Telegram-like web interface for the TeleDrive project that allows you to scan Telegram channels and download files through an intuitive user interface.

## Features

### 🎨 Modern Design
- Clean, Telegram-inspired interface
- Responsive design that works on desktop and mobile
- Dark sidebar with light content area
- Smooth animations and transitions

### 📱 User Interface Components
- **Header**: Logo, connection status, user info, settings
- **Sidebar**: Channel list, search, statistics
- **Main Content**: File grid/list view with pagination
- **Input Panel**: Channel scanning controls and export options
- **Modals**: Add channel, progress tracking, notifications

### 🔍 Channel Management
- Add channels by username or invite link
- Support for both public and private channels
- Join private channels via invite links
- Search through added channels
- View channel statistics

### 📁 File Management
- Grid and list view modes
- File type filtering (photos, videos, documents, audio)
- File preview with icons
- Download files directly
- Copy download links
- Pagination for large file lists

### 📊 Export Options
- Export file lists to JSON format
- CSV export (coming soon)
- Excel export (coming soon)
- Customizable export data

### 🔄 Real-time Features
- Live scan progress tracking
- Connection status monitoring
- Real-time file count updates
- Notification system for user feedback

## File Structure

```
ui/
├── index.html          # Main HTML structure
├── css/
│   └── style.css       # Telegram-like styling
├── js/
│   └── app.js          # JavaScript functionality
├── assets/
│   └── logo.png        # Application logo
└── README.md           # This file
```

## Getting Started

### Prerequisites
- Python 3.7+
- Flask and Flask-CORS
- Existing TeleDrive project setup

### Quick Start

1. **Run the UI server:**
   ```bash
   # Windows
   run_ui.bat
   
   # Linux/Mac
   python ui_server.py
   ```

2. **Open your browser:**
   Navigate to `http://localhost:5000`

3. **Start using TeleDrive:**
   - Add channels using the + button or input panel
   - Scan channels for files
   - Browse and download files
   - Export file lists

### Manual Setup

1. **Install dependencies:**
   ```bash
   pip install flask flask-cors
   ```

2. **Copy logo to assets:**
   ```bash
   mkdir -p ui/assets
   cp logo.png ui/assets/
   ```

3. **Start the server:**
   ```bash
   python ui_server.py
   ```

## API Endpoints

The UI communicates with the backend through these API endpoints:

- `GET /api/status` - Get connection status
- `GET /api/channels` - Get list of channels
- `POST /api/channels` - Add a new channel
- `GET /api/channels/<id>/files` - Get files for a channel
- `POST /api/scan` - Start scanning a channel
- `POST /api/scan/cancel` - Cancel current scan
- `GET /api/files/<id>/download` - Download a file
- `POST /api/export/<format>` - Export files

## Configuration

The UI integrates with the existing `config.json` file and uses the same Telegram API credentials and settings as the command-line version.

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Mobile Support

The interface is fully responsive and works well on:
- Smartphones (iOS/Android)
- Tablets
- Desktop computers

## Keyboard Shortcuts

- `Enter` in channel input - Start scan
- `Escape` - Close modals
- `Ctrl+F` - Focus channel search

## Troubleshooting

### Common Issues

1. **Server won't start:**
   - Check Python installation
   - Install Flask: `pip install flask flask-cors`
   - Check port 5000 availability

2. **Can't connect to Telegram:**
   - Verify config.json settings
   - Check internet connection
   - Ensure Telegram API credentials are valid

3. **Files not loading:**
   - Check if channel was scanned
   - Verify channel permissions
   - Check browser console for errors

### Debug Mode

Run the server with debug output:
```bash
python ui_server.py --debug
```

## Contributing

To contribute to the UI:

1. Follow the existing code style
2. Test on multiple browsers
3. Ensure responsive design works
4. Update documentation

## License

This UI is part of the TeleDrive project and follows the same license terms.
