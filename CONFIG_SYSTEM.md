# TeleDrive Configuration System

## Overview

TeleDrive now features a comprehensive centralized configuration system that eliminates the need for manual configuration during startup. All settings are managed through the `config.json` file with intelligent defaults and automatic directory creation.

## Configuration Structure

### 1. Flask Web Server Configuration (`flask` section)
```json
{
  "flask": {
    "secret_key": "teledrive_secret_key_2025",
    "host": "0.0.0.0",
    "port": 3000,
    "debug": false,
    "threaded": true,
    "use_reloader": false,
    "cors_allowed_origins": "*",
    "socketio_async_mode": "eventlet",
    "login_view": "login",
    "login_message": "Please log in to access this page.",
    "login_message_category": "info",
    "session_timeout": 3600,
    "permanent_session_lifetime": 86400
  }
}
```

### 2. File Upload Configuration (`upload` section)
```json
{
  "upload": {
    "max_file_size": 104857600,
    "max_content_length": 104857600,
    "upload_directory": "data/uploads",
    "allowed_extensions": ["txt", "pdf", "png", "jpg", "..."],
    "create_subdirs": true,
    "timestamp_filenames": true,
    "backup_existing": true
  }
}
```

### 3. Security Settings (`security` section)
```json
{
  "security": {
    "password_min_length": 6,
    "session_protection": "strong",
    "remember_cookie_duration": 2592000,
    "max_login_attempts": 5,
    "lockout_duration": 900,
    "csrf_protection": true,
    "secure_cookies": false,
    "httponly_cookies": true
  }
}
```

### 4. Directory Structure (`directories` section)
```json
{
  "directories": {
    "data": "data",
    "uploads": "data/uploads",
    "backups": "data/backups",
    "temp": "data/temp",
    "output": "output",
    "logs": "logs",
    "templates": "templates",
    "static": "static"
  }
}
```

### 5. Admin User Configuration (`admin` section)
```json
{
  "admin": {
    "username": "admin",
    "email": "admin@teledrive.local",
    "default_password": "admin123",
    "role": "admin",
    "auto_create": true
  }
}
```

## Key Features

### ✅ Zero Manual Configuration
- Application starts without requiring any manual input
- All necessary directories are created automatically
- Default admin user is created on first run
- Intelligent fallbacks for missing configuration values

### ✅ Centralized Management
- Single `config.json` file contains all settings
- No more scattered hardcoded values throughout the codebase
- Easy to modify settings without code changes
- Version-controlled configuration

### ✅ Flexible Configuration Loading
- Supports dot notation access (`flask.host`, `upload.max_file_size`)
- Graceful handling of missing configuration keys
- Default values for all settings
- Runtime configuration validation

### ✅ Backward Compatibility
- Existing `.env` file approach still works
- Telegram API credentials can be set via environment variables
- Smooth migration from hardcoded values

## Usage

### For Developers

```python
from flask_config import flask_config

# Get Flask configuration
flask_config_dict = flask_config.get_flask_config()
app.config.update(flask_config_dict)

# Get server configuration
server_config = flask_config.get_server_config()
socketio.run(app, **server_config)

# Get specific values
host = flask_config.get('flask.host', 'localhost')
port = flask_config.get('flask.port', 5000)
```

### For Users

1. **Default Setup**: Just run the application - it works out of the box
2. **Custom Configuration**: Edit `config.json` to customize settings
3. **API Credentials**: Set in `.env` file or directly in `config.json`

## Configuration Files

### Primary Configuration
- **`config.json`**: Main configuration file (comprehensive settings)
- **`flask_config.py`**: Configuration loader module

### Secondary Configuration  
- **`.env`**: Environment variables (API credentials)
- **`.env.example`**: Template for environment variables

## Configuration Validation

Use the built-in configuration manager to verify settings:

```bash
python -c "from config_manager import ConfigManager; cm = ConfigManager(); cm.validate_configuration()"
```

This will validate:
- Configuration loading
- Directory creation
- Value validation
- Integration with Flask app

## Migration Guide

### From Hardcoded Values
The system automatically migrates from hardcoded values. No action required.

### From Environment Variables Only
The system supports both approaches. You can:
1. Keep using `.env` file (recommended for API credentials)
2. Move settings to `config.json` for better organization
3. Use a hybrid approach (API credentials in `.env`, other settings in `config.json`)

## Benefits

1. **Easier Deployment**: No manual configuration steps
2. **Better Security**: Centralized security settings management
3. **Improved Maintainability**: Single source of truth for configuration
4. **Enhanced Flexibility**: Easy to customize without code changes
5. **Better Testing**: Configuration can be easily mocked and tested
6. **Documentation**: Self-documenting configuration with descriptions

## Default Access Information

- **Web Interface**: http://localhost:3000
- **Admin Username**: admin
- **Admin Password**: admin123
- **Database**: SQLite at `data/teledrive.db`
- **Upload Directory**: `data/uploads`
- **Output Directory**: `output`

## Security Notes

- Change default admin password after first login
- Use environment variables for sensitive API credentials
- Enable HTTPS in production by setting `secure_cookies: true`
- Adjust session timeout based on security requirements

---

*This configuration system ensures TeleDrive can run immediately after setup without any manual configuration, while still providing full customization capabilities for advanced users.*
