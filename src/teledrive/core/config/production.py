#!/usr/bin/env python3
"""
Production Configuration for TeleDrive.

This module provides production configuration settings with environment variables support.
"""

import os
import secrets
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlparse

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def _get_database_uri() -> str:
    """
    Get database URI with proper path handling.
    
    Returns:
        Database URI string
    """
    # Get path from environment variable or use default
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return db_url

    # Create absolute path for database
    instance_dir = Path("instance")
    instance_dir.mkdir(exist_ok=True)
    db_path = instance_dir / "app.db"

    return f"sqlite:///{db_path.resolve()}"


@dataclass
class DatabaseConfig:
    """Database configuration settings."""
    uri: str = field(default_factory=_get_database_uri)
    pool_size: int = field(default_factory=lambda: int(os.getenv("DB_POOL_SIZE", "10")))
    pool_timeout: int = field(default_factory=lambda: int(os.getenv("DB_POOL_TIMEOUT", "30")))
    pool_recycle: int = field(default_factory=lambda: int(os.getenv("DB_POOL_RECYCLE", "3600")))
    echo: bool = field(default_factory=lambda: os.getenv("DB_ECHO", "false").lower() == "true")
    track_modifications: bool = False
    
    def __post_init__(self) -> None:
        """Validate database configuration."""
        if not self.uri:
            raise ValueError("DATABASE_URL is required")
        
        # Parse database URL to validate
        parsed = urlparse(self.uri)
        if not parsed.scheme:
            raise ValueError("Invalid DATABASE_URL format")


@dataclass
class RedisConfig:
    """Redis configuration for caching."""
    url: str = field(default_factory=lambda: os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    password: Optional[str] = field(default_factory=lambda: os.getenv("REDIS_PASSWORD"))
    max_connections: int = field(default_factory=lambda: int(os.getenv("REDIS_MAX_CONNECTIONS", "20")))
    socket_timeout: int = field(default_factory=lambda: int(os.getenv("REDIS_SOCKET_TIMEOUT", "5")))
    enabled: bool = field(default_factory=lambda: os.getenv("REDIS_ENABLED", "false").lower() == "true")


@dataclass
class SecurityConfig:
    """Security configuration settings."""
    secret_key: str = field(default_factory=lambda: os.getenv("SECRET_KEY", ""))
    session_timeout: int = field(default_factory=lambda: int(os.getenv("SESSION_TIMEOUT", "3600")))
    max_login_attempts: int = field(default_factory=lambda: int(os.getenv("MAX_LOGIN_ATTEMPTS", "5")))
    lockout_duration: int = field(default_factory=lambda: int(os.getenv("LOCKOUT_DURATION", "900")))
    csrf_enabled: bool = field(default_factory=lambda: os.getenv("CSRF_ENABLED", "true").lower() == "true")
    rate_limit_enabled: bool = field(default_factory=lambda: os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true")
    rate_limit_per_minute: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")))
    otp_expiry_minutes: int = field(default_factory=lambda: int(os.getenv("OTP_EXPIRY_MINUTES", "10")))
    
    def __post_init__(self) -> None:
        """Generate secure secret key if not provided."""
        if not self.secret_key:
            self.secret_key = secrets.token_hex(32)
            print("⚠️  WARNING: Generated new SECRET_KEY. Set SECRET_KEY environment variable for production!")


@dataclass
class LoggingConfig:
    """Logging configuration settings."""
    level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    format: str = field(default_factory=lambda: os.getenv("LOG_FORMAT", "json"))
    file_path: str = field(default_factory=lambda: os.getenv("LOG_FILE", "logs/teledrive.log"))
    max_bytes: int = field(default_factory=lambda: int(os.getenv("LOG_MAX_BYTES", "10485760")))  # 10MB
    backup_count: int = field(default_factory=lambda: int(os.getenv("LOG_BACKUP_COUNT", "5")))
    enable_console: bool = field(default_factory=lambda: os.getenv("LOG_CONSOLE", "true").lower() == "true")
    directory: str = "logs"


@dataclass
class TelegramConfig:
    """Telegram API configuration settings."""
    api_id: str = field(default_factory=lambda: os.getenv("TELEGRAM_API_ID", ""))
    api_hash: str = field(default_factory=lambda: os.getenv("TELEGRAM_API_HASH", ""))
    phone_number: str = field(default_factory=lambda: os.getenv("TELEGRAM_PHONE", ""))
    session_name: str = field(default_factory=lambda: os.getenv("TELEGRAM_SESSION_NAME", "telegram_scanner_session"))
    connection_timeout: int = field(default_factory=lambda: int(os.getenv("TELEGRAM_CONNECTION_TIMEOUT", "30")))
    request_timeout: int = field(default_factory=lambda: int(os.getenv("TELEGRAM_REQUEST_TIMEOUT", "60")))
    
    def __post_init__(self) -> None:
        """Validate Telegram configuration."""
        if not self.api_id:
            raise ValueError("TELEGRAM_API_ID is required")
        if not self.api_hash:
            raise ValueError("TELEGRAM_API_HASH is required")
        if not self.phone_number:
            raise ValueError("TELEGRAM_PHONE is required")


@dataclass
class ServerConfig:
    """Server configuration settings."""
    host: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("PORT", "3000")))
    workers: int = field(default_factory=lambda: int(os.getenv("WORKERS", "4")))
    worker_class: str = field(default_factory=lambda: os.getenv("WORKER_CLASS", "sync"))
    timeout: int = field(default_factory=lambda: int(os.getenv("TIMEOUT", "30")))
    keepalive: int = field(default_factory=lambda: int(os.getenv("KEEPALIVE", "2")))
    max_requests: int = field(default_factory=lambda: int(os.getenv("MAX_REQUESTS", "1000")))
    max_requests_jitter: int = field(default_factory=lambda: int(os.getenv("MAX_REQUESTS_JITTER", "100")))


@dataclass
class ScanningConfig:
    """File scanning configuration."""
    max_messages: int = field(default_factory=lambda: int(os.getenv("SCAN_MAX_MESSAGES", "1000")))
    file_types: List[str] = field(default_factory=lambda: ["document", "photo", "video", "audio"])
    excluded_mimetypes: List[str] = field(default_factory=list)


@dataclass
class OutputConfig:
    """Output configuration."""
    directory: str = field(default_factory=lambda: os.getenv("OUTPUT_DIR", "output"))
    download_path: str = field(default_factory=lambda: os.getenv("DOWNLOAD_DIR", "downloads"))
    formats: List[str] = field(default_factory=lambda: ["json", "csv", "excel"])


@dataclass
class ChannelConfig:
    """Channel configuration."""
    default_channel: str = field(default_factory=lambda: os.getenv("DEFAULT_CHANNEL", "me"))
    saved_channels: List[str] = field(default_factory=list)


class ProductionConfig:
    """Main production configuration class."""
    
    def __init__(self):
        """Initialize configuration settings."""
        self.environment = os.getenv("ENVIRONMENT", "production")
        self.debug = os.getenv("DEBUG", "false").lower() == "true"

        # Support for bypassing authentication during development
        self.bypass_auth = os.getenv("BYPASS_AUTH", "false").lower() == "true"

        # Initialize configuration sections
        self.database = DatabaseConfig()
        self.redis = RedisConfig()
        self.security = SecurityConfig()
        self.logging = LoggingConfig()
        self.telegram = TelegramConfig()
        self.server = ServerConfig()
        self.scanning = ScanningConfig()
        self.output = OutputConfig()
        self.channels = ChannelConfig()
        
        # Create necessary directories
        self._create_directories()

        # Validate configuration
        self._validate_config()
    
    def _create_directories(self) -> None:
        """Create necessary directories."""
        for directory in ["logs", "output", "downloads", "instance"]:
            os.makedirs(directory, exist_ok=True)
    
    def _validate_config(self) -> None:
        """Validate overall configuration."""
        if self.environment == "production":
            if self.debug:
                raise ValueError("DEBUG must be False in production")
            
            if self.bypass_auth:
                raise ValueError("BYPASS_AUTH must be False in production")
    
    def get_flask_config(self) -> Dict[str, Any]:
        """
        Get Flask configuration dictionary.
        
        Returns:
            Dictionary with Flask configuration settings
        """
        # Prepare engine options based on database type
        engine_options = {"echo": self.database.echo}

        # Only add pool options for non-SQLite databases
        if not self.database.uri.startswith("sqlite"):
            engine_options.update({
                "pool_size": self.database.pool_size,
                "pool_timeout": self.database.pool_timeout,
                "pool_recycle": self.database.pool_recycle,
            })

        return {
            "DEBUG": self.debug,
            "SECRET_KEY": self.security.secret_key,
            "SQLALCHEMY_DATABASE_URI": self.database.uri,
            "SQLALCHEMY_TRACK_MODIFICATIONS": self.database.track_modifications,
            "SQLALCHEMY_ENGINE_OPTIONS": engine_options,
            "PERMANENT_SESSION_LIFETIME": self.security.session_timeout,
            "WTF_CSRF_ENABLED": self.security.csrf_enabled,
            "RATELIMIT_ENABLED": self.security.rate_limit_enabled,
            "RATELIMIT_DEFAULT": f"{self.security.rate_limit_per_minute} per minute",
            "BYPASS_AUTH": self.bypass_auth,
            "TEMPLATE_FOLDER": "templates",
            "STATIC_FOLDER": "static",
        }
    
    def is_production(self) -> bool:
        """
        Check if running in production environment.
        
        Returns:
            True if in production mode, False otherwise
        """
        return self.environment == "production"
    
    def is_development(self) -> bool:
        """
        Check if running in development environment.
        
        Returns:
            True if in development mode, False otherwise
        """
        return not self.is_production() or self.debug


# Global configuration instance
config = ProductionConfig()


def load_config() -> ProductionConfig:
    """
    Load and return configuration.
    
    Returns:
        ProductionConfig instance
    """
    return config


def validate_environment() -> bool:
    """
    Validate environment variables.
    
    Returns:
        True if environment is valid
        
    Raises:
        ValueError: If required environment variables are missing
    """
    required_vars = [
        "TELEGRAM_API_ID",
        "TELEGRAM_API_HASH", 
        "TELEGRAM_PHONE"
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    if config.is_production():
        production_vars = ["SECRET_KEY"]
        missing_prod_vars = [var for var in production_vars if not os.getenv(var)]
        
        if missing_prod_vars:
            raise ValueError(f"Missing required production environment variables: {', '.join(missing_prod_vars)}")
    
    return True 