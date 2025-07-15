"""
Configuration settings for TeleDrive
Provides backward compatibility and easy access to configuration values.
"""

import os
import json
import logging
from typing import Any, Dict, Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

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

def load_config(config_file: str = None) -> Dict[str, Any]:
    """Load configuration from config.json"""
    if config_file is None:
        # Look for config.json in config/ directory first, then root
        config_paths = [
            Path("config/config.json"),
            Path("config.json")
        ]
        
        config_file = None
        for path in config_paths:
            if path.exists():
                config_file = str(path)
                break
        
        if not config_file:
            config_file = "config/config.json"
    
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
            logger.info(f"Loaded config from {config_file}")
            return config
    except FileNotFoundError:
        logger.warning(f"Config file {config_file} not found, using defaults")
        return get_default_config()
    except json.JSONDecodeError as e:
        logger.error(f"JSON error in {config_file}: {e}")
        return get_default_config()
    except Exception as e:
        logger.error(f"Error reading {config_file}: {e}")
        return get_default_config()

def get_default_config() -> Dict[str, Any]:
    """Get default configuration"""
    return {
        "_schema_version": "2.0",
        "_description": "TeleDrive Configuration",
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
            "device_model": "TeleDrive",
            "system_version": "2.0",
            "app_version": "2.0",
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
        },
        "logging": {
            "enabled": True,
            "level": "INFO",
            "file": "logs/scanner.log",
            "max_size_mb": 10,
            "backup_count": 5,
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "console_output": True
        }
    }

# Load global configuration
CONFIG = load_config()

# ================================================================
# CONFIGURATION VARIABLES (Backward Compatibility)
# ================================================================

# Telegram API credentials - Priority: .env > config.json
API_ID = os.getenv('TELEGRAM_API_ID') or get_safe(CONFIG, 'telegram.api_id', '')
API_HASH = os.getenv('TELEGRAM_API_HASH') or get_safe(CONFIG, 'telegram.api_hash', '')
PHONE_NUMBER = os.getenv('TELEGRAM_PHONE') or get_safe(CONFIG, 'telegram.phone_number', '')

# Telegram connection settings
SESSION_NAME = get_safe(CONFIG, 'telegram.session_name', 'telegram_scanner_session')
CONNECTION_TIMEOUT = int(get_safe(CONFIG, 'telegram.connection_timeout', 30))
REQUEST_TIMEOUT = int(get_safe(CONFIG, 'telegram.request_timeout', 60))
RETRY_ATTEMPTS = int(get_safe(CONFIG, 'telegram.retry_attempts', 3))
RETRY_DELAY = int(get_safe(CONFIG, 'telegram.retry_delay', 5))
FLOOD_SLEEP_THRESHOLD = int(get_safe(CONFIG, 'telegram.flood_sleep_threshold', 60))

# Device information
DEVICE_MODEL = get_safe(CONFIG, 'telegram.device_model', 'TeleDrive')
SYSTEM_VERSION = get_safe(CONFIG, 'telegram.system_version', '2.0')
APP_VERSION = get_safe(CONFIG, 'telegram.app_version', '2.0')
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

JSON_ENABLED = get_safe(CONFIG, 'output.formats.json.enabled', True)
JSON_FILENAME = get_safe(CONFIG, 'output.formats.json.filename', 'telegram_files.json')
JSON_ENCODING = get_safe(CONFIG, 'output.formats.json.encoding', 'utf-8')
JSON_INDENT = get_safe(CONFIG, 'output.formats.json.indent', 2)

EXCEL_ENABLED = get_safe(CONFIG, 'output.formats.excel.enabled', True)
EXCEL_FILENAME = get_safe(CONFIG, 'output.formats.excel.filename', 'telegram_files.xlsx')
EXCEL_SHEET_NAME = get_safe(CONFIG, 'output.formats.excel.sheet_name', 'Telegram Files')

# Scanning settings
MAX_MESSAGES = get_safe(CONFIG, 'scanning.max_messages', None)
BATCH_SIZE = int(get_safe(CONFIG, 'scanning.batch_size', 100))
SCAN_DIRECTION = get_safe(CONFIG, 'scanning.scan_direction', 'newest_first')
SKIP_DUPLICATES = get_safe(CONFIG, 'scanning.skip_duplicates', True)

# File types to scan
SCAN_DOCUMENTS = get_safe(CONFIG, 'scanning.file_types.documents', True)
SCAN_PHOTOS = get_safe(CONFIG, 'scanning.file_types.photos', True)
SCAN_VIDEOS = get_safe(CONFIG, 'scanning.file_types.videos', True)
SCAN_AUDIO = get_safe(CONFIG, 'scanning.file_types.audio', True)
SCAN_VOICE = get_safe(CONFIG, 'scanning.file_types.voice', True)
SCAN_STICKERS = get_safe(CONFIG, 'scanning.file_types.stickers', True)
SCAN_ANIMATIONS = get_safe(CONFIG, 'scanning.file_types.animations', True)

# Download settings
GENERATE_DOWNLOAD_LINKS = get_safe(CONFIG, 'download.generate_links', True)
INCLUDE_FILE_PREVIEW = get_safe(CONFIG, 'download.include_preview', False)
AUTO_DOWNLOAD = get_safe(CONFIG, 'download.auto_download', False)
DOWNLOAD_DIR = get_safe(CONFIG, 'download.download_directory', 'downloads')

# Display settings
SHOW_PROGRESS = get_safe(CONFIG, 'display.show_progress', True)
SHOW_FILE_DETAILS = get_safe(CONFIG, 'display.show_file_details', True)
LANGUAGE = get_safe(CONFIG, 'display.language', 'vi')
DATE_FORMAT = get_safe(CONFIG, 'display.date_format', 'DD/MM/YYYY HH:mm:ss')
LOG_LEVEL = get_safe(CONFIG, 'display.log_level', 'INFO')

# Filter settings
MIN_FILE_SIZE = int(get_safe(CONFIG, 'filters.min_file_size', 0))
MAX_FILE_SIZE = get_safe(CONFIG, 'filters.max_file_size', None)
FILE_EXTENSIONS = get_safe(CONFIG, 'filters.file_extensions', [])
EXCLUDE_EXTENSIONS = get_safe(CONFIG, 'filters.exclude_extensions', [])

def get_config():
    """Get the current configuration"""
    return CONFIG

def validate_config():
    """Validate configuration and return True if valid"""
    errors = []
    
    if not API_ID or API_ID in ['', 'your_api_id_here']:
        errors.append("TELEGRAM_API_ID not configured")
    
    if not API_HASH or API_HASH in ['', 'your_api_hash_here']:
        errors.append("TELEGRAM_API_HASH not configured")
    
    if not PHONE_NUMBER or PHONE_NUMBER in ['', '+84xxxxxxxxx']:
        errors.append("TELEGRAM_PHONE not configured")
    
    if errors:
        logger.error("Configuration errors:")
        for error in errors:
            logger.error(f"  - {error}")
        return False
    
    return True
