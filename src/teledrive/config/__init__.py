"""
TeleDrive Configuration

This package provides the configuration system for TeleDrive,
supporting different environments (development, testing, production).
"""

import os
from typing import Dict, Any, Optional

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import configuration classes
from .base import BaseConfig
from .development import DevelopmentConfig
from .production import ProductionConfig
from .testing import TestingConfig


def get_config() -> BaseConfig:
    """
    Get the appropriate configuration class based on the environment.
    
    Returns:
        BaseConfig: Configuration instance based on current environment
    """
    env = os.environ.get('FLASK_ENV', 'development').lower()
    
    if env == 'production':
        return ProductionConfig()
    elif env == 'testing':
        return TestingConfig()
    else:
        return DevelopmentConfig()


# Default configuration instance
config = get_config()


def validate_environment() -> None:
    """
    Validate required environment variables.
    
    Raises:
        ValueError: If required environment variables are missing
    """
    config.validate()


__all__ = [
    'BaseConfig', 
    'DevelopmentConfig', 
    'ProductionConfig', 
    'TestingConfig',
    'config', 
    'get_config', 
    'validate_environment'
]
