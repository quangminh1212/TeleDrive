# TeleDrive

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Code Style](https://img.shields.io/badge/code%20style-black-black)](https://github.com/psf/black)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](https://github.com/quangminh1212/TeleDrive)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)
[![CI/CD](https://img.shields.io/badge/CI/CD-configured-success.svg)](.github/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/quangminh1212/TeleDrive/pulls)

> Modern file management for Telegram with Google Drive-style interface

## Features

- 🌐 **Modern Web Interface** - Clean, responsive Google Drive-style design
- 🔍 **Advanced Search** - Find files quickly with powerful search capabilities
- 👁️ **File Preview** - Preview documents, images, and media files
- 📱 **Mobile Ready** - Works seamlessly across all devices
- 🔐 **Secure** - OTP-based authentication system
- 🚀 **Fast & Efficient** - Optimized for large file collections

## Installation

### Prerequisites

- Python 3.8+
- Git (optional, for development)

### Quick Install

```bash
# Clone the repository
git clone https://github.com/quangminh1212/TeleDrive.git
cd TeleDrive

# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
# or use the provided script on Windows
run.bat
```

Visit `http://localhost:3000` in your browser.

## Usage

### Running the Application

```bash
# Standard mode
python main.py

# Development mode with hot reload
python main.py --dev

# Background mode (Windows)
run.bat detached
```

### Configuration

Create a `.env` file in the project root (see `.env-example` for reference):

```
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
SECRET_KEY=your_secret_key
```

## Development

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
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript
│   └── images/               # Images
├── templates/                # HTML templates
├── config/                   # Configuration
├── docs/                     # Documentation
├── main.py                   # Application entry point
├── run.bat                   # Windows launcher script
├── pyproject.toml            # Project metadata
├── pytest.ini                # Test configuration
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

### Docker

```bash
# Build image
docker build -t teledrive .

# Run container
docker run -p 3000:3000 teledrive
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Flask](https://flask.palletsprojects.com/)
- [SQLAlchemy](https://www.sqlalchemy.org/)
- [Telethon](https://docs.telethon.dev/)

