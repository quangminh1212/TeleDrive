"""
TeleDrive - Telegram File Scanner
A professional tool for scanning and extracting file information from Telegram channels.
"""

__version__ = "2.0.0"
__author__ = "TeleDrive Team"
__description__ = "Professional Telegram File Scanner with modern architecture"

# Main exports
from .core.scanner import TelegramFileScanner
from .core.client import TelegramClientManager
from .config.manager import ConfigManager
from .utils.logger import get_logger, setup_logging

__all__ = [
    "TelegramFileScanner",
    "TelegramClientManager", 
    "ConfigManager",
    "get_logger",
    "setup_logging"
]
