"""
TeleDrive - Modern Telegram File Manager

A web application for managing Telegram files with a Google Drive-style interface.
"""

from pathlib import Path

# Version info is in _version.py
try:
    from ._version import __version__
except ImportError:
    __version__ = "1.0.0"  # Default version if _version.py is not found

# Create necessary directories
INSTANCE_DIR = Path('instance')
LOGS_DIR = Path('logs')
OUTPUT_DIR = Path('output')
DOWNLOADS_DIR = Path('downloads')

for directory in [INSTANCE_DIR, LOGS_DIR, OUTPUT_DIR, DOWNLOADS_DIR]:
    directory.mkdir(exist_ok=True)

# Package exports
__all__ = ['__version__']
