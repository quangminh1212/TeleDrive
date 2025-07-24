#!/usr/bin/env python3
"""
Configuration utilities for TeleDrive application.

This module provides configuration management for the application,
including loading from environment variables, files, and command line arguments.
"""

import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from dotenv import load_dotenv


class ConfigError(Exception):
    """Configuration error exception."""
    pass


@dataclass
class TelegramConfig:
    """Telegram API configuration."""
    api_id: str = ""
    api_hash: str = ""
    phone_number: str = ""
    session_name: str = "teledrive_session"


@dataclass
class DatabaseConfig:
    """Database configuration."""
    uri: str = "sqlite:///instance/teledrive.db"
    echo: bool = False
    track_modifications: bool = False


@dataclass
class SecurityConfig:
    """Security configuration."""
    secret_key: str = "change-this-in-production"
    otp_expiry_minutes: int = 10
    max_failed_attempts: int = 5
    lockout_minutes: int = 30


@dataclass
class WebConfig:
    """Web interface configuration."""
    host: str = "0.0.0.0"
    port: int = 3000
    debug: bool = False
    template_folder: str = "templates"
    static_folder: str = "static"


@dataclass
class ScanningConfig:
    """File scanning configuration."""
    max_messages: int = 1000
    file_types: List[str] = field(default_factory=lambda: ["document", "photo", "video", "audio"])
    excluded_mimetypes: List[str] = field(default_factory=list)


@dataclass
class OutputConfig:
    """Output configuration."""
    directory: str = "output"
    download_path: str = "downloads"
    formats: List[str] = field(default_factory=lambda: ["json", "csv", "excel"])


@dataclass
class ChannelConfig:
    """Channel configuration."""
    default_channel: str = "me"
    saved_channels: List[str] = field(default_factory=list)


@dataclass
class LoggingConfig:
    """Logging configuration."""
    level: str = "INFO"
    directory: str = "logs"
    max_size_mb: int = 5
    backup_count: int = 3


@dataclass
class Config:
    """Application configuration."""
    telegram: TelegramConfig = field(default_factory=TelegramConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    web: WebConfig = field(default_factory=WebConfig)
    scanning: ScanningConfig = field(default_factory=ScanningConfig)
    output: OutputConfig = field(default_factory=OutputConfig)
    channels: ChannelConfig = field(default_factory=ChannelConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    
    def __post_init__(self):
        """Load configuration from environment and files."""
        self._load_from_env()
        self._load_from_files()
    
    def _load_from_env(self):
        """Load configuration from environment variables."""
        # Load .env file if exists
        load_dotenv()
        
        # Telegram configuration
        if api_id := os.environ.get("TELEGRAM_API_ID"):
            self.telegram.api_id = api_id
        
        if api_hash := os.environ.get("TELEGRAM_API_HASH"):
            self.telegram.api_hash = api_hash
        
        if phone := os.environ.get("TELEGRAM_PHONE"):
            self.telegram.phone_number = phone
        
        if session := os.environ.get("TELEGRAM_SESSION"):
            self.telegram.session_name = session
        
        # Database configuration
        if db_uri := os.environ.get("DATABASE_URI"):
            self.database.uri = db_uri
        
        # Security configuration
        if secret := os.environ.get("SECRET_KEY"):
            self.security.secret_key = secret
        
        # Web configuration
        if host := os.environ.get("WEB_HOST"):
            self.web.host = host
        
        if port := os.environ.get("WEB_PORT"):
            try:
                self.web.port = int(port)
            except ValueError:
                pass
        
        if debug := os.environ.get("DEBUG"):
            self.web.debug = debug.lower() in ("true", "1", "yes")
        
        # Developer mode
        if dev_mode := os.environ.get("DEV_MODE"):
            self.web.debug = dev_mode.lower() in ("true", "1", "yes")
    
    def _load_from_files(self):
        """Load configuration from files."""
        # Config file paths to check
        config_paths = [
            "config/config.json",
            "config/config.local.json",  # Local overrides
        ]
        
        for config_path in config_paths:
            try:
                if os.path.exists(config_path):
                    with open(config_path, "r", encoding="utf-8") as f:
                        config_data = json.load(f)
                        self._update_from_dict(config_data)
            except Exception as e:
                print(f"Error loading config from {config_path}: {e}")
    
    def _update_from_dict(self, config_data: Dict[str, Any]):
        """Update configuration from dictionary."""
        # Update telegram config
        if telegram := config_data.get("telegram"):
            for key, value in telegram.items():
                if hasattr(self.telegram, key):
                    setattr(self.telegram, key, value)
        
        # Update database config
        if database := config_data.get("database"):
            for key, value in database.items():
                if hasattr(self.database, key):
                    setattr(self.database, key, value)
        
        # Update security config
        if security := config_data.get("security"):
            for key, value in security.items():
                if hasattr(self.security, key):
                    setattr(self.security, key, value)
        
        # Update web config
        if web := config_data.get("web"):
            for key, value in web.items():
                if hasattr(self.web, key):
                    setattr(self.web, key, value)
        
        # Update scanning config
        if scanning := config_data.get("scanning"):
            for key, value in scanning.items():
                if hasattr(self.scanning, key):
                    setattr(self.scanning, key, value)
        
        # Update output config
        if output := config_data.get("output"):
            for key, value in output.items():
                if hasattr(self.output, key):
                    setattr(self.output, key, value)
        
        # Update channel config
        if channels := config_data.get("channels"):
            for key, value in channels.items():
                if hasattr(self.channels, key):
                    setattr(self.channels, key, value)
        
        # Update logging config
        if logging_config := config_data.get("logging"):
            for key, value in logging_config.items():
                if hasattr(self.logging, key):
                    setattr(self.logging, key, value)
    
    def get_flask_config(self) -> Dict[str, Any]:
        """Get Flask configuration dictionary."""
        return {
            "SECRET_KEY": self.security.secret_key,
            "SQLALCHEMY_DATABASE_URI": self.database.uri,
            "SQLALCHEMY_TRACK_MODIFICATIONS": self.database.track_modifications,
            "SQLALCHEMY_ECHO": self.database.echo,
            "TEMPLATE_FOLDER": self.web.template_folder,
            "STATIC_FOLDER": self.web.static_folder,
            "DEBUG": self.web.debug
        }
    
    def save_to_file(self, filename: str = "config/config.local.json") -> bool:
        """Save configuration to file."""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            
            # Convert to dictionary
            config_dict = {
                "telegram": {
                    "api_id": self.telegram.api_id,
                    "api_hash": self.telegram.api_hash,
                    "phone_number": self.telegram.phone_number,
                    "session_name": self.telegram.session_name
                },
                "database": {
                    "uri": self.database.uri,
                    "echo": self.database.echo,
                    "track_modifications": self.database.track_modifications
                },
                "security": {
                    "otp_expiry_minutes": self.security.otp_expiry_minutes,
                    "max_failed_attempts": self.security.max_failed_attempts,
                    "lockout_minutes": self.security.lockout_minutes
                },
                "web": {
                    "host": self.web.host,
                    "port": self.web.port,
                    "debug": self.web.debug
                },
                "scanning": {
                    "max_messages": self.scanning.max_messages,
                    "file_types": self.scanning.file_types,
                    "excluded_mimetypes": self.scanning.excluded_mimetypes
                },
                "output": {
                    "directory": self.output.directory,
                    "download_path": self.output.download_path,
                    "formats": self.output.formats
                },
                "channels": {
                    "default_channel": self.channels.default_channel,
                    "saved_channels": self.channels.saved_channels
                },
                "logging": {
                    "level": self.logging.level,
                    "directory": self.logging.directory,
                    "max_size_mb": self.logging.max_size_mb,
                    "backup_count": self.logging.backup_count
                }
            }
            
            # Write to file
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(config_dict, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving config to {filename}: {e}")
            return False


# Global configuration instance
config = Config()


def validate_environment() -> bool:
    """Validate environment configuration."""
    # Validate critical configuration
    if not config.telegram.api_id or not config.telegram.api_hash:
        raise ValueError("Missing Telegram API credentials.")
    
    # Create necessary directories
    for directory in [
        config.output.directory,
        config.output.download_path,
        config.logging.directory,
        "instance"
    ]:
        os.makedirs(directory, exist_ok=True)
    
    return True


def get_config() -> Config:
    """Get the global configuration instance."""
    return config 