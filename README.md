# TeleDrive

TeleDrive is an application that uses Telegram as a cloud storage service, allowing you to store and manage files similar to Google Drive or OneDrive.

## Features

- Upload files to Telegram and use it as cloud storage
- Download files from your Telegram storage
- Organize files with folders and tags
- Search through your stored files
- Secure authentication via Telegram
- Web and desktop interfaces

## Setup

### Prerequisites

- Node.js (v14 or newer)
- Telegram API credentials (API ID and API Hash)

### Installation

1. Clone this repository
```bash
git clone https://github.com/yourusername/TeleDrive.git
cd TeleDrive
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
```

4. Start the application
```bash
npm start
```

## How It Works

TeleDrive uses Telegram's cloud storage capabilities to store your files. Files are uploaded to Telegram and indexed in a local database for quick access and searching. The application provides a user-friendly interface to manage your files while leveraging Telegram's robust infrastructure for actual storage.

## License

MIT