"""
Legacy configuration bridge for backward compatibility

This module provides backward compatibility with the old config.py
while using the new Pydantic-based configuration system.
"""

import os
from typing import Any, Dict, Optional
from pathlib import Path

from .manager import get_config_manager, ConfigManager
from .models import TeleDriveConfig


class LegacyConfigBridge:
    """Bridge class to provide backward compatibility with old config.py"""
    
    def __init__(self, config_file: str = 'config.json'):
        """
        Initialize legacy config bridge
        
        Args:
            config_file: Path to configuration file
        """
        self.config_manager = ConfigManager(config_file)
        self._config: Optional[TeleDriveConfig] = None
        
    def _get_config(self) -> TeleDriveConfig:
        """Get configuration, loading if necessary"""
        if self._config is None:
            self._config = self.config_manager.get_config()
        return self._config
        
    # Legacy property accessors for backward compatibility
    @property
    def API_ID(self) -> str:
        """Legacy API_ID property"""
        return self._get_config().telegram.api_id
        
    @property
    def API_HASH(self) -> str:
        """Legacy API_HASH property"""
        return self._get_config().telegram.api_hash
        
    @property
    def PHONE_NUMBER(self) -> str:
        """Legacy PHONE_NUMBER property"""
        return self._get_config().telegram.phone_number
        
    @property
    def SESSION_NAME(self) -> str:
        """Legacy SESSION_NAME property"""
        return self._get_config().telegram.session_name
        
    @property
    def OUTPUT_DIR(self) -> str:
        """Legacy OUTPUT_DIR property"""
        return self._get_config().output.directory
        
    @property
    def MAX_MESSAGES(self) -> Optional[int]:
        """Legacy MAX_MESSAGES property"""
        return self._get_config().scanning.max_messages
        
    @property
    def BATCH_SIZE(self) -> int:
        """Legacy BATCH_SIZE property"""
        return self._get_config().scanning.batch_size
        
    @property
    def CONNECTION_TIMEOUT(self) -> int:
        """Legacy CONNECTION_TIMEOUT property"""
        return self._get_config().telegram.connection_timeout
        
    @property
    def REQUEST_TIMEOUT(self) -> int:
        """Legacy REQUEST_TIMEOUT property"""
        return self._get_config().telegram.request_timeout
        
    @property
    def RETRY_ATTEMPTS(self) -> int:
        """Legacy RETRY_ATTEMPTS property"""
        return self._get_config().telegram.retry_attempts
        
    @property
    def RETRY_DELAY(self) -> int:
        """Legacy RETRY_DELAY property"""
        return self._get_config().telegram.retry_delay
        
    @property
    def FLOOD_SLEEP_THRESHOLD(self) -> int:
        """Legacy FLOOD_SLEEP_THRESHOLD property"""
        return self._get_config().telegram.flood_sleep_threshold
        
    @property
    def CONFIG(self) -> Dict[str, Any]:
        """Legacy CONFIG dictionary property"""
        return self._get_config().dict()
        
    def get_file_types_config(self) -> Dict[str, bool]:
        """Get file types configuration as dictionary"""
        return self._get_config().scanning.file_types.dict()
        
    def get_output_formats(self) -> Dict[str, Any]:
        """Get output formats configuration"""
        output_config = self._get_config().output
        return {
            'csv': output_config.csv.dict(),
            'json': output_config.json.dict(),
            'excel': output_config.excel.dict(),
            'simple_json': output_config.simple_json.dict()
        }
        
    def validate_config(self) -> bool:
        """Validate configuration"""
        return self.config_manager.validate_telegram_config()
        
    def reload_config(self) -> None:
        """Reload configuration from file"""
        self._config = None
        self.config_manager.reload_config()


# Create global instance for backward compatibility
_legacy_config = LegacyConfigBridge()

# Export legacy properties at module level
API_ID = _legacy_config.API_ID
API_HASH = _legacy_config.API_HASH
PHONE_NUMBER = _legacy_config.PHONE_NUMBER
SESSION_NAME = _legacy_config.SESSION_NAME
OUTPUT_DIR = _legacy_config.OUTPUT_DIR
MAX_MESSAGES = _legacy_config.MAX_MESSAGES
BATCH_SIZE = _legacy_config.BATCH_SIZE
CONNECTION_TIMEOUT = _legacy_config.CONNECTION_TIMEOUT
REQUEST_TIMEOUT = _legacy_config.REQUEST_TIMEOUT
RETRY_ATTEMPTS = _legacy_config.RETRY_ATTEMPTS
RETRY_DELAY = _legacy_config.RETRY_DELAY
FLOOD_SLEEP_THRESHOLD = _legacy_config.FLOOD_SLEEP_THRESHOLD
CONFIG = _legacy_config.CONFIG

# Export functions for backward compatibility
def get_file_types_config():
    """Get file types configuration (legacy function)"""
    return _legacy_config.get_file_types_config()

def get_output_formats():
    """Get output formats configuration (legacy function)"""
    return _legacy_config.get_output_formats()

def validate_config():
    """Validate configuration (legacy function)"""
    return _legacy_config.validate_config()

def reload_config():
    """Reload configuration (legacy function)"""
    return _legacy_config.reload_config()


# Environment variable support for legacy compatibility
def _get_env_or_config(env_var: str, config_value: Any, default: Any = None) -> Any:
    """Get value from environment variable or config, with fallback to default"""
    env_value = os.getenv(env_var)
    if env_value is not None:
        return env_value
    return config_value if config_value is not None else default


# Override with environment variables if present
if os.getenv('TELEDRIVE_API_ID'):
    API_ID = os.getenv('TELEDRIVE_API_ID')
if os.getenv('TELEDRIVE_API_HASH'):
    API_HASH = os.getenv('TELEDRIVE_API_HASH')
if os.getenv('TELEDRIVE_PHONE_NUMBER'):
    PHONE_NUMBER = os.getenv('TELEDRIVE_PHONE_NUMBER')
if os.getenv('TELEDRIVE_OUTPUT_DIR'):
    OUTPUT_DIR = os.getenv('TELEDRIVE_OUTPUT_DIR')
if os.getenv('TELEDRIVE_MAX_MESSAGES'):
    try:
        MAX_MESSAGES = int(os.getenv('TELEDRIVE_MAX_MESSAGES'))
    except (ValueError, TypeError):
        pass
