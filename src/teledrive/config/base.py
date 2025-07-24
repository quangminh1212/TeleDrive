"""
Base Configuration

This module provides the base configuration class for TeleDrive.
All other environment-specific configurations inherit from this.
"""

import os
import secrets
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class BaseConfig:
    """
    Base configuration class for TeleDrive.
    Contains common settings for all environments.
    """
    # Flask settings
    SECRET_KEY: str = field(default_factory=lambda: os.getenv('SECRET_KEY', secrets.token_hex(32)))
    DEBUG: bool = False
    TESTING: bool = False
    DEV_MODE: bool = False
    
    # Database settings
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_DATABASE_URI: str = field(default_factory=lambda: _get_database_uri())
    
    # App settings
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024  # 16 MB
    UPLOAD_FOLDER: str = field(default_factory=lambda: str(Path('uploads').absolute()))
    ALLOWED_EXTENSIONS: tuple = ('txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mp3', 'doc', 'docx')
    
    # Session settings
    SESSION_TYPE: str = 'filesystem'
    SESSION_PERMANENT: bool = True
    PERMANENT_SESSION_LIFETIME: int = 3600  # 1 hour
    
    # CORS settings
    CORS_ENABLED: bool = True
    CORS_ORIGINS: list = field(default_factory=lambda: ['*'])
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert configuration to a dictionary.
        
        Returns:
            Dict[str, Any]: Dictionary representation of the configuration
        """
        result = {}
        for key in dir(self):
            if not key.startswith('_') and not callable(getattr(self, key)):
                result[key] = getattr(self, key)
        return result
    
    def get_flask_config(self) -> Dict[str, Any]:
        """
        Get Flask-specific configuration.
        
        Returns:
            Dict[str, Any]: Dictionary with Flask configuration
        """
        # Lọc các thuộc tính phù hợp với cấu hình Flask
        flask_config = {}
        config_dict = self.to_dict()
        
        # Thuộc tính Flask thường viết hoa
        for key, value in config_dict.items():
            if key.isupper():
                flask_config[key] = value
                
        return flask_config
    
    def validate(self) -> None:
        """
        Validate configuration.
        
        Raises:
            ValueError: If configuration is invalid
        """
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY is not set")
        
        if not self.SQLALCHEMY_DATABASE_URI:
            raise ValueError("SQLALCHEMY_DATABASE_URI is not set")


def _get_database_uri() -> str:
    """
    Get database URI with proper path handling.
    
    Returns:
        str: Database URI
    """
    # Lấy đường dẫn từ environment variable hoặc tạo default
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        return db_url

    # Tạo đường dẫn absolute cho database
    instance_dir = Path('instance')
    instance_dir.mkdir(exist_ok=True)
    db_path = instance_dir / 'teledrive.db'

    return f'sqlite:///{db_path.resolve()}' 