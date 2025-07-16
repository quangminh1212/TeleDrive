"""
TeleDrive - Advanced Telegram Channel File Scanner

A powerful tool for scanning Telegram channels and extracting file information,
with special support for private channels and groups.

Features:
- Private channel scanning with invite link support
- Multiple output formats (JSON, CSV, Excel)
- Advanced filtering and configuration options
- Detailed logging and progress tracking
- Modern CLI interface with rich formatting

Author: TeleDrive Team
License: MIT
Version: 1.0.0
"""

__version__ = "1.0.0"
__author__ = "TeleDrive Team"
__email__ = "support@teledrive.dev"
__license__ = "MIT"

# Core imports for easy access
from .core.scanner import TelegramFileScanner
from .core.client import TelegramClient
from .config.manager import ConfigManager

# Version info
VERSION_INFO = (1, 0, 0)

__all__ = [
    "TelegramFileScanner",
    "TelegramClient", 
    "ConfigManager",
    "__version__",
    "VERSION_INFO"
]
