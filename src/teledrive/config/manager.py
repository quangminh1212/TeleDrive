"""
Configuration Manager for TeleDrive
Handles loading, validation, and management of application settings.
"""

import json
import os
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, List
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class ConfigValidator:
    """Validator for configuration files"""

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate_env_file(self, env_path: str = '.env') -> bool:
        """Validate .env file"""
        self.errors.clear()
        self.warnings.clear()

        if not os.path.exists(env_path):
            self.errors.append(f"File {env_path} does not exist")
            return False

        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            self.errors.append(f"Cannot read file {env_path}: {e}")
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
                self.errors.append(f"Missing or empty {field}")
            elif env_vars[field] in ['your_api_id_here', 'your_api_hash_here', '+84xxxxxxxxx']:
                self.errors.append(f"{field} not configured (still default value)")

        # Validate API_ID
        if 'TELEGRAM_API_ID' in env_vars:
            try:
                api_id = int(env_vars['TELEGRAM_API_ID'])
                if api_id <= 0:
                    self.errors.append("TELEGRAM_API_ID must be positive integer")
            except ValueError:
                self.errors.append("TELEGRAM_API_ID must be integer")

        # Validate API_HASH
        if 'TELEGRAM_API_HASH' in env_vars:
            api_hash = env_vars['TELEGRAM_API_HASH']
            if not re.match(r'^[a-fA-F0-9]{32}$', api_hash):
                self.errors.append("TELEGRAM_API_HASH must be 32-character hex string")

        # Validate PHONE
        if 'TELEGRAM_PHONE' in env_vars:
            phone = env_vars['TELEGRAM_PHONE']
            if not re.match(r'^\+\d{10,15}$', phone):
                self.errors.append("TELEGRAM_PHONE must have format +[country_code][number] (10-15 digits)")

        return len(self.errors) == 0

    def validate_config_json(self, config_path: str) -> bool:
        """Validate config.json file"""
        self.errors.clear()
        self.warnings.clear()

        if not os.path.exists(config_path):
            self.errors.append(f"File {config_path} does not exist")
            return False

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            self.errors.append(f"JSON error in {config_path}: {e}")
            return False
        except Exception as e:
            self.errors.append(f"Cannot read file {config_path}: {e}")
            return False

        # Validate required sections
        required_sections = ['telegram', 'output', 'scanning', 'download', 'display', 'filters']
        for section in required_sections:
            if section not in config:
                self.errors.append(f"Missing section '{section}'")

        return len(self.errors) == 0

    def get_validation_report(self) -> str:
        """Get validation report"""
        report = []

        if self.errors:
            report.append("❌ ERRORS:")
            for error in self.errors:
                report.append(f"  - {error}")

        if self.warnings:
            report.append("⚠️ WARNINGS:")
            for warning in self.warnings:
                report.append(f"  - {warning}")

        if not self.errors and not self.warnings:
            report.append("✅ Configuration is valid!")

        return "\n".join(report)

class ConfigManager:
    """Configuration manager with validation and error handling"""

    def __init__(self, config_file: str = None):
        if config_file is None:
            # Look for config.json in config/ directory first, then root
            config_paths = [
                Path("config/config.json"),
                Path("config.json")
            ]
            
            for path in config_paths:
                if path.exists():
                    config_file = str(path)
                    break
            
            if not config_file:
                config_file = "config/config.json"
        
        self.config_file = config_file
        self._config = None
        self._load_config()

    def _load_config(self):
        """Load configuration from config.json with error handling"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self._config = json.load(f)
                logger.info(f"Loaded config from {self.config_file}")

        except FileNotFoundError:
            logger.warning(f"Config file {self.config_file} not found, creating default")
            self._config = self._get_default_config()
            self._save_config()

        except json.JSONDecodeError as e:
            logger.error(f"JSON error in {self.config_file}: {e}")
            self._config = self._get_default_config()

        except Exception as e:
            logger.error(f"Error reading {self.config_file}: {e}")
            self._config = self._get_default_config()

    def _save_config(self):
        """Save configuration to config.json"""
        try:
            # Ensure directory exists
            config_dir = Path(self.config_file).parent
            config_dir.mkdir(parents=True, exist_ok=True)
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved config to {self.config_file}")
            return True
        except Exception as e:
            logger.error(f"Error saving {self.config_file}: {e}")
            return False

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "_schema_version": "2.0",
            "_description": "TeleDrive Configuration",
            "_last_updated": datetime.now().strftime('%Y-%m-%d'),
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
            keys = path.split('.')
            config = self._config
            for key in keys[:-1]:
                if key not in config:
                    config[key] = {}
                config = config[key]
            config[keys[-1]] = value
            return self._save_config()
        except Exception as e:
            logger.error(f"Error setting config {path}: {e}")
            return False

    def get_config(self) -> Dict[str, Any]:
        """Get the current configuration"""
        return self._config

    def validate(self) -> bool:
        """Validate current configuration"""
        validator = ConfigValidator()
        return validator.validate_config_json(self.config_file)

    def update_from_env(self):
        """Update config with values from .env"""
        load_dotenv()
        
        # Update telegram credentials from .env
        api_id = os.getenv('TELEGRAM_API_ID')
        api_hash = os.getenv('TELEGRAM_API_HASH')
        phone = os.getenv('TELEGRAM_PHONE')

        updated = False
        if api_id and api_id not in ['', 'your_api_id_here']:
            if self.set('telegram.api_id', api_id):
                updated = True

        if api_hash and api_hash not in ['', 'your_api_hash_here']:
            if self.set('telegram.api_hash', api_hash):
                updated = True

        if phone and phone not in ['', '+84xxxxxxxxx']:
            if self.set('telegram.phone_number', phone):
                updated = True

        if updated:
            self.set('_last_updated', datetime.now().strftime('%Y-%m-%d'))
            logger.info("Updated configuration from .env")

        return updated
