"""
Testing Configuration

This module provides the testing configuration for TeleDrive.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from .base import BaseConfig


@dataclass
class TestingConfig(BaseConfig):
    """
    Testing configuration class for TeleDrive.
    Includes settings suitable for automated testing.
    """
    # Flask settings
    DEBUG: bool = False
    TESTING: bool = True
    DEV_MODE: bool = False
    PRESERVE_CONTEXT_ON_EXCEPTION: bool = False
    
    # Testing database
    SQLALCHEMY_DATABASE_URI: str = field(
        default_factory=lambda: os.getenv(
            'TEST_DATABASE_URI', 
            f'sqlite:///{Path("instance/test.db").resolve()}'
        )
    )
    SQLALCHEMY_ECHO: bool = False
    
    # Security settings for testing
    WTF_CSRF_ENABLED: bool = False
    
    # Test client settings
    SERVER_NAME: str = 'localhost:5000'
    APPLICATION_ROOT: str = '/'
    PREFERRED_URL_SCHEME: str = 'http'
    
    # Mock authentication for testing
    LOGIN_DISABLED: bool = True 