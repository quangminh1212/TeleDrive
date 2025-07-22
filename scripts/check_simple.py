#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple config checker for production mode
"""

import json
import sys
import os

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def check_config():
    """Kiểm tra cấu hình cơ bản"""
    try:
        # Kiểm tra file config
        config_path = 'config/config.json'
        if not os.path.exists(config_path):
            print("[ERROR] File config.json khong ton tai!")
            return False

        # Đọc config
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # Kiểm tra channel
        channel = config.get('channels', {}).get('default_channel', '')
        if not channel or channel in ['', '@your_channel_here']:
            print("[ERROR] Chua cau hinh channel!")
            return False

        print("[OK] Cau hinh co ban OK")
        return True

    except Exception as e:
        print(f"[ERROR] Loi kiem tra config: {e}")
        return False

if __name__ == '__main__':
    if check_config():
        sys.exit(0)
    else:
        sys.exit(1)
