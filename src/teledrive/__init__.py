"""
TeleDrive - Modern Telegram File Manager

A web application for managing Telegram files with a Google Drive-style interface.
"""

import os
from pathlib import Path
import logging
from typing import Dict, Any, List

# Version info
try:
    from ._version import __version__
except ImportError:
    __version__ = "1.0.0"  # Default version if _version.py is not found

# Application paths
BASE_DIR = Path(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
INSTANCE_DIR = BASE_DIR / 'instance'
LOGS_DIR = BASE_DIR / 'logs'
OUTPUT_DIR = BASE_DIR / 'output'
DOWNLOADS_DIR = BASE_DIR / 'downloads'
TEMPLATE_DIR = BASE_DIR / 'templates'
STATIC_DIR = BASE_DIR / 'static'

# Create necessary directories
for directory in [INSTANCE_DIR, LOGS_DIR, OUTPUT_DIR, DOWNLOADS_DIR]:
    directory.mkdir(exist_ok=True)

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOGS_DIR / 'teledrive.log')
    ]
)

# Package exports
__all__ = [
    '__version__',
    'BASE_DIR',
    'INSTANCE_DIR',
    'LOGS_DIR', 
    'OUTPUT_DIR',
    'DOWNLOADS_DIR',
    'TEMPLATE_DIR',
    'STATIC_DIR'
]
