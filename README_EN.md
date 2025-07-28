# TeleDrive

[![PyPI version](https://img.shields.io/badge/pypi-0.1.0-blue.svg)](https://pypi.org/project/teledrive/)
[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Google Drive-like interface for managing Telegram files.

## Features

- **Telegram Integration**: Scan and manage files from public and private channels
- **Database Management**: SQLAlchemy ORM with backup, restore, and migration support
- **Advanced File Operations**: Folders, tags, rename, move, and bulk actions
- **File Preview**: Support for 10+ file types including images, videos, audio, PDF, text, JSON, CSV, Excel
- **Advanced Search**: Real-time search with auto-suggestions and filtering
- **Google Drive-like UI**: Responsive design with mobile support
- **WebSocket Support**: Real-time progress updates and connection status
- **Detailed Logging**: Categorized logs for operations, API calls, and errors
- **Dynamic Configuration**: Synchronization between .env and config.json

## Installation

### Using pip

```bash
pip install teledrive
```

### From source

```bash
git clone https://github.com/username/teledrive.git
cd teledrive
pip install -e .
```

### Dependencies

- Python 3.8+
- Telegram API credentials
- Modern web browser

## Quick Start

### Web Interface (Recommended)

1. **Start web server**:
   ```bash
   teledrive web start
   ```

2. **Open browser**: Go to http://localhost:3000

3. **Configure**: Visit Settings page to set up Telegram API

4. **Start scanning**: Use the web interface to scan channels

### Command Line Interface

```bash
# Configure Telegram API
teledrive config setup

# Scan channels
teledrive scan @channel_name

# List files
teledrive files list
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_PHONE=+1234567890
```

### Configuration File

TeleDrive uses a `config.json` file for detailed settings:

```json
{
  "telegram": {
    "api_id": "",
    "api_hash": "",
    "phone_number": ""
  },
  "output": {
    "directory": "output",
    "create_subdirs": true
  }
}
```

## Project Structure

```
teledrive/
├── teledrive/          # Main package
│   ├── core/           # Core functionality
│   ├── web/            # Web interface
│   ├── api/            # API endpoints
│   └── utils/          # Utility functions
├── tests/              # Test suite
├── docs/               # Documentation
├── pyproject.toml      # Project configuration
├── setup.py            # Setup script
└── README.md           # This file
```

## Development

### Setup Development Environment

```bash
pip install -e ".[dev]"
```

### Run Tests

```bash
pytest
```

### Code Style

We use Black and isort for code formatting:

```bash
black teledrive tests
isort teledrive tests
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Telethon](https://github.com/LonamiWebs/Telethon) for the Telegram client
- [Flask](https://flask.palletsprojects.com/) for the web framework