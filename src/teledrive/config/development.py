"""
Development Configuration

This module provides the development configuration for TeleDrive.
"""

from dataclasses import dataclass, field
from .base import BaseConfig


@dataclass
class DevelopmentConfig(BaseConfig):
    """
    Development configuration class for TeleDrive.
    Includes settings suitable for local development.
    """
    # Flask settings
    DEBUG: bool = True
    DEV_MODE: bool = True
    TESTING: bool = False
    
    # Extra development settings
    ENV: str = 'development'
    TEMPLATES_AUTO_RELOAD: bool = True
    EXPLAIN_TEMPLATE_LOADING: bool = True
    
    # Development database
    SQLALCHEMY_ECHO: bool = True
    
    # Login bypass for development
    DEV_LOGIN_ENABLED: bool = True
    DEV_USER_ID: str = 'dev_user'
    DEV_USERNAME: str = 'Developer'
    DEV_IS_ADMIN: bool = True
    
    def validate(self) -> None:
        """
        Validate development configuration.
        
        Note: Most validations are relaxed in development mode.
        """
        # Call parent validation but catch errors
        try:
            super().validate()
        except ValueError:
            print("⚠️  WARNING: Some configuration settings are missing. Using defaults for development.") 