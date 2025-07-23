# 🚀 TeleDrive - Modern Telegram File Manager

[![CI/CD Pipeline](https://github.com/quangminh1212/TeleDrive/actions/workflows/ci.yml/badge.svg)](https://github.com/quangminh1212/TeleDrive/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/quangminh1212/TeleDrive/branch/main/graph/badge.svg)](https://codecov.io/gh/quangminh1212/TeleDrive)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

> **Professional file management for your Telegram files with Windows Explorer-style interface**

TeleDrive is a modern web application for managing and organizing files from Telegram. With a Windows Explorer-like interface, TeleDrive helps you easily search, preview, and download files from your Telegram conversations.

## ✨ Features

- 🗂️ **Windows Explorer-style Interface** - Familiar file management experience
- 🔍 **Advanced Search** - Find files quickly with powerful search capabilities
- 👁️ **File Preview** - Preview documents, images, and media files
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🔐 **Secure Authentication** - OTP-based login system
- 👑 **Admin Panel** - Comprehensive user and system management
- 🚀 **High Performance** - Optimized for handling large file collections
- 🐳 **Docker Support** - Easy deployment with Docker and Docker Compose

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Telegram API credentials (get from [my.telegram.org](https://my.telegram.org/apps))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/quangminh1212/TeleDrive.git
   cd TeleDrive
   ```

2. **Install dependencies**
   ```bash
   # Using pip
   pip install -e ".[dev]"

   # Or using make
   make install-dev
   ```

3. **Configure environment**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env with your Telegram API credentials
   nano .env
   ```

4. **Initialize database**
   ```bash
   # Using CLI
   teledrive init-db
   teledrive create-admin

   # Or using make
   make db-init
   ```

5. **Start the application**
   ```bash
   # Development server
   teledrive web

   # Or using make
   make run
   ```

6. **Access the application**
   Open your browser and go to [http://localhost:5000](http://localhost:5000)

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Clone and navigate to project
git clone https://github.com/quangminh1212/TeleDrive.git
cd TeleDrive

# Copy and configure environment
cp .env.example .env
# Edit .env with your configuration

# Start services
docker-compose -f config/docker.yml up -d

# View logs
docker-compose -f config/docker.yml logs -f
```

### Using Docker

```bash
# Build image
docker build -f config/Dockerfile -t teledrive:latest .

# Run container
docker run -d \
  --name teledrive \
  -p 5000:5000 \
  -v $(pwd)/instance:/app/instance \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  teledrive:latest
```

## 🛠️ Development

### Setting up development environment

```bash
# Install development dependencies
make install-dev

# Set up pre-commit hooks
pre-commit install

# Run tests
make test

# Run with coverage
make test-cov

# Format code
make format

# Run linting
make lint

# Type checking
make type-check
```

### Project Structure

```
TeleDrive/
├── 📁 src/teledrive/          # Main application package
│   ├── 📁 auth/               # Authentication system
│   ├── 📁 config/             # Configuration management
│   ├── 📁 core/               # Core business logic
│   ├── 📁 models/             # Data models
│   ├── 📁 services/           # Business services
│   ├── 📁 security/           # Security middleware
│   ├── 📁 monitoring/         # Health checks and monitoring
│   ├── 📁 utils/              # Utility functions
│   └── 📄 app.py              # Flask application
├── 📁 tests/                  # Test suite
├── 📁 docs/                   # Documentation
├── 📁 config/                 # Configuration files
├── 📁 scripts/                # Utility scripts
├── 📁 static/                 # Static assets
├── 📁 templates/              # HTML templates
├── 📄 pyproject.toml          # Project metadata and dependencies
├── 📄 Makefile                # Development commands
└── 📄 README.md               # This file
```

## 📚 Documentation

- [**User Guide**](docs/README.md) - Complete user documentation
- [**API Documentation**](docs/api.md) - REST API reference
- [**Authentication Guide**](docs/authentication.md) - Authentication system
- [**Local File Manager**](docs/local-file-manager.md) - File management features
- [**Troubleshooting**](docs/troubleshooting.md) - Common issues and solutions


## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment
   export ENVIRONMENT=production
   export DEBUG=false

   # Configure database (PostgreSQL recommended)
   export DATABASE_URL=postgresql://user:pass@localhost:5432/teledrive

   # Set secure secret key
   export SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
   ```

2. **Using Gunicorn**
   ```bash
   # Install production dependencies
   pip install -e ".[production]"

   # Run with Gunicorn
   gunicorn --config config/server.py src.teledrive.app:app
   ```

3. **Using Docker**
   ```bash
   # Build production image
   docker build -f config/Dockerfile -t teledrive:prod .

   # Run production container
   docker run -d \
     --name teledrive-prod \
     -p 80:5000 \
     --env-file .env.production \
     teledrive:prod
   ```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`make test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Telethon](https://github.com/LonamiWebs/Telethon) - Telegram client library
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [SQLAlchemy](https://www.sqlalchemy.org/) - Database ORM
- All contributors who have helped improve this project

## 📞 Support

- 📧 Email: contact@teledrive.dev
- 🐛 Issues: [GitHub Issues](https://github.com/quangminh1212/TeleDrive/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/quangminh1212/TeleDrive/discussions)

---

<div align="center">
  <strong>Made with ❤️ by the TeleDrive Team</strong>
</div>

### 📖 Hướng dẫn chi tiết:
Xem file [QUICK_START.md](QUICK_START.md) để biết hướng dẫn đầy đủ.

## ✨ Tính năng

- 🌐 **Web Interface** - Giao diện web hiện đại
- 🔐 **Authentication** - Đăng nhập bảo mật
- 📊 **Dashboard** - Xem và quản lý file
- 🔍 **Search & Filter** - Tìm kiếm và lọc file
- 📁 **Multi-format** - CSV, JSON, Excel
- 🇻🇳 **Tiếng Việt** - Giao diện tiếng Việt


## 📁 Cấu hình

Chỉnh sửa file `config.json`:
```json
{
  "telegram": {
    "api_id": "your_api_id",
    "api_hash": "your_api_hash",
    "phone_number": "+84xxxxxxxxx"
  },
  "channels": {
    "use_default_channel": true,
    "default_channel": "@your_channel_here"
  },
  "scanning": {
    "max_messages": 1000,
    "batch_size": 50,
    "file_types": {
      "documents": true,
      "photos": true,
      "videos": true,
      "audio": true
    }
  },
  "output": {
    "formats": {
      "csv": {"enabled": true},
      "json": {"enabled": true},
      "excel": {"enabled": true}
    }
  }
}
```

## 📊 Kết quả

File lưu trong `output/`: CSV, JSON, Excel

## 🌐 Web Interface

**Lần đầu sử dụng:**
1. Truy cập: http://localhost:5000/setup
2. Tạo tài khoản admin
3. Đăng nhập và sử dụng

**Tính năng:**
- 🔐 Authentication & User Management
- 📁 File Manager với Search & Filter
- 📊 Statistics & Download links
- 📱 Responsive design

## 🛠️ Yêu cầu

- Python 3.7+
- Telegram API credentials
- Windows (batch files)

