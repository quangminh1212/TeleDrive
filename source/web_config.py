#!/usr/bin/env python3
"""
Flask Configuration Loader for TeleDrive
Loads configuration from config.json for Flask application settings
"""

import os
import json
import socket
from pathlib import Path
from typing import Dict, Any, Optional

class FlaskConfigLoader:
    """Load Flask configuration from config.json"""

    def __init__(self, config_file: str = 'config.json'):
        self.config_file = Path(config_file)
        self._config = None
        # Get project root directory (parent of source directory)
        self.project_root = Path(__file__).parent.parent
        self.load_config()
    
    def load_config(self) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    self._config = json.load(f)
            else:
                print(f"⚠️ Config file {self.config_file} not found, using defaults")
                self._config = self._get_default_config()
                self.save_config()
        except Exception as e:
            print(f"❌ Error loading config: {e}")
            self._config = self._get_default_config()
        
        return self._config
    
    def save_config(self) -> None:
        """Save current configuration to file"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"❌ Error saving config: {e}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value using dot notation (e.g., 'flask.host')"""
        if not self._config:
            return default
        
        keys = key.split('.')
        value = self._config
        
        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default
    
    def get_flask_config(self) -> Dict[str, Any]:
        """Get Flask-specific configuration"""
        flask_config = {}

        # Basic Flask settings - Use environment variable or generate secure key
        import os
        import secrets
        default_secret = os.environ.get('FLASK_SECRET_KEY') or secrets.token_hex(32)
        flask_config['SECRET_KEY'] = self.get('flask.secret_key', default_secret)
        flask_config['DEBUG'] = self.get('flask.debug', False)

        # Database settings - Use absolute path
        default_db_path = self.project_root / 'data' / 'teledrive.db'
        db_url = self.get('database.url', f'sqlite:///{default_db_path.absolute()}')

        # If the URL is relative, make it absolute
        if db_url.startswith('sqlite:///data/'):
            relative_path = db_url.replace('sqlite:///', '')
            absolute_path = self.project_root / relative_path
            db_url = f'sqlite:///{absolute_path.absolute()}'

        flask_config['SQLALCHEMY_DATABASE_URI'] = db_url
        flask_config['SQLALCHEMY_TRACK_MODIFICATIONS'] = self.get('database.track_modifications', False)
        
        # Upload settings
        flask_config['MAX_CONTENT_LENGTH'] = self.get('upload.max_content_length', 104857600)  # 100MB
        flask_config['UPLOAD_FOLDER'] = self.get('upload.upload_directory', 'data/uploads')
        
        # Session settings
        flask_config['PERMANENT_SESSION_LIFETIME'] = self.get('flask.permanent_session_lifetime', 86400)  # 24 hours

        # Security settings
        flask_config['SESSION_PROTECTION'] = self.get('security.session_protection', 'strong')
        flask_config['REMEMBER_COOKIE_DURATION'] = self.get('security.remember_cookie_duration', 2592000)  # 30 days

        # Enhanced session security
        flask_config['SESSION_COOKIE_SECURE'] = self.get('security.session_cookie_secure', False)  # Set to True in production with HTTPS
        flask_config['SESSION_COOKIE_HTTPONLY'] = self.get('security.session_cookie_httponly', True)
        flask_config['SESSION_COOKIE_SAMESITE'] = self.get('security.session_cookie_samesite', 'Lax')
        flask_config['WTF_CSRF_TIME_LIMIT'] = self.get('security.csrf_time_limit', 86400)  # 24 hours CSRF token lifetime
        
        return flask_config
    
    def _is_port_available(self, host: str, port: int) -> bool:
        """Check if a port is available on the given host"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex((host, port))
                return result != 0
        except Exception:
            return False

    def _find_available_port(self, host: str, start_port: int, max_attempts: int = 10) -> int:
        """Find an available port starting from start_port"""
        for port in range(start_port, start_port + max_attempts):
            if self._is_port_available(host, port):
                return port

        # If no port found in range, try some common alternative ports
        alternative_ports = [5000, 8000, 8080, 8888, 9000]
        for port in alternative_ports:
            if port != start_port and self._is_port_available(host, port):
                return port

        # Last resort: return original port and let the system handle the error
        return start_port

    def get_server_config(self) -> Dict[str, Any]:
        """Get server configuration for running the Flask app"""
        host = self.get('flask.host', '127.0.0.1')
        port = 3000  # FIXED: Always use port 3000 only

        # Check if port is available
        if not self._is_port_available(host, port):
            print(f"⚠️ Port {port} is in use, attempting to kill existing process...")
            # Try to find and kill the process using port 3000
            import subprocess
            try:
                # Find PID using port 3000
                result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
                for line in result.stdout.split('\n'):
                    if f':{port}' in line and 'LISTENING' in line:
                        parts = line.split()
                        if len(parts) >= 5:
                            pid = parts[-1]
                            print(f"🔍 Found process {pid} using port {port}")
                            # Kill the process
                            subprocess.run(['taskkill', '/f', '/pid', pid], capture_output=True)
                            print(f"✅ Killed process {pid}")
                            break
            except Exception as e:
                print(f"⚠️ Could not kill existing process: {e}")

        # Check again after attempting to kill
        if not self._is_port_available(host, port):
            print(f"❌ Port {port} is still in use after cleanup attempt")
            print(f"🔧 Please manually stop any process using port {port}")
            print(f"💡 You can use: netstat -ano | findstr :{port}")
            print(f"💡 Then kill with: taskkill /f /pid <PID>")
            raise RuntimeError(f"Port {port} is required but still in use after cleanup attempt")

        print(f"✅ Using port: {port} (Port available)")

        return {
            'host': host,
            'port': port,
            'debug': self.get('flask.debug', False),
            'threaded': self.get('flask.threaded', True),
            'use_reloader': self.get('flask.use_reloader', False)
        }
    
    def get_socketio_config(self) -> Dict[str, Any]:
        """Get SocketIO configuration"""
        return {
            'cors_allowed_origins': self.get('flask.cors_allowed_origins', '*'),
            'async_mode': self.get('flask.socketio_async_mode', 'eventlet')
        }
    
    def get_login_config(self) -> Dict[str, Any]:
        """Get Flask-Login configuration"""
        return {
            'login_view': self.get('flask.login_view', 'telegram_login'),
            'login_message': self.get('flask.login_message', 'Please log in to access this page.'),
            'login_message_category': self.get('flask.login_message_category', 'info')
        }
    
    def get_upload_config(self) -> Dict[str, Any]:
        """Get file upload configuration"""
        return {
            'max_file_size': self.get('upload.max_file_size', 104857600),
            'upload_directory': self.get('upload.upload_directory', 'data/uploads'),
            'allowed_extensions': self.get('upload.allowed_extensions', [
                'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx',
                'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z', 'mp3',
                'mp4', 'avi', 'mkv', 'mov', 'wav', 'flac', 'json', 'csv', 'xml'
            ]),
            'create_subdirs': self.get('upload.create_subdirs', True),
            'timestamp_filenames': self.get('upload.timestamp_filenames', True)
        }
    
    def get_admin_config(self) -> Dict[str, Any]:
        """Get admin user configuration"""
        return {
            'username': self.get('admin.username', 'admin'),
            'email': self.get('admin.email', 'admin@teledrive.local'),
            'default_password': self.get('admin.default_password', 'admin123'),
            'role': self.get('admin.role', 'admin'),
            'auto_create': self.get('admin.auto_create', True)
        }
    
    def get_directories(self) -> Dict[str, str]:
        """Get directory configuration"""
        return {
            'data': self.get('directories.data', 'data'),
            'uploads': self.get('directories.uploads', 'data/uploads'),
            'backups': self.get('directories.backups', 'data/backups'),
            'temp': self.get('directories.temp', 'data/temp'),
            'output': self.get('directories.output', 'output'),
            'logs': self.get('directories.logs', 'logs'),
            'templates': self.get('directories.templates', 'templates'),
            'static': self.get('directories.static', 'static')
        }
    
    def create_directories(self) -> None:
        """Create all necessary directories"""
        directories = self.get_directories()

        for name, path in directories.items():
            # Convert relative paths to absolute paths
            if not Path(path).is_absolute():
                dir_path = self.project_root / path
            else:
                dir_path = Path(path)

            try:
                dir_path.mkdir(parents=True, exist_ok=True)
                print(f"✅ Created directory: {dir_path}")
            except Exception as e:
                print(f"⚠️ Failed to create directory {dir_path}: {e}")
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration if config file doesn't exist"""
        # Use absolute path for database
        default_db_path = self.project_root / 'data' / 'teledrive.db'

        return {
            "_schema_version": "1.0",
            "_description": "TeleDrive Configuration",
            "_last_updated": "2025-01-11",
            "flask": {
                "secret_key": "",  # Will be auto-generated if empty
                "host": "127.0.0.1",
                "port": 3000,
                "debug": False,
                "threaded": True,
                "use_reloader": False,
                "cors_allowed_origins": "*",
                "socketio_async_mode": "eventlet"
            },
            "database": {
                "url": f"sqlite:///{default_db_path.absolute()}",
                "track_modifications": False
            },
            "upload": {
                "max_file_size": 104857600,
                "upload_directory": "data/uploads",
                "allowed_extensions": ["txt", "pdf", "png", "jpg", "jpeg", "gif"]
            },
            "directories": {
                "data": "data",
                "uploads": "data/uploads",
                "output": "output",
                "logs": "logs"
            },
            "admin": {
                "username": "admin",
                "email": "admin@teledrive.local",
                "default_password": "admin123",
                "auto_create": True
            },
            "security": {
                "session_protection": "strong",
                "remember_cookie_duration": 2592000,
                "session_cookie_secure": False,
                "session_cookie_httponly": True,
                "session_cookie_samesite": "Lax",
                "csrf_time_limit": 86400,
                "max_login_attempts": 5,
                "lockout_duration": 900
            }
        }

# Global instance
flask_config = FlaskConfigLoader()
