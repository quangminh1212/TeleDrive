#!/usr/bin/env python3
"""
Configuration Module
Load config from config.json or environment variables
"""

import json
import os
from pathlib import Path

# Load config from JSON file
config_file = Path(__file__).parent / "config.json"

if config_file.exists():
    with open(config_file, 'r', encoding='utf-8') as f:
        config_data = json.load(f)
    
    # Telegram config
    telegram_config = config_data.get('telegram', {})
    API_ID = telegram_config.get('api_id', '')
    API_HASH = telegram_config.get('api_hash', '')
    PHONE_NUMBER = telegram_config.get('phone_number', '')
    SESSION_NAME = telegram_config.get('session_name', 'session')
    
    # Database config
    db_config = config_data.get('database', {})
    DATABASE_URL = db_config.get('url', 'sqlite:///data/teledrive.db')
    
else:
    # Fallback to environment variables
    API_ID = os.getenv('TELEGRAM_API_ID', '')
    API_HASH = os.getenv('TELEGRAM_API_HASH', '')
    PHONE_NUMBER = os.getenv('TELEGRAM_PHONE', '')
    SESSION_NAME = os.getenv('TELEGRAM_SESSION', 'session')
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///data/teledrive.db')

# Validation
if not API_ID or not API_HASH:
    print("⚠️  Warning: API_ID or API_HASH not configured")
    print("   Please update config.json or set environment variables")
