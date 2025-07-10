"""
Configuration module for TeleDrive
Handles environment variables and application settings
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Configuration class for TeleDrive application"""
    
    # Telegram API Configuration
    API_ID = os.getenv('API_ID')
    API_HASH = os.getenv('API_HASH')
    PHONE_NUMBER = os.getenv('PHONE_NUMBER')
    SESSION_NAME = os.getenv('SESSION_NAME', 'teledrive_session')
    
    # Application Settings
    DOWNLOAD_DIR = Path(os.getenv('DOWNLOAD_DIR', './downloads'))
    DEFAULT_CHANNEL = os.getenv('DEFAULT_CHANNEL')
    
    # File Settings
    MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB limit for Telegram
    ALLOWED_EXTENSIONS = {
        'documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
        'images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
        'videos': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'],
        'audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg'],
        'archives': ['.zip', '.rar', '.7z', '.tar', '.gz']
    }
    
    @classmethod
    def validate_config(cls):
        """Validate required configuration parameters"""
        required_fields = ['API_ID', 'API_HASH', 'PHONE_NUMBER']
        missing_fields = []
        
        for field in required_fields:
            if not getattr(cls, field):
                missing_fields.append(field)
        
        if missing_fields:
            raise ValueError(f"Missing required configuration: {', '.join(missing_fields)}")
        
        # Create download directory if it doesn't exist
        cls.DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        return True
    
    @classmethod
    def get_file_category(cls, filename):
        """Get file category based on extension"""
        file_ext = Path(filename).suffix.lower()
        
        for category, extensions in cls.ALLOWED_EXTENSIONS.items():
            if file_ext in extensions:
                return category
        
        return 'other'
