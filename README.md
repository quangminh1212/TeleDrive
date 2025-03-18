# TeleDrive

A file storage application that uses Telegram as a storage backend. This application allows you to store and manage files using your Telegram account, taking advantage of Telegram's generous storage capabilities.

## Features

- Telegram-based file storage
- Secure authentication via Telegram bots
- File upload, download, and management
- File previews and sharing
- Trash bin for deleted files
- Automatic synchronization with Telegram

## Architecture

TeleDrive follows a modular architecture to improve maintainability and testability:

- **Auth Module**: Handles authentication with Telegram
- **Files Module**: Manages file operations (upload, download, listing)
- **Storage Module**: Handles Telegram as a storage backend
- **DB Module**: Provides database services for local metadata
- **Common Module**: Contains shared utilities and configurations

## Prerequisites

- Node.js 16+
- A Telegram bot (create one via @BotFather)
- A Telegram account

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/teledrive.git
   cd teledrive
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Copy the example environment file and configure it:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your Telegram Bot Token and Chat ID:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id
   TELEGRAM_BOT_USERNAME=your_bot_username_without_@
   ```

## Usage

### Starting the Server

```
npm start
```

### Development Mode

```
npm run dev
```

### Running Tests

```
npm test           # Run all tests
npm run test:unit  # Run unit tests
npm run test:integration  # Run integration tests
```

### Synchronizing Files

```
npm run sync
```

### Cleaning Up Temporary Files

```
npm run cleanup
```

## Configuration

TeleDrive can be configured using environment variables in the `.env` file:

- `PORT`: Web server port (default: 3000)
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `TELEGRAM_CHAT_ID`: ID of the chat where files will be stored
- `TELEGRAM_BOT_USERNAME`: Username of your bot without the @ symbol
- `SESSION_SECRET`: Secret for session encryption
- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 20MB)
- `AUTO_SYNC`: Enable automatic synchronization (default: true)
- `SYNC_INTERVAL`: Synchronization interval in minutes (default: 60)

## Project Structure

```
├── data/            # Database and data storage
├── downloads/       # Downloaded files
├── logs/            # Application logs
├── public/          # Static files
├── src/             # Source code
│   ├── modules/     # Modular components
│   │   ├── auth/    # Authentication module
│   │   ├── common/  # Shared functionality
│   │   ├── db/      # Database module
│   │   ├── files/   # File management module
│   │   └── storage/ # Storage (Telegram) module
│   ├── tests/       # Test files
│   ├── app.js       # Express application
│   └── server.js    # Server initialization
├── temp/            # Temporary files
├── uploads/         # Uploaded files
└── views/           # EJS templates
```

## Testing

The project uses Jest for testing. Tests are divided into:

- **Unit tests**: Testing individual functions and components
- **Integration tests**: Testing interactions between modules

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 