#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Production Configuration for TeleDrive
Cấu hình production với environment variables và security
"""

import os
import secrets
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from urllib.parse import urlparse

@dataclass
class DatabaseConfig:
    """Database configuration"""
    uri: str = field(default_factory=lambda: os.getenv('DATABASE_URL', f'sqlite:///{os.path.abspath("instance/teledrive.db")}'))
    pool_size: int = field(default_factory=lambda: int(os.getenv('DB_POOL_SIZE', '10')))
    pool_timeout: int = field(default_factory=lambda: int(os.getenv('DB_POOL_TIMEOUT', '30')))
    pool_recycle: int = field(default_factory=lambda: int(os.getenv('DB_POOL_RECYCLE', '3600')))
    echo: bool = field(default_factory=lambda: os.getenv('DB_ECHO', 'false').lower() == 'true')
    
    def __post_init__(self):
        """Validate database configuration"""
        if not self.uri:
            raise ValueError("DATABASE_URL is required")
        
        # Parse database URL to validate
        parsed = urlparse(self.uri)
        if not parsed.scheme:
            raise ValueError("Invalid DATABASE_URL format")

@dataclass
class RedisConfig:
    """Redis configuration for caching"""
    url: str = field(default_factory=lambda: os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
    password: Optional[str] = field(default_factory=lambda: os.getenv('REDIS_PASSWORD'))
    max_connections: int = field(default_factory=lambda: int(os.getenv('REDIS_MAX_CONNECTIONS', '20')))
    socket_timeout: int = field(default_factory=lambda: int(os.getenv('REDIS_SOCKET_TIMEOUT', '5')))
    enabled: bool = field(default_factory=lambda: os.getenv('REDIS_ENABLED', 'true').lower() == 'true')

@dataclass
class SecurityConfig:
    """Security configuration"""
    secret_key: str = field(default_factory=lambda: os.getenv('SECRET_KEY', ''))
    session_timeout: int = field(default_factory=lambda: int(os.getenv('SESSION_TIMEOUT', '3600')))
    max_login_attempts: int = field(default_factory=lambda: int(os.getenv('MAX_LOGIN_ATTEMPTS', '5')))
    lockout_duration: int = field(default_factory=lambda: int(os.getenv('LOCKOUT_DURATION', '900')))
    csrf_enabled: bool = field(default_factory=lambda: os.getenv('CSRF_ENABLED', 'true').lower() == 'true')
    rate_limit_enabled: bool = field(default_factory=lambda: os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true')
    rate_limit_per_minute: int = field(default_factory=lambda: int(os.getenv('RATE_LIMIT_PER_MINUTE', '60')))
    
    def __post_init__(self):
        """Generate secure secret key if not provided"""
        if not self.secret_key:
            self.secret_key = secrets.token_hex(32)
            print("⚠️  WARNING: Generated new SECRET_KEY. Set SECRET_KEY environment variable for production!")

@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = field(default_factory=lambda: os.getenv('LOG_LEVEL', 'INFO'))
    format: str = field(default_factory=lambda: os.getenv('LOG_FORMAT', 'json'))
    file_path: str = field(default_factory=lambda: os.getenv('LOG_FILE', 'logs/teledrive.log'))
    max_bytes: int = field(default_factory=lambda: int(os.getenv('LOG_MAX_BYTES', '10485760')))  # 10MB
    backup_count: int = field(default_factory=lambda: int(os.getenv('LOG_BACKUP_COUNT', '5')))
    enable_console: bool = field(default_factory=lambda: os.getenv('LOG_CONSOLE', 'true').lower() == 'true')

@dataclass
class TelegramConfig:
    """Telegram API configuration"""
    api_id: str = field(default_factory=lambda: os.getenv('TELEGRAM_API_ID', ''))
    api_hash: str = field(default_factory=lambda: os.getenv('TELEGRAM_API_HASH', ''))
    phone_number: str = field(default_factory=lambda: os.getenv('TELEGRAM_PHONE', ''))
    session_name: str = field(default_factory=lambda: os.getenv('TELEGRAM_SESSION_NAME', 'telegram_scanner_session'))
    connection_timeout: int = field(default_factory=lambda: int(os.getenv('TELEGRAM_CONNECTION_TIMEOUT', '30')))
    request_timeout: int = field(default_factory=lambda: int(os.getenv('TELEGRAM_REQUEST_TIMEOUT', '60')))
    
    def __post_init__(self):
        """Validate Telegram configuration"""
        if not self.api_id:
            raise ValueError("TELEGRAM_API_ID is required")
        if not self.api_hash:
            raise ValueError("TELEGRAM_API_HASH is required")
        if not self.phone_number:
            raise ValueError("TELEGRAM_PHONE is required")

@dataclass
class ServerConfig:
    """Server configuration"""
    host: str = field(default_factory=lambda: os.getenv('HOST', '0.0.0.0'))
    port: int = field(default_factory=lambda: int(os.getenv('PORT', '5000')))
    workers: int = field(default_factory=lambda: int(os.getenv('WORKERS', '4')))
    worker_class: str = field(default_factory=lambda: os.getenv('WORKER_CLASS', 'sync'))
    timeout: int = field(default_factory=lambda: int(os.getenv('TIMEOUT', '30')))
    keepalive: int = field(default_factory=lambda: int(os.getenv('KEEPALIVE', '2')))
    max_requests: int = field(default_factory=lambda: int(os.getenv('MAX_REQUESTS', '1000')))
    max_requests_jitter: int = field(default_factory=lambda: int(os.getenv('MAX_REQUESTS_JITTER', '100')))

class ProductionConfig:
    """Main production configuration class"""
    
    def __init__(self):
        self.environment = os.getenv('ENVIRONMENT', 'development')
        self.debug = os.getenv('DEBUG', 'false').lower() == 'true'
        self.testing = os.getenv('TESTING', 'false').lower() == 'true'
        
        # Initialize configuration sections
        self.database = DatabaseConfig()
        self.redis = RedisConfig()
        self.security = SecurityConfig()
        self.logging = LoggingConfig()
        self.telegram = TelegramConfig()
        self.server = ServerConfig()
        
        # Validate configuration
        self._validate_config()
    
    def _validate_config(self):
        """Validate overall configuration"""
        if self.environment == 'production':
            if self.debug:
                raise ValueError("DEBUG must be False in production")
            if self.security.secret_key == 'teledrive-secret-key-change-in-production':
                raise ValueError("Must set secure SECRET_KEY in production")
    
    def get_flask_config(self) -> Dict[str, Any]:
        """Get Flask configuration dictionary"""
        return {
            'DEBUG': self.debug,
            'TESTING': self.testing,
            'SECRET_KEY': self.security.secret_key,
            'SQLALCHEMY_DATABASE_URI': self.database.uri,
            'SQLALCHEMY_TRACK_MODIFICATIONS': False,
            'SQLALCHEMY_ENGINE_OPTIONS': {
                'pool_size': self.database.pool_size,
                'pool_timeout': self.database.pool_timeout,
                'pool_recycle': self.database.pool_recycle,
                'echo': self.database.echo,
            },
            'PERMANENT_SESSION_LIFETIME': self.security.session_timeout,
            'WTF_CSRF_ENABLED': self.security.csrf_enabled,
            'RATELIMIT_ENABLED': self.security.rate_limit_enabled,
            'RATELIMIT_DEFAULT': f"{self.security.rate_limit_per_minute} per minute",
        }
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == 'production'
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == 'development'

# Global configuration instance
config = ProductionConfig()

def load_config() -> ProductionConfig:
    """Load and return configuration"""
    return config

def validate_environment():
    """Validate environment variables"""
    required_vars = [
        'TELEGRAM_API_ID',
        'TELEGRAM_API_HASH', 
        'TELEGRAM_PHONE'
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    if config.is_production():
        production_vars = ['SECRET_KEY', 'DATABASE_URL']
        missing_prod_vars = [var for var in production_vars if not os.getenv(var)]
        
        if missing_prod_vars:
            raise ValueError(f"Missing required production environment variables: {', '.join(missing_prod_vars)}")

if __name__ == '__main__':
    # Test configuration loading
    try:
        validate_environment()
        print("✅ Configuration loaded successfully")
        print(f"Environment: {config.environment}")
        print(f"Debug: {config.debug}")
        print(f"Database: {config.database.uri}")
        print(f"Redis enabled: {config.redis.enabled}")
    except Exception as e:
        print(f"❌ Configuration error: {e}")
