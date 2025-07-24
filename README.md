# 🚀 TeleDrive - Modern Telegram File Manager

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

> **Professional file management for your Telegram files with Google Drive-style interface**

TeleDrive is a modern web application for managing and organizing files from Telegram. With both Google Drive and Windows Explorer-like interfaces, TeleDrive helps you easily search, preview, and download files from your Telegram conversations.

<div align="center">
  <img src="https://img.shields.io/badge/Telegram-Storage-blue" alt="Telegram Storage">
  <img src="https://img.shields.io/badge/UI-Google_Drive-red" alt="Google Drive UI">
  <img src="https://img.shields.io/badge/Platform-Web-green" alt="Web Platform">
</div>

## ✨ Features

- 🗂️ **Google Drive-style Interface** - Modern and familiar file management experience
- 🔍 **Advanced Search** - Find files quickly with powerful search capabilities
- 👁️ **File Preview** - Preview documents, images, and media files
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🔐 **Secure Authentication** - OTP-based login system
- 👑 **Admin Panel** - Comprehensive user and system management
- 🚀 **High Performance** - Optimized for handling large file collections
- 🐳 **Docker Support** - Easy deployment with Docker and Docker Compose
- 🔄 **Auto Commit** - Tự động commit các thay đổi trong dự án

## 📋 Requirements

- Python 3.8 or higher
- Telegram API credentials (from [my.telegram.org](https://my.telegram.org/apps))
- Modern web browser
- Git (for auto commit feature)

## 🚀 Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/quangminh1212/TeleDrive.git
   cd TeleDrive
   ```

2. **Install dependencies**
   ```bash
   # Using pip
   pip install -r requirements.txt

   # Or using make
   make install
   ```

3. **Configure environment**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env with your Telegram API credentials
   nano .env
   ```

4. **Start the application**
   ```bash
   # Run the application
   run.bat
   ```

5. **Access the application**
   
   Open your browser and go to [http://localhost:3000](http://localhost:3000)

## 🛠️ Configuration

Edit `config/config.json` to customize your setup:

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

## 🔄 Auto Commit Feature

TeleDrive includes an automatic Git commit feature that helps you track changes to your project. This feature is integrated into the main `run.bat` file and can be accessed through the menu options.

To use the auto commit feature:
1. Launch the application using `run.bat`
2. Select option 2 to run TeleDrive with auto commit enabled
3. Changes to your project will be automatically committed every minute if changes are detected
4. Use option 3 to stop the auto commit process if needed
5. Use option 4 to set up your Git user information

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
  -p 3000:3000 \
  -v $(pwd)/instance:/app/instance \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  teledrive:latest
```

## 🌐 Web Interface

**First Time Setup:**
1. Access: http://localhost:3000/setup
2. Create an admin account
3. Log in and start using

**Features:**
- 🔐 Authentication & User Management
- 📁 File Manager with Search & Filter
- 📊 Statistics & Download links
- 📱 Responsive design with Google Drive UI

## 📁 Project Structure

```
TeleDrive/
├── 📁 src/teledrive/          # Main application package
│   ├── 📁 auth/               # Authentication system
│   ├── 📁 config/             # Configuration management
│   ├── 📁 core/               # Core business logic
│   ├── 📁 models/             # Data models
│   ├── 📁 services/           # Business services
│   └── 📄 app.py              # Flask application
├── 📁 config/                 # Configuration files
├── 📁 static/                 # Static assets (CSS, JS)
│   ├── 📁 css/                # CSS files
│   └── 📁 js/                 # JavaScript files
├── 📁 templates/              # HTML templates
├── 📄 main.py                 # Entry point
├── 📄 AutoCommit.ps1          # Auto commit script
└── 📄 requirements.txt        # Dependencies
```

## 📚 Documentation

- [**API Documentation**](docs/API.md) - REST API reference
- [**Security**](docs/SECURITY.md) - Security information

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`python -m unittest`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- 🐛 Issues: [GitHub Issues](https://github.com/quangminh1212/TeleDrive/issues)

---

<div align="center">
  <strong>Made with ❤️ by the TeleDrive Team</strong>
</div>

