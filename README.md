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

## Cấu hình API Telegram

Để sử dụng tính năng đăng nhập bằng QR code, bạn cần cấu hình API Telegram hợp lệ:

1. Đăng ký ứng dụng Telegram tại https://my.telegram.org/auth
2. Vào mục "API development tools" và tạo ứng dụng mới
3. Lấy thông tin API ID và API Hash
4. Cập nhật file `.env` với thông tin API ID và API Hash thật:

```
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_USE_QR_CODE_AUTH=true
```

## Khởi động ứng dụng

```bash
npm install
npm run dev
```

## Đăng nhập bằng QR code

1. Khi ứng dụng chạy, mở trình duyệt và truy cập http://localhost:3000
2. Chọn đăng nhập bằng QR code
3. Sử dụng ứng dụng Telegram trên điện thoại để quét mã QR 
4. Sau khi xác nhận, bạn sẽ được đăng nhập vào ứng dụng

## Lưu ý quan trọng

- **TELEGRAM_API_ID** và **TELEGRAM_API_HASH** trong file `.env` cần được cập nhật với giá trị thật từ trang my.telegram.org
- Dùng tài khoản có số điện thoại đã xác minh để tạo API credentials
- Không chia sẻ API ID và API Hash của bạn với người khác

## Xử lý sự cố

Nếu gặp lỗi "Initialization parameters are needed: call setTdlibParameters first", hãy kiểm tra:
1. API ID và API Hash đã được cấu hình đúng chưa
2. Thư mục `data/tdlib` có quyền ghi không
3. Khởi động lại ứng dụng và thử lại

## Tính năng

- Lưu trữ file không giới hạn
- Bảo mật cao với xác thực Telegram
- Truy cập mọi lúc mọi nơi 