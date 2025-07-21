#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script kiểm tra cấu hình Telegram API
"""

import json
import sys

def check_config():
    try:
        # Load config
        with open('config/config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Get values
        telegram_config = config.get('telegram', {})
        api_id = str(telegram_config.get('api_id', ''))
        api_hash = telegram_config.get('api_hash', '')
        phone = telegram_config.get('phone_number', '')
        
        print(f"API_ID: {api_id}")
        print(f"API_HASH: {api_hash[:10]}...")
        print(f"PHONE: {phone}")
        
        # Check if valid
        is_valid = (
            api_id and 
            api_id != '' and 
            api_hash and 
            phone and 
            phone != '+84xxxxxxxxx'
        )
        
        print(f"Valid: {is_valid}")
        
        if is_valid:
            print("OK: Cau hinh hop le!")
            sys.exit(0)
        else:
            print("ERROR: Cau hinh khong hop le!")
            sys.exit(1)

    except Exception as e:
        print(f"ERROR: Loi doc config: {e}")
        sys.exit(1)

if __name__ == '__main__':
    check_config()
