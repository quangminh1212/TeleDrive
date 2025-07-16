"""
Core functionality for TeleDrive

This module contains the core business logic for Telegram file scanning,
including the main scanner class and client management.
"""

from .scanner import TelegramFileScanner
from .client import TelegramClient

__all__ = [
    "TelegramFileScanner",
    "TelegramClient"
]
