"""Utility functions for managing configuration."""

import json
import os
import logging
from typing import Dict, Any, Optional, Union, List

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

CONFIG_FILE = "config.json"


def create_default_config() -> Dict[str, Any]:
    """Create default configuration."""
    default_config = {
        "_schema_version": "1.0",
        "_description": "Telegram File Scanner Configuration",
        "_last_updated": "2025-07-29",
        "telegram": {
            "api_id": "",
            "api_hash": "",
            "phone_number": "",
            "session_name": "session",
            "connection_timeout": 30,
            "request_timeout": 60,
            "retry_attempts": 3,
            "retry_delay": 5,
            "flood_sleep_threshold": 60
        },
        "output": {
            "directory": "output",
            "create_subdirs": True,
            "timestamp_folders": False,
            "backup_existing": True,
            "formats": {
                "csv": {
                    "enabled": True,
                    "filename": "telegram_files.csv",
                    "encoding": "utf-8-sig",
                    "delimiter": ","
                },
                "json": {
                    "enabled": True,
                    "filename": "telegram_files.json",
                    "encoding": "utf-8",
                    "indent": 2
                },
                "excel": {
                    "enabled": True,
                    "filename": "telegram_files.xlsx",
                    "sheet_name": "Telegram Files"
                },
                "simple_json": {
                    "enabled": False,
                    "filename": "simple_files.json"
                }
            }
        },
        "logging": {
            "enabled": True,
            "level": "INFO",
            "detailed_steps": True,
            "log_api_calls": True,
            "log_file_operations": True,
            "separate_files": {
                "enabled": True,
                "scanner_log": "logs/scanner.log",
                "config_log": "logs/config.log",
                "api_log": "logs/api.log",
                "files_log": "logs/files.log",
                "errors_log": "logs/errors.log"
            }
        }
    }
    
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2, ensure_ascii=False)
        logger.info(f"Created default configuration file: {CONFIG_FILE}")
        return default_config
    except Exception as e:
        logger.error(f"Error creating default configuration: {e}")
        return default_config


def load_config() -> Dict[str, Any]:
    """Load configuration from config.json."""
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
        logger.info(f"Loaded configuration from {CONFIG_FILE}")
        return config
    except FileNotFoundError:
        logger.warning(f"{CONFIG_FILE} not found, creating default configuration")
        return create_default_config()
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing {CONFIG_FILE}: {e}")
        return create_default_config()
    except Exception as e:
        logger.error(f"Error loading {CONFIG_FILE}: {e}")
        return create_default_config()


def save_config(config: Dict[str, Any]) -> bool:
    """Save configuration to config.json."""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved configuration to {CONFIG_FILE}")
        return True
    except Exception as e:
        logger.error(f"Error saving {CONFIG_FILE}: {e}")
        return False


def validate_configuration() -> bool:
    """Validate configuration."""
    config = load_config()
    
    # Check if Telegram API credentials are set
    telegram = config.get('telegram', {})
    api_id = telegram.get('api_id', '')
    api_hash = telegram.get('api_hash', '')
    phone_number = telegram.get('phone_number', '')
    
    if not api_id or not api_hash or not phone_number:
        logger.warning("Missing Telegram API credentials")
        return False
    
    # Basic validation passed
    return True


def sync_env_to_config() -> bool:
    """Sync environment variables to config.json."""
    config = load_config()
    
    # Get values from environment
    api_id = os.getenv('TELEGRAM_API_ID')
    api_hash = os.getenv('TELEGRAM_API_HASH')
    phone = os.getenv('TELEGRAM_PHONE')
    
    # Update config if environment variables are set
    if api_id:
        config.setdefault('telegram', {})['api_id'] = api_id
    if api_hash:
        config.setdefault('telegram', {})['api_hash'] = api_hash
    if phone:
        config.setdefault('telegram', {})['phone_number'] = phone
    
    # Save updated config
    return save_config(config)