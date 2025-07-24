# TeleDrive

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Code Style](https://img.shields.io/badge/code%20style-black-black)](https://github.com/psf/black)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](https://github.com/quangminh1212/TeleDrive)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)
[![CI/CD](https://img.shields.io/badge/CI/CD-configured-success.svg)](.github/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/quangminh1212/TeleDrive/pulls)

> Modern file management for Telegram with Google Drive-style interface

TeleDrive is a web application that lets you manage your Telegram files through an elegant Google Drive-style interface. It provides powerful search, preview, and download capabilities with a focus on user experience and performance.

## ✨ Features

- 🌐 **Modern Web Interface** - Clean, responsive Google Drive-style design
- 🔍 **Advanced Search** - Find files quickly with powerful search capabilities
- 👁️ **File Preview** - Preview documents, images, and media files
- 📱 **Mobile Ready** - Works seamlessly across all devices
- 🔐 **Secure** - OTP-based authentication system
- 🚀 **Fast & Efficient** - Optimized for large file collections

## 🚀 Quick Start

### Prerequisites

- Python 3.8+ 
- Telegram API credentials (get from [my.telegram.org](https://my.telegram.org/apps))
- Git (optional, for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/quangminh1212/TeleDrive.git
cd TeleDrive

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env-example .env
# Edit .env to add your Telegram API credentials

# Run the application
python main.py
# or use the launcher on Windows
run.bat
```

Visit `http://localhost:3000` in your browser.

## 📖 User Guide

### Getting Started

1. **First-time Setup:**
   - Access the setup page at `http://localhost:3000/setup` 
   - Create an admin account with your phone number
   - Log in using OTP verification

2. **Scanning Files:**
   - Click "Scan" on the dashboard
   - Select Telegram channels or chats to scan
   - Wait for the scan to complete

3. **Managing Files:**
   - Browse your files in grid or list view
   - Use the search box to find specific files
   - Preview files directly in the browser
   - Download files with a single click

### Using the Application

```bash
# Standard mode
python main.py

# Development mode with hot reload
python main.py --dev

# Background mode (Windows)
run.bat detached
```

### Configuration

Edit your `.env` file to customize the application:

```
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
SECRET_KEY=your_secret_key
FLASK_ENV=development  # or production
```

For advanced configuration, edit `config/config.json`.

## 🛠️ Development

### Project Structure

```
TeleDrive/
├── src/                      # Source code
│   └── teledrive/            # Main package
│       ├── auth/             # Authentication
│       ├── core/             # Core functionality
│       │   ├── monitoring/   # Application monitoring
│       │   └── performance/  # Performance optimization
│       ├── models/           # Data models
│       ├── security/         # Security features
│       ├── services/         # Business logic services
│       ├── tests/            # Test suite
│       │   ├── unit/         # Unit tests
│       │   └── integration/  # Integration tests
│       └── utils/            # Utilities
├── static/                   # Static assets
├── templates/                # HTML templates
├── config/                   # Configuration
├── docs/                     # Documentation
├── main.py                   # Application entry point
├── pyproject.toml            # Project metadata
└── requirements.txt          # Dependencies
```

### Testing

```bash
# Run all tests
pytest

# Run unit tests only
pytest src/teledrive/tests/unit

# Generate coverage report
pytest --cov=src
```

### Docker Deployment

```bash
# Build the image
docker build -t teledrive .

# Run the container
docker run -p 3000:3000 --env-file .env teledrive

# Using Docker Compose (recommended for production)
docker compose up -d
```

## 📝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pytest`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Flask](https://flask.palletsprojects.com/) - The web framework used
- [SQLAlchemy](https://www.sqlalchemy.org/) - ORM for database interactions
- [Telethon](https://docs.telethon.dev/) - Telegram client library

