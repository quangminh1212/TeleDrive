"""
Cấu hình cho Telegram File Scanner
Hỗ trợ đầy đủ validation và error handling với logging chi tiết
"""
import os
import json
import logging
import re
from typing import Any, Dict, Optional, Union
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import detailed logging
try:
    from logger import setup_detailed_logging, log_step, log_config_change, get_logger
    DETAILED_LOGGING_AVAILABLE = True
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False
    logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

class ConfigValidator:
    """Validator cho config.json và .env"""

    def __init__(self):
        self.errors = []
        self.warnings = []

    def validate_env_file(self, env_path: str = '.env') -> bool:
        """Validate .env file"""
        self.errors.clear()
        self.warnings.clear()

        if not os.path.exists(env_path):
            self.errors.append(f"File {env_path} không tồn tại")
            return False

        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            self.errors.append(f"Không thể đọc file {env_path}: {e}")
            return False

        # Parse environment variables
        env_vars = {}
        for line in content.split('\n'):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

        # Validate required fields
        required_fields = ['TELEGRAM_API_ID', 'TELEGRAM_API_HASH', 'TELEGRAM_PHONE']
        for field in required_fields:
            if field not in env_vars or not env_vars[field]:
                self.errors.append(f"Thiếu hoặc trống {field}")
            elif env_vars[field] in ['your_api_id_here', 'your_api_hash_here', '+84xxxxxxxxx']:
                self.errors.append(f"{field} chưa được cấu hình (vẫn là giá trị mặc định)")

        # Validate API_ID
        if 'TELEGRAM_API_ID' in env_vars:
            try:
                api_id = int(env_vars['TELEGRAM_API_ID'])
                if api_id <= 0:
                    self.errors.append("TELEGRAM_API_ID phải là số nguyên dương")
            except ValueError:
                self.errors.append("TELEGRAM_API_ID phải là số nguyên")

        # Validate API_HASH
        if 'TELEGRAM_API_HASH' in env_vars:
            api_hash = env_vars['TELEGRAM_API_HASH']
            if not re.match(r'^[a-fA-F0-9]{32}$', api_hash):
                self.errors.append("TELEGRAM_API_HASH phải là chuỗi 32 ký tự hex")

        # Validate PHONE
        if 'TELEGRAM_PHONE' in env_vars:
            phone = env_vars['TELEGRAM_PHONE']
            if not re.match(r'^\+\d{10,15}$', phone):
                self.errors.append("TELEGRAM_PHONE phải có format +[mã quốc gia][số điện thoại] (10-15 chữ số)")

        return len(self.errors) == 0

    def validate_config_json(self, config_path: str = 'config.json') -> bool:
        """Validate config.json file"""
        self.errors.clear()
        self.warnings.clear()

        if not os.path.exists(config_path):
            self.errors.append(f"File {config_path} không tồn tại")
            return False

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            self.errors.append(f"Lỗi JSON trong {config_path}: {e}")
            return False
        except Exception as e:
            self.errors.append(f"Không thể đọc file {config_path}: {e}")
            return False

        # Validate required sections
        required_sections = ['telegram', 'output', 'scanning', 'download', 'display', 'filters']
        for section in required_sections:
            if section not in config:
                self.errors.append(f"Thiếu section '{section}'")

        return len(self.errors) == 0

    def get_validation_report(self) -> str:
        """Get validation report"""
        report = []

        if self.errors:
            report.append("❌ LỖI:")
            for error in self.errors:
                report.append(f"  - {error}")

        if self.warnings:
            report.append("⚠️ CẢNH BÁO:")
            for warning in self.warnings:
                report.append(f"  - {warning}")

        if not self.errors and not self.warnings:
            report.append("✅ Cấu hình hợp lệ!")

        return "\n".join(report)

class ConfigManager:
    """Quản lý cấu hình với validation và error handling"""

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
        """Save configuration to config.json with validation"""
        try:
            # Validate before saving
            validator = ConfigValidator()
            temp_file = self.config_file + '.tmp'

            # Save to temp file first
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)

            # Validate temp file
            if validator.validate_config_json(temp_file):
                # Move temp file to actual file
                os.rename(temp_file, self.config_file)
                logger.info(f"Đã lưu và validate cấu hình vào {self.config_file}")
                return True
            else:
                # Remove temp file and show errors
                os.remove(temp_file)
                logger.error("Cấu hình không hợp lệ:")
                logger.error(validator.get_validation_report())
                return False

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
                "device_model": "Telegram File Scanner",
                "system_version": "1.0",
                "app_version": "1.0",
                "lang_code": "vi",
                "system_lang_code": "vi-VN"
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
            }
        }

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

    def update_from_env(self):
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
            'TELEGRAM_RETRY_DELAY': ('telegram.retry_delay', int)
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
            self.set('_last_updated', datetime.now().strftime('%Y-%m-%d'))
            logger.info("Đã đồng bộ cấu hình từ .env vào config.json")

    def validate_configuration(self):
        """Validate current configuration"""
        validator = ConfigValidator()

        # Validate .env
        env_valid = validator.validate_env_file()
        if not env_valid:
            logger.error("❌ .env có lỗi:")
            logger.error(validator.get_validation_report())

        # Validate config.json
        config_valid = validator.validate_config_json()
        if not config_valid:
            logger.error("❌ config.json có lỗi:")
            logger.error(validator.get_validation_report())

        # Overall result
        if env_valid and config_valid:
            logger.info("🎉 TẤT CẢ CẤU HÌNH HỢP LỆ!")
            return True
        else:
            logger.warning("⚠️ CÓ LỖI TRONG CẤU HÌNH!")
            return False

    def update_telegram_config(self, api_id=None, api_hash=None, phone_number=None):
        """Update Telegram configuration"""
        if api_id:
            self.set('telegram.api_id', str(api_id))
        if api_hash:
            self.set('telegram.api_hash', str(api_hash))
        if phone_number:
            self.set('telegram.phone_number', str(phone_number))
        return self._save_config()

    def update_output_config(self, directory=None, csv_enabled=None, json_enabled=None, excel_enabled=None):
        """Update output configuration"""
        if directory:
            self.set('output.directory', directory)
        if csv_enabled is not None:
            self.set('output.formats.csv.enabled', csv_enabled)
        if json_enabled is not None:
            self.set('output.formats.json.enabled', json_enabled)
        if excel_enabled is not None:
            self.set('output.formats.excel.enabled', excel_enabled)
        return self._save_config()

    def update_scanning_config(self, max_messages=None, batch_size=None, file_types=None):
        """Update scanning configuration"""
        if max_messages is not None:
            self.set('scanning.max_messages', max_messages)
        if batch_size:
            self.set('scanning.batch_size', batch_size)
        if file_types:
            for file_type, enabled in file_types.items():
                self.set(f'scanning.file_types.{file_type}', enabled)
        return self._save_config()

    def update_filter_config(self, min_size=None, max_size=None, extensions=None, exclude_ext=None):
        """Update filter configuration"""
        if min_size is not None:
            self.set('filters.min_file_size', min_size)
        if max_size is not None:
            self.set('filters.max_file_size', max_size)
        if extensions is not None:
            self.set('filters.file_extensions', extensions)
        if exclude_ext is not None:
            self.set('filters.exclude_extensions', exclude_ext)
        return self._save_config()

    def print_config_summary(self):
        """Print current configuration summary"""
        print("\n" + "="*60)
        print("           CẤU HÌNH TELEGRAM FILE SCANNER")
        print("="*60)

        # Telegram settings
        print(f"\n📱 TELEGRAM:")
        print(f"   API ID: {self.get('telegram.api_id', 'Chưa cấu hình')}")
        api_hash = self.get('telegram.api_hash', '')
        print(f"   API Hash: {'*' * len(api_hash) if api_hash else 'Chưa cấu hình'}")
        print(f"   Số điện thoại: {self.get('telegram.phone_number', 'Chưa cấu hình')}")

        # Output settings
        print(f"\n📁 OUTPUT:")
        print(f"   Thư mục: {self.get('output.directory', 'output')}")
        print(f"   CSV: {'✓' if self.get('output.formats.csv.enabled') else '✗'}")
        print(f"   JSON: {'✓' if self.get('output.formats.json.enabled') else '✗'}")
        print(f"   Excel: {'✓' if self.get('output.formats.excel.enabled') else '✗'}")

        # Scanning settings
        print(f"\n🔍 SCANNING:")
        print(f"   Max messages: {self.get('scanning.max_messages', 'Không giới hạn')}")
        print(f"   Batch size: {self.get('scanning.batch_size', 100)}")

        # File types
        file_types = self.get('scanning.file_types', {})
        enabled_types = [k for k, v in file_types.items() if v]
        print(f"   File types: {', '.join(enabled_types) if enabled_types else 'Không có'}")

        # Filter settings
        print(f"\n🔧 FILTERS:")
        print(f"   Min size: {self.get('filters.min_file_size', 0)} bytes")
        print(f"   Max size: {self.get('filters.max_file_size', 'Không giới hạn')}")
        extensions = self.get('filters.file_extensions', [])
        print(f"   Extensions: {extensions if extensions else 'Tất cả'}")

        print("="*60)

# Initialize global config manager
config_manager = ConfigManager()
config_manager.update_from_env()

# Helper function for backward compatibility
def load_config():
    """Load configuration (backward compatibility)"""
    return config_manager._config

def save_config(config):
    """Save configuration (backward compatibility)"""
    config_manager._config = config
    return config_manager._save_config()

# Load configuration
CONFIG = config_manager._config

# ================================================================
# CONFIGURATION VARIABLES (Backward Compatibility)
# ================================================================

def get_safe(config_dict: Dict[str, Any], path: str, default: Any = None) -> Any:
    """Safely get nested dictionary value"""
    try:
        keys = path.split('.')
        value = config_dict
        for key in keys:
            value = value[key]
        return value if value is not None else default
    except (KeyError, TypeError):
        return default

# Telegram API credentials - Ưu tiên từ .env, sau đó từ config.json
API_ID = os.getenv('TELEGRAM_API_ID') or get_safe(CONFIG, 'telegram.api_id', '')
API_HASH = os.getenv('TELEGRAM_API_HASH') or get_safe(CONFIG, 'telegram.api_hash', '')
PHONE_NUMBER = os.getenv('TELEGRAM_PHONE') or get_safe(CONFIG, 'telegram.phone_number', '')

# Validate required credentials
if not API_ID or not API_HASH or not PHONE_NUMBER:
    logger.warning("Thiếu thông tin API credentials. Vui lòng cấu hình .env hoặc config.json")

# Telegram connection settings
SESSION_NAME = get_safe(CONFIG, 'telegram.session_name', 'telegram_scanner_session')
CONNECTION_TIMEOUT = int(get_safe(CONFIG, 'telegram.connection_timeout', 30))
REQUEST_TIMEOUT = int(get_safe(CONFIG, 'telegram.request_timeout', 60))
RETRY_ATTEMPTS = int(get_safe(CONFIG, 'telegram.retry_attempts', 3))
RETRY_DELAY = int(get_safe(CONFIG, 'telegram.retry_delay', 5))
FLOOD_SLEEP_THRESHOLD = int(get_safe(CONFIG, 'telegram.flood_sleep_threshold', 60))

# Device information
DEVICE_MODEL = get_safe(CONFIG, 'telegram.device_model', 'Telegram File Scanner')
SYSTEM_VERSION = get_safe(CONFIG, 'telegram.system_version', '1.0')
APP_VERSION = get_safe(CONFIG, 'telegram.app_version', '1.0')
LANG_CODE = get_safe(CONFIG, 'telegram.lang_code', 'vi')
SYSTEM_LANG_CODE = get_safe(CONFIG, 'telegram.system_lang_code', 'vi-VN')

# Output settings
OUTPUT_DIR = get_safe(CONFIG, 'output.directory', 'output')
CREATE_SUBDIRS = get_safe(CONFIG, 'output.create_subdirs', True)
TIMESTAMP_FOLDERS = get_safe(CONFIG, 'output.timestamp_folders', False)
BACKUP_EXISTING = get_safe(CONFIG, 'output.backup_existing', True)

# Output format settings
CSV_ENABLED = get_safe(CONFIG, 'output.formats.csv.enabled', True)
CSV_FILENAME = get_safe(CONFIG, 'output.formats.csv.filename', 'telegram_files.csv')
CSV_ENCODING = get_safe(CONFIG, 'output.formats.csv.encoding', 'utf-8-sig')
CSV_DELIMITER = get_safe(CONFIG, 'output.formats.csv.delimiter', ',')

JSON_ENABLED = get_safe(CONFIG, 'output.formats.json.enabled', True)
JSON_FILENAME = get_safe(CONFIG, 'output.formats.json.filename', 'telegram_files.json')
JSON_ENCODING = get_safe(CONFIG, 'output.formats.json.encoding', 'utf-8')
JSON_INDENT = get_safe(CONFIG, 'output.formats.json.indent', 2)

EXCEL_ENABLED = get_safe(CONFIG, 'output.formats.excel.enabled', True)
EXCEL_FILENAME = get_safe(CONFIG, 'output.formats.excel.filename', 'telegram_files.xlsx')
EXCEL_SHEET_NAME = get_safe(CONFIG, 'output.formats.excel.sheet_name', 'Telegram Files')

SIMPLE_JSON_ENABLED = get_safe(CONFIG, 'output.formats.simple_json.enabled', False)
SIMPLE_JSON_FILENAME = get_safe(CONFIG, 'output.formats.simple_json.filename', 'simple_files.json')

# Scanning settings
MAX_MESSAGES = get_safe(CONFIG, 'scanning.max_messages', None)
BATCH_SIZE = int(get_safe(CONFIG, 'scanning.batch_size', 100))
SCAN_DIRECTION = get_safe(CONFIG, 'scanning.scan_direction', 'newest_first')
INCLUDE_DELETED = get_safe(CONFIG, 'scanning.include_deleted', False)
SKIP_DUPLICATES = get_safe(CONFIG, 'scanning.skip_duplicates', True)
SCAN_REPLIES = get_safe(CONFIG, 'scanning.scan_replies', True)
SCAN_FORWARDS = get_safe(CONFIG, 'scanning.scan_forwards', True)

# File types to scan
SCAN_DOCUMENTS = get_safe(CONFIG, 'scanning.file_types.documents', True)
SCAN_PHOTOS = get_safe(CONFIG, 'scanning.file_types.photos', True)
SCAN_VIDEOS = get_safe(CONFIG, 'scanning.file_types.videos', True)
SCAN_AUDIO = get_safe(CONFIG, 'scanning.file_types.audio', True)
SCAN_VOICE = get_safe(CONFIG, 'scanning.file_types.voice', True)
SCAN_STICKERS = get_safe(CONFIG, 'scanning.file_types.stickers', True)
SCAN_ANIMATIONS = get_safe(CONFIG, 'scanning.file_types.animations', True)
SCAN_VIDEO_NOTES = get_safe(CONFIG, 'scanning.file_types.video_notes', True)
SCAN_CONTACTS = get_safe(CONFIG, 'scanning.file_types.contacts', False)
SCAN_LOCATIONS = get_safe(CONFIG, 'scanning.file_types.locations', False)

# Performance settings
CONCURRENT_DOWNLOADS = int(get_safe(CONFIG, 'scanning.performance.concurrent_downloads', 3))
SLEEP_BETWEEN_BATCHES = float(get_safe(CONFIG, 'scanning.performance.sleep_between_batches', 1))
MEMORY_LIMIT_MB = int(get_safe(CONFIG, 'scanning.performance.memory_limit_mb', 512))
CACHE_SIZE = int(get_safe(CONFIG, 'scanning.performance.cache_size', 1000))

# Download settings
GENERATE_DOWNLOAD_LINKS = get_safe(CONFIG, 'download.generate_links', True)
INCLUDE_FILE_PREVIEW = get_safe(CONFIG, 'download.include_preview', False)
AUTO_DOWNLOAD = get_safe(CONFIG, 'download.auto_download', False)
DOWNLOAD_DIR = get_safe(CONFIG, 'download.download_directory', 'downloads')
CREATE_DATE_FOLDERS = get_safe(CONFIG, 'download.create_date_folders', True)
PRESERVE_FILENAME = get_safe(CONFIG, 'download.preserve_filename', True)
MAX_FILE_SIZE_MB = float(get_safe(CONFIG, 'download.max_file_size_mb', 100))
DOWNLOAD_TIMEOUT = int(get_safe(CONFIG, 'download.download_timeout', 300))
VERIFY_DOWNLOADS = get_safe(CONFIG, 'download.verify_downloads', True)
RESUME_DOWNLOADS = get_safe(CONFIG, 'download.resume_downloads', True)

# Display settings
SHOW_PROGRESS = get_safe(CONFIG, 'display.show_progress', True)
SHOW_FILE_DETAILS = get_safe(CONFIG, 'display.show_file_details', True)
SHOW_STATISTICS = get_safe(CONFIG, 'display.show_statistics', True)
LANGUAGE = get_safe(CONFIG, 'display.language', 'vi')
DATE_FORMAT = get_safe(CONFIG, 'display.date_format', 'DD/MM/YYYY HH:mm:ss')
FILE_SIZE_FORMAT = get_safe(CONFIG, 'display.file_size_format', 'auto')
PROGRESS_BAR_STYLE = get_safe(CONFIG, 'display.progress_bar_style', 'bar')
CONSOLE_WIDTH = int(get_safe(CONFIG, 'display.console_width', 80))
LOG_LEVEL = get_safe(CONFIG, 'display.log_level', 'INFO')

# Filter settings
MIN_FILE_SIZE = int(get_safe(CONFIG, 'filters.min_file_size', 0))
MAX_FILE_SIZE = get_safe(CONFIG, 'filters.max_file_size', None)
FILE_EXTENSIONS = get_safe(CONFIG, 'filters.file_extensions', [])
EXCLUDE_EXTENSIONS = get_safe(CONFIG, 'filters.exclude_extensions', [])
FILENAME_PATTERNS = get_safe(CONFIG, 'filters.filename_patterns', [])
EXCLUDE_PATTERNS = get_safe(CONFIG, 'filters.exclude_patterns', [])
SENDER_FILTER = get_safe(CONFIG, 'filters.sender_filter', [])
EXCLUDE_SENDERS = get_safe(CONFIG, 'filters.exclude_senders', [])
MESSAGE_TEXT_FILTER = get_safe(CONFIG, 'filters.message_text_filter', '')
CASE_SENSITIVE = get_safe(CONFIG, 'filters.case_sensitive', False)
DATE_FROM = get_safe(CONFIG, 'filters.date_from', None)
DATE_TO = get_safe(CONFIG, 'filters.date_to', None)

# Security settings
MASK_PHONE_NUMBERS = get_safe(CONFIG, 'security.mask_phone_numbers', True)
MASK_USER_IDS = get_safe(CONFIG, 'security.mask_user_ids', False)
EXCLUDE_PERSONAL_INFO = get_safe(CONFIG, 'security.exclude_personal_info', True)
SECURE_SESSION = get_safe(CONFIG, 'security.secure_session', True)
AUTO_LOGOUT = get_safe(CONFIG, 'security.auto_logout', False)
SESSION_TIMEOUT = int(get_safe(CONFIG, 'security.session_timeout', 3600))

# Logging settings
LOGGING_ENABLED = get_safe(CONFIG, 'logging.enabled', True)
LOGGING_LEVEL = get_safe(CONFIG, 'logging.level', 'INFO')
LOGGING_FILE = get_safe(CONFIG, 'logging.file', 'logs/scanner.log')
LOGGING_MAX_SIZE_MB = int(get_safe(CONFIG, 'logging.max_size_mb', 10))
LOGGING_BACKUP_COUNT = int(get_safe(CONFIG, 'logging.backup_count', 5))
LOGGING_FORMAT = get_safe(CONFIG, 'logging.format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
LOGGING_CONSOLE_OUTPUT = get_safe(CONFIG, 'logging.console_output', True)

# Advanced settings
USE_IPV6 = get_safe(CONFIG, 'advanced.use_ipv6', False)
PROXY_ENABLED = get_safe(CONFIG, 'advanced.proxy.enabled', False)
PROXY_TYPE = get_safe(CONFIG, 'advanced.proxy.type', 'socks5')
PROXY_HOST = get_safe(CONFIG, 'advanced.proxy.host', '')
PROXY_PORT = int(get_safe(CONFIG, 'advanced.proxy.port', 1080))
PROXY_USERNAME = get_safe(CONFIG, 'advanced.proxy.username', '')
PROXY_PASSWORD = get_safe(CONFIG, 'advanced.proxy.password', '')

RATE_LIMITING_ENABLED = get_safe(CONFIG, 'advanced.rate_limiting.enabled', True)
REQUESTS_PER_SECOND = int(get_safe(CONFIG, 'advanced.rate_limiting.requests_per_second', 10))
BURST_LIMIT = int(get_safe(CONFIG, 'advanced.rate_limiting.burst_limit', 20))

# Experimental features
PARALLEL_SCANNING = get_safe(CONFIG, 'advanced.experimental.parallel_scanning', False)
SMART_RETRY = get_safe(CONFIG, 'advanced.experimental.smart_retry', True)
ADAPTIVE_BATCH_SIZE = get_safe(CONFIG, 'advanced.experimental.adaptive_batch_size', False)

# ================================================================
# VALIDATION AND ERROR CHECKING
# ================================================================

def validate_config():
    """Validate configuration and show warnings/errors"""
    errors = []
    warnings = []

    # Check required credentials
    if not API_ID or API_ID in ['', 'your_api_id_here']:
        errors.append("TELEGRAM_API_ID chưa được cấu hình")

    if not API_HASH or API_HASH in ['', 'your_api_hash_here']:
        errors.append("TELEGRAM_API_HASH chưa được cấu hình")

    if not PHONE_NUMBER or PHONE_NUMBER in ['', '+84xxxxxxxxx']:
        errors.append("TELEGRAM_PHONE chưa được cấu hình")

    # Check numeric ranges
    if BATCH_SIZE <= 0 or BATCH_SIZE > 1000:
        warnings.append(f"BATCH_SIZE ({BATCH_SIZE}) nên trong khoảng 1-1000")

    if CONNECTION_TIMEOUT <= 0 or CONNECTION_TIMEOUT > 300:
        warnings.append(f"CONNECTION_TIMEOUT ({CONNECTION_TIMEOUT}) nên trong khoảng 1-300")

    # Check directories
    if not OUTPUT_DIR:
        errors.append("OUTPUT_DIR không được để trống")

    # Show results
    if errors:
        logger.error("LỖI CẤU HÌNH:")
        for error in errors:
            logger.error(f"  - {error}")

    if warnings:
        logger.warning("CẢNH BÁO CẤU HÌNH:")
        for warning in warnings:
            logger.warning(f"  - {warning}")

    return len(errors) == 0

# Validate configuration on import
if __name__ != "__main__":
    validate_config()

# ================================================================
# UTILITY FUNCTIONS
# ================================================================

def get_config_summary():
    """Get configuration summary for debugging"""
    return {
        "api_configured": bool(API_ID and API_HASH and PHONE_NUMBER),
        "output_dir": OUTPUT_DIR,
        "batch_size": BATCH_SIZE,
        "max_messages": MAX_MESSAGES,
        "formats_enabled": {
            "csv": CSV_ENABLED,
            "json": JSON_ENABLED,
            "excel": EXCEL_ENABLED
        },
        "file_types": {
            "documents": SCAN_DOCUMENTS,
            "photos": SCAN_PHOTOS,
            "videos": SCAN_VIDEOS,
            "audio": SCAN_AUDIO
        }
    }

def print_config_summary():
    """Print configuration summary"""
    summary = get_config_summary()
    print("\n" + "="*60)
    print("           CẤU HÌNH HIỆN TẠI")
    print("="*60)
    print(f"API đã cấu hình: {'✓' if summary['api_configured'] else '✗'}")
    print(f"Thư mục output: {summary['output_dir']}")
    print(f"Batch size: {summary['batch_size']}")
    print(f"Max messages: {summary['max_messages'] or 'Không giới hạn'}")
    print(f"Formats: CSV={summary['formats_enabled']['csv']}, JSON={summary['formats_enabled']['json']}, Excel={summary['formats_enabled']['excel']}")
    print("="*60)

# ================================================================
# INTERACTIVE CONFIGURATION FUNCTIONS
# ================================================================

def interactive_config_manager():
    """Interactive config manager"""
    while True:
        print("\n" + "="*50)
        print("        QUẢN LÝ CẤU HÌNH")
        print("="*50)
        print("1. Xem cấu hình hiện tại")
        print("2. Cấu hình Telegram API")
        print("3. Cấu hình Output")
        print("4. Cấu hình Scanning")
        print("5. Cấu hình Filters")
        print("6. Đồng bộ từ .env sang config.json")
        print("7. Kiểm tra validation")
        print("8. Reset về mặc định")
        print("0. Thoát")
        print("-"*50)

        choice = input("Chọn (0-8): ").strip()

        if choice == '0':
            break
        elif choice == '1':
            config_manager.print_config_summary()
        elif choice == '2':
            configure_telegram_interactive()
        elif choice == '3':
            configure_output_interactive()
        elif choice == '4':
            configure_scanning_interactive()
        elif choice == '5':
            configure_filters_interactive()
        elif choice == '6':
            config_manager.update_from_env()
            input("\nNhấn Enter để tiếp tục...")
        elif choice == '7':
            config_manager.validate_configuration()
            input("\nNhấn Enter để tiếp tục...")
        elif choice == '8':
            config_manager._config = config_manager._get_default_config()
            config_manager._save_config()
            print("Đã reset về cấu hình mặc định!")
        else:
            print("Lựa chọn không hợp lệ!")

def configure_telegram_interactive():
    """Configure Telegram settings interactively"""
    print("\n📱 CẤU HÌNH TELEGRAM API")
    print("-"*30)

    api_id = input("API ID (Enter để bỏ qua): ").strip()
    api_hash = input("API Hash (Enter để bỏ qua): ").strip()
    phone = input("Số điện thoại (+84xxxxxxxxx) (Enter để bỏ qua): ").strip()

    config_manager.update_telegram_config(
        api_id=api_id if api_id else None,
        api_hash=api_hash if api_hash else None,
        phone_number=phone if phone else None
    )

def configure_output_interactive():
    """Configure output settings interactively"""
    print("\n📁 CẤU HÌNH OUTPUT")
    print("-"*25)

    directory = input("Thư mục output (Enter để bỏ qua): ").strip()

    csv_input = input("Xuất CSV? (y/n/Enter để bỏ qua): ").strip().lower()
    csv_enabled = True if csv_input == 'y' else False if csv_input == 'n' else None

    json_input = input("Xuất JSON? (y/n/Enter để bỏ qua): ").strip().lower()
    json_enabled = True if json_input == 'y' else False if json_input == 'n' else None

    excel_input = input("Xuất Excel? (y/n/Enter để bỏ qua): ").strip().lower()
    excel_enabled = True if excel_input == 'y' else False if excel_input == 'n' else None

    config_manager.update_output_config(
        directory=directory if directory else None,
        csv_enabled=csv_enabled,
        json_enabled=json_enabled,
        excel_enabled=excel_enabled
    )

def configure_scanning_interactive():
    """Configure scanning settings interactively"""
    print("\n🔍 CẤU HÌNH SCANNING")
    print("-"*28)

    max_msg = input("Số message tối đa (Enter = không giới hạn): ").strip()
    max_messages = int(max_msg) if max_msg.isdigit() else None

    batch = input("Batch size (Enter để bỏ qua): ").strip()
    batch_size = int(batch) if batch.isdigit() else None

    config_manager.update_scanning_config(
        max_messages=max_messages,
        batch_size=batch_size
    )

def configure_filters_interactive():
    """Configure filter settings interactively"""
    print("\n🔧 CẤU HÌNH FILTERS")
    print("-"*26)

    min_size = input("Kích thước file tối thiểu (bytes, Enter để bỏ qua): ").strip()
    min_file_size = int(min_size) if min_size.isdigit() else None

    max_size = input("Kích thước file tối đa (bytes, Enter để bỏ qua): ").strip()
    max_file_size = int(max_size) if max_size.isdigit() else None

    extensions = input("Phần mở rộng cho phép (cách nhau bởi dấu phẩy, Enter để bỏ qua): ").strip()
    file_extensions = [ext.strip() for ext in extensions.split(',')] if extensions else None

    config_manager.update_filter_config(
        min_size=min_file_size,
        max_size=max_file_size,
        extensions=file_extensions
    )
