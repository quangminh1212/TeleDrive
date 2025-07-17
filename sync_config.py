#!/usr/bin/env python3
"""
Simple script to sync config without conflicts
"""

import json
import os
import sys
from dotenv import load_dotenv

def sync_config():
    try:
        # Load .env
        load_dotenv()
        
        # Load current config
        with open('config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Update from environment variables
        updated = False
        
        # Basic telegram settings
        if os.getenv('TELEGRAM_API_ID'):
            config['telegram']['api_id'] = os.getenv('TELEGRAM_API_ID')
            updated = True
        if os.getenv('TELEGRAM_API_HASH'):
            config['telegram']['api_hash'] = os.getenv('TELEGRAM_API_HASH')
            updated = True
        if os.getenv('TELEGRAM_PHONE'):
            config['telegram']['phone_number'] = os.getenv('TELEGRAM_PHONE')
            updated = True
            
        # Optional settings with defaults
        optional_settings = {
            'TELEGRAM_CONNECTION_TIMEOUT': ('telegram.connection_timeout', 30),
            'TELEGRAM_REQUEST_TIMEOUT': ('telegram.request_timeout', 60),
            'TELEGRAM_RETRY_ATTEMPTS': ('telegram.retry_attempts', 3),
            'TELEGRAM_RETRY_DELAY': ('telegram.retry_delay', 5)
        }
        
        for env_key, (config_path, default_value) in optional_settings.items():
            env_value = os.getenv(env_key)
            if env_value:
                try:
                    # Set nested config value
                    keys = config_path.split('.')
                    current = config
                    for key in keys[:-1]:
                        if key not in current:
                            current[key] = {}
                        current = current[key]
                    
                    # Convert to int if it's a number
                    if env_value.isdigit():
                        current[keys[-1]] = int(env_value)
                    else:
                        current[keys[-1]] = env_value
                    updated = True
                except:
                    pass
        
        # Save if updated
        if updated:
            # Save directly without temp file to avoid conflicts
            with open('config.json', 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            print("✅ Đã đồng bộ cấu hình thành công")
        else:
            print("✅ Cấu hình đã được đồng bộ")
            
        return True
        
    except Exception as e:
        print(f"❌ Lỗi đồng bộ: {e}")
        return False

if __name__ == "__main__":
    success = sync_config()
    sys.exit(0 if success else 1)
