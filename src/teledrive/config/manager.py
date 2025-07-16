"""
Configuration Manager for TeleDrive

Handles loading, validation, and management of configuration files
with support for environment variables and multiple config sources.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, Union
from datetime import datetime

from pydantic import ValidationError
from .models import TeleDriveConfig, TelegramConfig


class ConfigManager:
    """Configuration manager with validation and environment support"""
    
    def __init__(self, config_path: Optional[Union[str, Path]] = None):
        """
        Initialize configuration manager
        
        Args:
            config_path: Path to configuration file (default: config.json)
        """
        self.config_path = Path(config_path or "config.json")
        self.config: Optional[TeleDriveConfig] = None
        self._env_prefix = "TELEDRIVE_"
        
    def load_config(self) -> TeleDriveConfig:
        """
        Load and validate configuration from file and environment
        
        Returns:
            TeleDriveConfig: Validated configuration object
            
        Raises:
            FileNotFoundError: If config file doesn't exist
            ValidationError: If configuration is invalid
            json.JSONDecodeError: If JSON is malformed
        """
        if not self.config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {self.config_path}")
            
        # Load from JSON file
        with open(self.config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
            
        # Override with environment variables
        config_data = self._apply_env_overrides(config_data)
        
        # Validate and create config object
        try:
            self.config = TeleDriveConfig(**config_data)
            return self.config
        except ValidationError as e:
            raise ValidationError(f"Configuration validation failed: {e}")
            
    def save_config(self, config: Optional[TeleDriveConfig] = None) -> None:
        """
        Save configuration to file
        
        Args:
            config: Configuration to save (uses current config if None)
        """
        if config is None:
            config = self.config
            
        if config is None:
            raise ValueError("No configuration to save")
            
        # Update timestamp
        config._last_updated = datetime.now().isoformat()
        
        # Convert to dict and save
        config_dict = config.dict()
        
        # Ensure directory exists
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(config_dict, f, indent=2, ensure_ascii=False)
            
    def get_config(self) -> TeleDriveConfig:
        """
        Get current configuration, loading if necessary
        
        Returns:
            TeleDriveConfig: Current configuration
        """
        if self.config is None:
            self.config = self.load_config()
        return self.config
        
    def reload_config(self) -> TeleDriveConfig:
        """
        Reload configuration from file
        
        Returns:
            TeleDriveConfig: Reloaded configuration
        """
        self.config = None
        return self.load_config()
        
    def update_config(self, updates: Dict[str, Any]) -> TeleDriveConfig:
        """
        Update configuration with new values
        
        Args:
            updates: Dictionary of updates to apply
            
        Returns:
            TeleDriveConfig: Updated configuration
        """
        if self.config is None:
            self.config = self.load_config()
            
        # Apply updates
        config_dict = self.config.dict()
        config_dict = self._deep_update(config_dict, updates)
        
        # Validate updated config
        self.config = TeleDriveConfig(**config_dict)
        
        return self.config
        
    def _apply_env_overrides(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply environment variable overrides to configuration
        
        Args:
            config_data: Original configuration data
            
        Returns:
            Dict: Configuration with environment overrides applied
        """
        # Common environment variable mappings
        env_mappings = {
            f"{self._env_prefix}API_ID": ["telegram", "api_id"],
            f"{self._env_prefix}API_HASH": ["telegram", "api_hash"],
            f"{self._env_prefix}PHONE_NUMBER": ["telegram", "phone_number"],
            f"{self._env_prefix}SESSION_NAME": ["telegram", "session_name"],
            f"{self._env_prefix}OUTPUT_DIR": ["output", "directory"],
            f"{self._env_prefix}LOG_LEVEL": ["logging", "level"],
            f"{self._env_prefix}MAX_MESSAGES": ["scanning", "max_messages"],
        }
        
        for env_var, config_path in env_mappings.items():
            env_value = os.getenv(env_var)
            if env_value is not None:
                # Navigate to the correct nested location
                current = config_data
                for key in config_path[:-1]:
                    if key not in current:
                        current[key] = {}
                    current = current[key]
                    
                # Set the value, converting types as needed
                final_key = config_path[-1]
                if final_key == "max_messages" and env_value.isdigit():
                    current[final_key] = int(env_value)
                else:
                    current[final_key] = env_value
                    
        return config_data
        
    def _deep_update(self, base_dict: Dict[str, Any], update_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deep update dictionary with another dictionary
        
        Args:
            base_dict: Base dictionary to update
            update_dict: Updates to apply
            
        Returns:
            Dict: Updated dictionary
        """
        for key, value in update_dict.items():
            if key in base_dict and isinstance(base_dict[key], dict) and isinstance(value, dict):
                base_dict[key] = self._deep_update(base_dict[key], value)
            else:
                base_dict[key] = value
        return base_dict
        
    def validate_telegram_config(self) -> bool:
        """
        Validate Telegram configuration specifically
        
        Returns:
            bool: True if valid, False otherwise
        """
        try:
            config = self.get_config()
            
            # Check required fields
            if not config.telegram.api_id or config.telegram.api_id == "YOUR_API_ID":
                return False
                
            if not config.telegram.api_hash or config.telegram.api_hash == "YOUR_API_HASH":
                return False
                
            if not config.telegram.phone_number or not config.telegram.phone_number.startswith('+'):
                return False
                
            return True
            
        except (ValidationError, FileNotFoundError):
            return False
            
    def get_telegram_config(self) -> TelegramConfig:
        """
        Get Telegram configuration specifically
        
        Returns:
            TelegramConfig: Telegram configuration
        """
        config = self.get_config()
        return config.telegram
        
    def create_default_config(self, output_path: Optional[Path] = None) -> None:
        """
        Create a default configuration file
        
        Args:
            output_path: Path to save default config (uses self.config_path if None)
        """
        if output_path is None:
            output_path = self.config_path
            
        # Create default config with placeholder values
        default_config = TeleDriveConfig(
            telegram=TelegramConfig(
                api_id="YOUR_API_ID",
                api_hash="YOUR_API_HASH", 
                phone_number="+84XXXXXXXXX"
            )
        )
        
        # Save to file
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(default_config.dict(), f, indent=2, ensure_ascii=False)
            
    def __str__(self) -> str:
        """String representation"""
        return f"ConfigManager(config_path={self.config_path})"
        
    def __repr__(self) -> str:
        """Detailed string representation"""
        return f"ConfigManager(config_path={self.config_path}, loaded={self.config is not None})"


# Global config manager instance
_config_manager: Optional[ConfigManager] = None


def get_config_manager(config_path: Optional[Union[str, Path]] = None) -> ConfigManager:
    """
    Get global configuration manager instance
    
    Args:
        config_path: Path to configuration file
        
    Returns:
        ConfigManager: Global configuration manager
    """
    global _config_manager
    
    if _config_manager is None or config_path is not None:
        _config_manager = ConfigManager(config_path)
        
    return _config_manager


def get_config() -> TeleDriveConfig:
    """
    Get current configuration using global manager
    
    Returns:
        TeleDriveConfig: Current configuration
    """
    return get_config_manager().get_config()
