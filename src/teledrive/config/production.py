"""
Production Configuration

This module provides the production configuration for TeleDrive.
"""

import os
import secrets
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from urllib.parse import urlparse

from .base import BaseConfig


@dataclass
class ProductionConfig(BaseConfig):
    """
    Production configuration class for TeleDrive.
    Includes hardened settings suitable for production deployment.
    """
    # Flask settings
    DEBUG: bool = False
    TESTING: bool = False
    DEV_MODE: bool = False
    
    # Production environment
    ENV: str = 'production'
    
    # Security settings
    PREFERRED_URL_SCHEME: str = 'https'
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = 'Lax'
    PERMANENT_SESSION_LIFETIME: int = int(os.getenv('SESSION_TIMEOUT', '86400'))  # 24 hours
    
    # Rate limiting
    RATELIMIT_ENABLED: bool = True
    RATELIMIT_HEADERS_ENABLED: bool = True
    RATELIMIT_STORAGE_URL: str = os.getenv('REDIS_URL', 'memory://')
    RATELIMIT_DEFAULT: str = os.getenv('RATE_LIMIT', '200 per hour;10 per second')
    
    # CORS settings
    CORS_ORIGINS: list = field(default_factory=lambda: [
        os.getenv('ALLOWED_ORIGIN', 'https://yourdomain.com')
    ])
    
    # CSRF protection
    WTF_CSRF_ENABLED: bool = True
    WTF_CSRF_TIME_LIMIT: int = 3600
    
    # Server settings
    SERVER_NAME: str = field(default_factory=lambda: os.getenv('SERVER_NAME', ''))
    
    # Database pool settings
    SQLALCHEMY_ENGINE_OPTIONS: Dict[str, Any] = field(default_factory=lambda: {
        'pool_size': int(os.getenv('DB_POOL_SIZE', '10')),
        'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', '30')),
        'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', '3600')),
        'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '20')),
    })
    
    # Telegram API settings
    TELEGRAM_API_ID: str = field(default_factory=lambda: os.getenv('TELEGRAM_API_ID', ''))
    TELEGRAM_API_HASH: str = field(default_factory=lambda: os.getenv('TELEGRAM_API_HASH', ''))
    TELEGRAM_PHONE: str = field(default_factory=lambda: os.getenv('TELEGRAM_PHONE', ''))
    TELEGRAM_SESSION_NAME: str = field(default_factory=lambda: os.getenv('TELEGRAM_SESSION_NAME', 'telegram_session'))
    TELEGRAM_CONNECTION_TIMEOUT: int = field(default_factory=lambda: int(os.getenv('TELEGRAM_CONNECTION_TIMEOUT', '30')))
    TELEGRAM_REQUEST_TIMEOUT: int = field(default_factory=lambda: int(os.getenv('TELEGRAM_REQUEST_TIMEOUT', '60')))
    
    def validate(self) -> None:
        """
        Validate production configuration.
        
        Raises:
            ValueError: If required environment variables are missing
        """
        super().validate()
        
        # Validate required Telegram settings
        if not self.TELEGRAM_API_ID:
            raise ValueError("TELEGRAM_API_ID is required")
        if not self.TELEGRAM_API_HASH:
            raise ValueError("TELEGRAM_API_HASH is required")
        if not self.TELEGRAM_PHONE:
            raise ValueError("TELEGRAM_PHONE is required")
        
        # Validate secret key
        if self.SECRET_KEY == secrets.token_hex(32):
            print("⚠️  WARNING: Using auto-generated SECRET_KEY in production is not secure!")
            print("⚠️  Set SECRET_KEY environment variable for production!")


