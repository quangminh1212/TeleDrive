#!/usr/bin/env python3
"""
Run Config Manager cho Telegram File Scanner
Quản lý cấu hình tham số đầu vào cho run.bat
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional


class RunConfigManager:
    """Quản lý cấu hình run_config.json"""
    
    def __init__(self, config_file: str = 'run_config.json'):
        self.config_file = config_file
        self.config = {}
        self.load_config()
    
    def load_config(self) -> bool:
        """Tải cấu hình từ file"""
        try:
            if not os.path.exists(self.config_file):
                print(f"❌ File {self.config_file} không tồn tại!")
                return False
            
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            
            print(f"✅ Đã tải cấu hình từ {self.config_file}")
            return True
            
        except Exception as e:
            print(f"❌ Lỗi khi tải cấu hình: {e}")
            return False
    
    def save_config(self) -> bool:
        """Lưu cấu hình vào file"""
        try:
            # Backup file cũ
            if os.path.exists(self.config_file):
                backup_file = f"{self.config_file}.backup"
                with open(self.config_file, 'r', encoding='utf-8') as src:
                    with open(backup_file, 'w', encoding='utf-8') as dst:
                        dst.write(src.read())
            
            # Lưu config mới
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Đã lưu cấu hình vào {self.config_file}")
            return True
            
        except Exception as e:
            print(f"❌ Lỗi khi lưu cấu hình: {e}")
            return False
    
    def get_setting(self, section: str, key: str, default: Any = None) -> Any:
        """Lấy giá trị cấu hình"""
        return self.config.get(section, {}).get(key, default)
    
    def set_setting(self, section: str, key: str, value: Any) -> None:
        """Đặt giá trị cấu hình"""
        if section not in self.config:
            self.config[section] = {}
        self.config[section][key] = value
    
    def get_channel_to_scan(self) -> str:
        """Lấy channel cần scan"""
        return self.config.get('channel', '@duongtinhchat92')
    
    def apply_to_main_config(self) -> bool:
        """Áp dụng run_config vào config.json chính"""
        try:
            # Đọc config.json hiện tại
            if not os.path.exists('config.json'):
                print("❌ File config.json không tồn tại!")
                return False

            with open('config.json', 'r', encoding='utf-8') as f:
                main_config = json.load(f)

            # Áp dụng các thiết lập từ run_config (cấu trúc tối giản)

            # Channel
            channel = self.config.get('channel')
            if channel:
                main_config['channels']['use_default_channel'] = True
                main_config['channels']['default_channel'] = channel

            # Scanning settings
            max_messages = self.config.get('max_messages')
            if max_messages:
                main_config['scanning']['max_messages'] = max_messages

            batch_size = self.config.get('batch_size')
            if batch_size:
                main_config['scanning']['batch_size'] = batch_size

            # File types
            file_types = self.config.get('file_types', {})
            for file_type, enabled in file_types.items():
                if file_type in main_config['scanning']['file_types']:
                    main_config['scanning']['file_types'][file_type] = enabled

            # Output formats
            output_formats = self.config.get('output_formats', {})
            for format_name, enabled in output_formats.items():
                if format_name in main_config['output']['formats']:
                    main_config['output']['formats'][format_name]['enabled'] = enabled

            # Display
            show_progress = self.config.get('show_progress')
            if show_progress is not None:
                main_config['display']['show_progress'] = show_progress

            language = self.config.get('language')
            if language:
                main_config['display']['language'] = language

            # Lưu config.json đã cập nhật
            with open('config.json', 'w', encoding='utf-8') as f:
                json.dump(main_config, f, indent=2, ensure_ascii=False)

            print("✅ Đã áp dụng run_config vào config.json")
            return True

        except Exception as e:
            print(f"❌ Lỗi khi áp dụng cấu hình: {e}")
            return False
    
    def show_current_settings(self) -> None:
        """Hiển thị cấu hình hiện tại"""
        print("\n" + "="*50)
        print("        CẤU HÌNH HIỆN TẠI")
        print("="*50)

        # Channel
        print(f"\n📺 CHANNEL:")
        print(f"   {self.config.get('channel', 'Chưa đặt')}")

        # Scan settings
        print(f"\n🔍 THIẾT LẬP QUÉT:")
        print(f"   Số tin nhắn tối đa: {self.config.get('max_messages', 'Không giới hạn')}")
        print(f"   Batch size: {self.config.get('batch_size', 50)}")

        # File types
        file_types = self.config.get('file_types', {})
        enabled_types = [k for k, v in file_types.items() if v]
        print(f"   Loại file: {', '.join(enabled_types) if enabled_types else 'Tất cả'}")

        # Output
        print(f"\n📁 ĐẦU RA:")
        output_formats = self.config.get('output_formats', {})
        enabled_formats = [k for k, v in output_formats.items() if v]
        print(f"   Định dạng: {', '.join(enabled_formats) if enabled_formats else 'Mặc định'}")

        # Display
        print(f"\n🖥️ HIỂN THỊ:")
        print(f"   Hiện progress: {self.config.get('show_progress', True)}")
        print(f"   Ngôn ngữ: {self.config.get('language', 'vi')}")

        print("\n" + "="*50)


def main():
    """Chương trình chính"""
    print("🔧 Run Config Manager - Telegram File Scanner")
    print("=" * 50)
    
    manager = RunConfigManager()
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'show':
            manager.show_current_settings()
        elif command == 'apply':
            if manager.apply_to_main_config():
                print("✅ Đã áp dụng cấu hình thành công!")
            else:
                print("❌ Không thể áp dụng cấu hình!")
                sys.exit(1)
        else:
            print(f"❌ Lệnh không hợp lệ: {command}")
            print("Sử dụng: python run_config_manager.py [show|apply]")
            sys.exit(1)
    else:
        # Interactive mode
        manager.show_current_settings()
        
        print("\nBạn có muốn áp dụng cấu hình này vào config.json? (y/n): ", end="")
        choice = input().lower().strip()
        
        if choice in ['y', 'yes', 'có']:
            if manager.apply_to_main_config():
                print("✅ Đã áp dụng cấu hình thành công!")
            else:
                print("❌ Không thể áp dụng cấu hình!")
                sys.exit(1)
        else:
            print("Hủy bỏ.")


if __name__ == "__main__":
    main()
