#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Config Checker for TeleDrive
Kiểm tra tính hợp lệ của file cấu hình
"""

import os
import sys
import json

def check_config():
    """Kiểm tra cấu hình cơ bản"""
    try:
        # Kiểm tra file config.json có tồn tại không
        config_path = os.path.join('config', 'config.json')
        if not os.path.exists(config_path):
            print("[ERROR] File config.json khong ton tai")
            return False

        # Đọc và kiểm tra JSON hợp lệ
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except json.JSONDecodeError:
            print("[ERROR] File config.json khong phai JSON hop le")
            return False
        except Exception as e:
            print(f"[ERROR] Loi doc config.json: {e}")
            return False

        # Kiểm tra cấu trúc cơ bản
        if not isinstance(config, dict):
            print("[ERROR] Config phai la object JSON")
            return False

        # Kiểm tra có channels không (tùy chọn)
        if 'channels' in config:
            channels = config['channels']
            if isinstance(channels, dict):
                default_channel = channels.get('default_channel', '')
                if default_channel and default_channel != '@your_channel_here':
                    print("[OK] Cau hinh channel hop le")
                else:
                    print("[WARNING] Chua cau hinh channel (co the chay duoc)")

        print("[OK] Config co ban hop le")
        return True

    except Exception as e:
        print(f"[ERROR] Loi kiem tra config: {e}")
        return False

def main():
    """Main function"""
    if check_config():
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure

if __name__ == '__main__':
    main()
