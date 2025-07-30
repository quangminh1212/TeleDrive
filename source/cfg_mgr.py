"""
Config Manager for Telegram File Scanner
Handles configuration loading, saving, validation and synchronization
"""
import os
import json
import logging
from typing import Any, Dict, Optional, Union
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import detailed logging
try:
    from logger import setup_detailed_logging, log_step, log_config_change, get_logger
    DETAILED_LOGGING_AVAILABLE = True
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False


class ConfigManager:
    """Manages configuration with validation and error handling"""

    def __init__(self, config_file='config.json'):
        self.config_file = config_file
        self._config = None
        self._detailed_logger = None
        self._load_config()
        self._setup_detailed_logging()

    def _setup_detailed_logging(self):
        """Setup detailed logging system"""
        if DETAILED_LOGGING_AVAILABLE and self._config:
            logging_config = self._config.get('logging', {})
            if logging_config.get('enabled', True):
                try:
                    self._detailed_logger = setup_detailed_logging(logging_config)
                    log_step("KHỞI TẠO LOGGING", "Đã thiết lập logging chi tiết")
                except Exception as e:
                    logger.warning(f"Không thể setup detailed logging: {e}")

    def _load_config(self):
        """Load configuration from config.json with error handling"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self._config = json.load(f)
                logger.info(f"Đã load config từ {self.config_file}")

            # Log chi tiết nếu có
            if DETAILED_LOGGING_AVAILABLE:
                log_step("LOAD CONFIG", f"Đã tải cấu hình từ {self.config_file}")

        except FileNotFoundError:
            logger.warning(f"Không tìm thấy {self.config_file}, tạo config mặc định")
            self._config = self._get_default_config()
            self._save_config()

            if DETAILED_LOGGING_AVAILABLE:
                log_step("CONFIG ERROR", f"File {self.config_file} không tồn tại, tạo config mặc định", "WARNING")

        except json.JSONDecodeError as e:
            logger.error(f"Lỗi JSON trong {self.config_file}: {e}")
            self._config = self._get_default_config()

            if DETAILED_LOGGING_AVAILABLE:
                log_step("CONFIG ERROR", f"Lỗi JSON: {e}", "ERROR")

        except Exception as e:
            logger.error(f"Lỗi đọc {self.config_file}: {e}")
            self._config = self._get_default_config()

            if DETAILED_LOGGING_AVAILABLE:
                log_step("CONFIG ERROR", f"Lỗi không xác định: {e}", "ERROR")

    def _save_config(self):
        """Save configuration to config.json"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)
            logger.info(f"Đã lưu config vào {self.config_file}")
            return True
        except Exception as e:
            logger.error(f"Lỗi lưu {self.config_file}: {e}")
            return False

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "_schema_version": "1.0",
            "_description": "Telegram File Scanner Configuration",
            "_last_updated": "2025-01-11",
            "telegram": {
                "api_id": "",
                "api_hash": "",
                "phone_number": "",
                "session_name": "telegram_scanner_session",
                "connection_timeout": 30,
                "request_timeout": 60,
                "retry_attempts": 3,
                "retry_delay": 5,
                "flood_sleep_threshold": 60,
                "device_model": "Telegram Unlimited Driver",
                "system_version": "1.0",
                "app_version": "1.0",
                "lang_code": "vi",
                "system_lang_code": "vi-VN",
                "app_title": "Telegram Unlimited Driver",
                "short_name": "TeleDrive",
                "mtproto_servers": {
                    "test": {
                        "dc_id": 2,
                        "ip": "149.154.167.40",
                        "port": 443,
                        "public_key": "-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAyMEdY1aR+sCR3ZSJrtztKTKqigvO/vBfqACJLZtS7QMgCGXJ6XIR\nyy7mx66W0/sOFa7/1mAZtEoIokDP3ShoqF4fVNb6XeqgQfaUHd8wJpDWHcR2OFwv\nplUUI1PLTktZ9uW2WE23b+ixNwJjJGwBDJPQEQFBE+vfmH0JP503wr5INS1poWg/\nj25sIWeYPHYeOrFp/eXaqhISP6G+q2IeTaWTXpwZj4LzXq5YOpk4bYEQ6mvRq7D1\naHWfYmlEGepfaYR8Q0YqvvhYtMte3ITnuSJs171+GDqpdKcSwHnd6FudwGO4pcCO\nj4WcDuXc2CTHgH8gFTNhp/Y8/SpDOhvn9QIDAQAB\n-----END RSA PUBLIC KEY-----"
                    },
                    "production": {
                        "dc_id": 2,
                        "ip": "149.154.167.50",
                        "port": 443,
                        "public_key": "-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEA6LszBcC1LGzyr992NzE0ieY+BSaOW622Aa9Bd4ZHLl+TuFQ4lo4g\n5nKaMBwK/BIb9xUfg0Q29/2mgIR6Zr9krM7HjuIcCzFvDtr+L0GQjae9H0pRB2OO\n62cECs5HKhT5DZ98K33vmWiLowc621dQuwKWSQKjWf50XYFw42h21P2KXUGyp2y/\n+aEyZ+uVgLLQbRA1dEjSDZ2iGRy12Mk5gpYc397aYp438fsJoHIgJ2lgMv5h7WY9\nt6N/byY9Nw9p21Og3AoXSL2q/2IJ1WRUhebgAdGVMlV1fkuOQoEzR7EdpqtQD9Cs\n5+bfo3Nhmcyvk5ftB0WkJ9z6bNZ7yxrP8wIDAQAB\n-----END RSA PUBLIC KEY-----"
                    }
                },
                "server_environment": "production"
            },
            "output": {
                "directory": "output",
                "create_subdirs": True,
                "timestamp_folders": False,
                "backup_existing": True,
                "formats": {
                    "csv": {"enabled": True, "filename": "telegram_files.csv", "encoding": "utf-8-sig"},
                    "json": {"enabled": True, "filename": "telegram_files.json", "encoding": "utf-8"},
                    "excel": {"enabled": True, "filename": "telegram_files.xlsx", "sheet_name": "Telegram Files"}
                }
            },
            "scanning": {
                "max_messages": None,
                "batch_size": 100,
                "scan_direction": "newest_first",
                "skip_duplicates": True,
                "file_types": {
                    "documents": True, "photos": True, "videos": True,
                    "audio": True, "voice": True, "stickers": True, "animations": True
                }
            },
            "download": {
                "generate_links": True,
                "include_preview": False,
                "auto_download": False,
                "download_directory": "downloads"
            },
            "display": {
                "show_progress": True,
                "show_file_details": True,
                "language": "vi",
                "date_format": "DD/MM/YYYY HH:mm:ss",
                "log_level": "INFO"
            },
            "filters": {
                "min_file_size": 0,
                "max_file_size": None,
                "file_extensions": [],
                "exclude_extensions": []
            },
            "database": {
                "url": "sqlite:///data/teledrive.db",
                "track_modifications": False,
                "pool_size": 10,
                "pool_timeout": 20,
                "pool_recycle": -1,
                "max_overflow": 0,
                "echo": False
            },
            "flask": {
                "secret_key": "teledrive_secret_key_2025",
                "host": "127.0.0.1",
                "port": 3000,
                "debug": False,
                "threaded": True,
                "use_reloader": False,
                "cors_allowed_origins": "*",
                "login_view": "login"
            }
        }

    def create_default_config(self):
        """Create default configuration file"""
        self._config = self._get_default_config()
        if self._save_config():
            logger.info("Đã tạo config mặc định")
            return True
        return False

    def get(self, path: str, default: Any = None) -> Any:
        """Get configuration value by path (e.g., 'telegram.api_id')"""
        try:
            keys = path.split('.')
            value = self._config
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return default

    def set(self, path: str, value: Any) -> bool:
        """Set configuration value by path"""
        try:
            # Lấy giá trị cũ để log
            old_value = self.get(path, "NOT_SET")

            keys = path.split('.')
            config = self._config
            for key in keys[:-1]:
                if key not in config:
                    config[key] = {}
                config = config[key]
            config[keys[-1]] = value

            # Log thay đổi
            if DETAILED_LOGGING_AVAILABLE:
                log_config_change("SET", {
                    "path": path,
                    "old_value": old_value,
                    "new_value": value
                })

            return self._save_config()
        except Exception as e:
            logger.error(f"Lỗi set config {path}: {e}")
            return False

    def sync_env_to_config(self):
        """Update config with values from .env and auto-save"""
        updated = False

        # Update telegram credentials from .env
        api_id = os.getenv('TELEGRAM_API_ID')
        api_hash = os.getenv('TELEGRAM_API_HASH')
        phone = os.getenv('TELEGRAM_PHONE')

        # Check if credentials are properly configured
        if api_id and api_hash and phone:
            if (api_id not in ['', 'your_api_id_here'] and
                api_hash not in ['', 'your_api_hash_here'] and
                phone not in ['', '+84xxxxxxxxx']):

                # Update config if values are different
                current_api_id = self.get('telegram.api_id', '')
                current_api_hash = self.get('telegram.api_hash', '')
                current_phone = self.get('telegram.phone_number', '')

                if (str(current_api_id) != str(api_id) or
                    str(current_api_hash) != str(api_hash) or
                    str(current_phone) != str(phone)):

                    self.set('telegram.api_id', api_id)
                    self.set('telegram.api_hash', api_hash)
                    self.set('telegram.phone_number', phone)
                    updated = True
                    logger.info("Đã cập nhật API credentials từ .env")

        # Update optional settings from .env
        optional_settings = {
            'TELEGRAM_SESSION_NAME': ('telegram.session_name', str),
            'TELEGRAM_CONNECTION_TIMEOUT': ('telegram.connection_timeout', int),
            'TELEGRAM_REQUEST_TIMEOUT': ('telegram.request_timeout', int),
            'TELEGRAM_RETRY_ATTEMPTS': ('telegram.retry_attempts', int),
            'TELEGRAM_RETRY_DELAY': ('telegram.retry_delay', int),
            'TELEGRAM_APP_TITLE': ('telegram.app_title', str),
            'TELEGRAM_SHORT_NAME': ('telegram.short_name', str),
            'TELEGRAM_DEVICE_MODEL': ('telegram.device_model', str),
            'TELEGRAM_SERVER_ENVIRONMENT': ('telegram.server_environment', str),
            'TELEGRAM_LANG_CODE': ('telegram.lang_code', str),
            'TELEGRAM_SYSTEM_LANG_CODE': ('telegram.system_lang_code', str)
        }

        for env_key, (config_path, value_type) in optional_settings.items():
            env_value = os.getenv(env_key)
            if env_value:
                try:
                    # Convert to appropriate type
                    converted_value = value_type(env_value)
                    current_value = self.get(config_path)

                    if current_value != converted_value:
                        self.set(config_path, converted_value)
                        updated = True
                        logger.info(f"Đã cập nhật {config_path} từ .env")

                except ValueError as e:
                    logger.warning(f"Không thể convert {env_key}={env_value}: {e}")

        # Update last_updated timestamp if any changes were made
        if updated:
            from datetime import datetime
            self.set('_last_updated', datetime.now().strftime('%Y-%m-%d'))
            logger.info("Đã đồng bộ cấu hình từ .env vào config.json")
        return updated

    def validate_configuration(self):
        """Validate that configuration has required values"""
        if not self._config:
            return False
            
        # Check required telegram credentials
        telegram = self._config.get('telegram', {})
        api_id = telegram.get('api_id')
        api_hash = telegram.get('api_hash')
        phone_number = telegram.get('phone_number')
        
        if not api_id or api_id in ['', 'your_api_id_here']:
            return False
            
        if not api_hash or api_hash in ['', 'your_api_hash_here']:
            return False
            
        if not phone_number or phone_number in ['', '+84xxxxxxxxx']:
            return False
            
        # Validate database configuration
        database = self._config.get('database', {})
        if not database.get('url'):
            return False
            
        # If we get here, basic validation passed
        return True