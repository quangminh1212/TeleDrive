#!/usr/bin/env python3
"""
Sync Config - Tự động đồng bộ thông tin từ .env vào config.json
"""

import json
import os
import re
from dotenv import load_dotenv

def load_env_vars():
    """Load environment variables from .env file"""
    load_dotenv()
    return {
        'api_id': os.getenv('TELEGRAM_API_ID', ''),
        'api_hash': os.getenv('TELEGRAM_API_HASH', ''),
        'phone_number': os.getenv('TELEGRAM_PHONE', ''),
        'session_name': os.getenv('TELEGRAM_SESSION_NAME', 'telegram_scanner_session'),
        'connection_timeout': int(os.getenv('TELEGRAM_CONNECTION_TIMEOUT', '30')),
        'request_timeout': int(os.getenv('TELEGRAM_REQUEST_TIMEOUT', '60')),
        'retry_attempts': int(os.getenv('TELEGRAM_RETRY_ATTEMPTS', '3')),
        'retry_delay': int(os.getenv('TELEGRAM_RETRY_DELAY', '5'))
    }

def load_config_json():
    """Load config.json file"""
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ Không tìm thấy config.json")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Lỗi đọc config.json: {e}")
        return None

def save_config_json(config):
    """Save config.json file"""
    try:
        with open('config.json', 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"❌ Lỗi lưu config.json: {e}")
        return False

def sync_env_to_config():
    """Sync environment variables to config.json"""
    print("🔄 ĐỒNG BỘ CẤU HÌNH")
    print("=" * 40)
    
    # Load .env variables
    print("📄 Đọc file .env...")
    env_vars = load_env_vars()
    
    # Validate required fields
    required_fields = ['api_id', 'api_hash', 'phone_number']
    missing_fields = []
    
    for field in required_fields:
        if not env_vars[field] or env_vars[field] in ['your_api_id_here', 'your_api_hash_here', '+84xxxxxxxxx']:
            missing_fields.append(field)
    
    if missing_fields:
        print(f"❌ Thiếu thông tin trong .env: {', '.join(missing_fields)}")
        print("💡 Vui lòng cấu hình .env trước khi sync")
        return False
    
    # Load config.json
    print("📄 Đọc file config.json...")
    config = load_config_json()
    if not config:
        return False
    
    # Update telegram section
    if 'telegram' not in config:
        config['telegram'] = {}
    
    telegram_section = config['telegram']
    updated_fields = []
    
    # Sync each field
    for field, value in env_vars.items():
        if field in ['connection_timeout', 'request_timeout', 'retry_attempts', 'retry_delay']:
            # Convert to int for numeric fields
            try:
                value = int(value)
            except (ValueError, TypeError):
                continue
        
        old_value = telegram_section.get(field, '')
        if str(old_value) != str(value):
            telegram_section[field] = value
            updated_fields.append(field)
    
    # Update last_updated timestamp
    from datetime import datetime
    config['_last_updated'] = datetime.now().strftime('%Y-%m-%d')
    
    # Save config
    if updated_fields:
        print(f"🔄 Cập nhật: {', '.join(updated_fields)}")
        if save_config_json(config):
            print("✅ Đã đồng bộ thành công!")
            return True
        else:
            return False
    else:
        print("✅ Cấu hình đã được đồng bộ!")
        return True

def validate_sync():
    """Validate that sync was successful"""
    print("\n🔍 KIỂM TRA ĐỒNG BỘ")
    print("-" * 30)
    
    env_vars = load_env_vars()
    config = load_config_json()
    
    if not config:
        return False
    
    telegram_section = config.get('telegram', {})
    
    # Check each field
    all_synced = True
    for field in ['api_id', 'api_hash', 'phone_number']:
        env_value = env_vars[field]
        config_value = telegram_section.get(field, '')
        
        if str(env_value) == str(config_value):
            print(f"✅ {field}: Đã đồng bộ")
        else:
            print(f"❌ {field}: Chưa đồng bộ (.env: {env_value}, config: {config_value})")
            all_synced = False
    
    return all_synced

def auto_sync_on_change():
    """Auto sync when .env changes"""
    import time
    import hashlib
    
    def get_file_hash(filepath):
        """Get file hash for change detection"""
        try:
            with open(filepath, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except FileNotFoundError:
            return None
    
    print("👁️ Theo dõi thay đổi .env (Ctrl+C để dừng)...")
    
    last_hash = get_file_hash('.env')
    
    try:
        while True:
            time.sleep(2)  # Check every 2 seconds
            current_hash = get_file_hash('.env')
            
            if current_hash and current_hash != last_hash:
                print("\n🔄 Phát hiện thay đổi .env, đang đồng bộ...")
                if sync_env_to_config():
                    validate_sync()
                last_hash = current_hash
                
    except KeyboardInterrupt:
        print("\n⏹️ Dừng theo dõi")

def main():
    """Main function"""
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--watch':
            auto_sync_on_change()
            return
        elif sys.argv[1] == '--validate':
            validate_sync()
            return
    
    # Default: sync once
    if sync_env_to_config():
        validate_sync()

if __name__ == "__main__":
    main()
