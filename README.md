# TeleDrive - Telegram File Manager

TeleDrive is a web application that allows you to manage files sent to your Telegram bot. It provides a user-friendly interface to view, download, and delete files that have been sent to your bot.

## Features

- Receive and store files sent to your Telegram bot (documents, photos, videos, audio)
- View all files in a clean web interface
- Download files directly from the web interface
- View detailed information about each file
- Delete files when no longer needed

## Prerequisites

- Node.js (v14+)
- A Telegram bot (created via [@BotFather](https://t.me/botfather))

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/your-username/teledrive.git
   cd teledrive
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   cp .env.example .env
   ```

4. Edit the `.env` file and add your:
   - Telegram Bot Token (from BotFather)
   - Port (optional, defaults to 3000)

## Usage

1. Start the application:
   ```
   npm start
   ```

2. For development with auto-restart:
   ```
   npm run dev
   ```

3. Access the web interface at `http://localhost:3000` (or your configured port)

4. Send files to your Telegram bot, and they will appear in the web interface

## Setting Up Your Bot

1. Create a bot through Telegram's [@BotFather](https://t.me/botfather)
2. Get your bot token and add it to the `.env` file
3. Start a conversation with your bot in Telegram
4. Start sending files to your bot (documents, photos, videos, audio)

## File Storage

Files are stored locally in the `uploads` directory and file metadata is stored in a JSON file in the `data` directory. For production use, you might want to consider using cloud storage solutions.

## License

MIT 