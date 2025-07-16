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
    
    def get_channels_to_scan(self) -> list:
        """Lấy danh sách channel cần scan"""
        channels = []
        
        if self.get_setting('default_channels', 'scan_all_channels', False):
            # Scan tất cả channels
            channels.extend(self.get_setting('default_channels', 'backup_channels', []))
        else:
            # Chỉ scan primary channel
            primary = self.get_setting('default_channels', 'primary_channel', '')
            if primary:
                channels.append(primary)
        
        return channels
    
    def apply_to_main_config(self) -> bool:
        """Áp dụng run_config vào config.json chính"""
        try:
            # Đọc config.json hiện tại
            if not os.path.exists('config.json'):
                print("❌ File config.json không tồn tại!")
                return False
            
            with open('config.json', 'r', encoding='utf-8') as f:
                main_config = json.load(f)
            
            # Áp dụng các thiết lập từ run_config
            
            # Channels
            if self.get_setting('run_mode', 'use_default_channel', True):
                main_config['channels']['use_default_channel'] = True
                primary_channel = self.get_setting('default_channels', 'primary_channel', '')
                if primary_channel:
                    main_config['channels']['default_channel'] = primary_channel
            
            # Scanning settings
            max_messages = self.get_setting('scan_settings', 'max_messages')
            if max_messages:
                main_config['scanning']['max_messages'] = max_messages
            
            batch_size = self.get_setting('scan_settings', 'batch_size')
            if batch_size:
                main_config['scanning']['batch_size'] = batch_size
            
            scan_direction = self.get_setting('scan_settings', 'scan_direction')
            if scan_direction:
                main_config['scanning']['scan_direction'] = scan_direction
            
            # File types
            file_types = self.get_setting('scan_settings', 'file_types', {})
            for file_type, enabled in file_types.items():
                if file_type in main_config['scanning']['file_types']:
                    main_config['scanning']['file_types'][file_type] = enabled
            
            # Output formats
            output_formats = self.get_setting('output_settings', 'output_formats', {})
            for format_name, enabled in output_formats.items():
                if format_name in main_config['output']['formats']:
                    main_config['output']['formats'][format_name]['enabled'] = enabled
            
            # Performance
            concurrent_downloads = self.get_setting('performance', 'concurrent_downloads')
            if concurrent_downloads:
                main_config['scanning']['performance']['concurrent_downloads'] = concurrent_downloads
            
            sleep_between_batches = self.get_setting('performance', 'sleep_between_batches')
            if sleep_between_batches:
                main_config['scanning']['performance']['sleep_between_batches'] = sleep_between_batches
            
            memory_limit = self.get_setting('performance', 'memory_limit_mb')
            if memory_limit:
                main_config['scanning']['performance']['memory_limit_mb'] = memory_limit
            
            # Display
            show_progress = self.get_setting('display', 'show_progress_bar', True)
            main_config['display']['show_progress'] = show_progress
            
            show_details = self.get_setting('display', 'show_file_details', True)
            main_config['display']['show_file_details'] = show_details
            
            show_stats = self.get_setting('display', 'show_statistics', True)
            main_config['display']['show_statistics'] = show_stats
            
            language = self.get_setting('display', 'language', 'vi')
            main_config['display']['language'] = language
            
            # Filters
            min_size = self.get_setting('filters', 'min_file_size_mb', 0)
            main_config['filters']['min_file_size'] = min_size * 1024 * 1024  # Convert to bytes
            
            max_size = self.get_setting('filters', 'max_file_size_mb')
            if max_size:
                main_config['filters']['max_file_size'] = max_size * 1024 * 1024  # Convert to bytes
            
            blocked_ext = self.get_setting('filters', 'blocked_extensions', [])
            if blocked_ext:
                main_config['filters']['exclude_extensions'] = blocked_ext
            
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
        print("\n" + "="*60)
        print("           CẤU HÌNH HIỆN TẠI")
        print("="*60)
        
        # Run mode
        print(f"\n🔧 CHẾĐỘ CHẠY:")
        print(f"   Auto mode: {self.get_setting('run_mode', 'auto_mode', False)}")
        print(f"   Dùng channel mặc định: {self.get_setting('run_mode', 'use_default_channel', True)}")
        print(f"   Bỏ qua input người dùng: {self.get_setting('run_mode', 'skip_user_input', False)}")
        
        # Channels
        print(f"\n📺 CHANNELS:")
        print(f"   Channel chính: {self.get_setting('default_channels', 'primary_channel', 'Chưa đặt')}")
        backup_channels = self.get_setting('default_channels', 'backup_channels', [])
        print(f"   Channels dự phòng: {len(backup_channels)} channel(s)")
        
        # Scan settings
        print(f"\n🔍 THIẾT LẬP QUÉT:")
        print(f"   Số tin nhắn tối đa: {self.get_setting('scan_settings', 'max_messages', 'Không giới hạn')}")
        print(f"   Batch size: {self.get_setting('scan_settings', 'batch_size', 50)}")
        print(f"   Hướng quét: {self.get_setting('scan_settings', 'scan_direction', 'newest_first')}")
        
        # File types
        file_types = self.get_setting('scan_settings', 'file_types', {})
        enabled_types = [k for k, v in file_types.items() if v]
        print(f"   Loại file: {', '.join(enabled_types) if enabled_types else 'Tất cả'}")
        
        # Output
        print(f"\n📁 ĐẦU RA:")
        output_formats = self.get_setting('output_settings', 'output_formats', {})
        enabled_formats = [k for k, v in output_formats.items() if v]
        print(f"   Định dạng: {', '.join(enabled_formats) if enabled_formats else 'Mặc định'}")
        
        # Performance
        print(f"\n⚡ HIỆU SUẤT:")
        print(f"   Downloads đồng thời: {self.get_setting('performance', 'concurrent_downloads', 3)}")
        print(f"   Giới hạn RAM: {self.get_setting('performance', 'memory_limit_mb', 512)} MB")
        
        print("\n" + "="*60)


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
