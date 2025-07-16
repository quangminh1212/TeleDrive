#!/usr/bin/env python3
"""
TeleDrive Config Manager
Quản lý cấu hình toàn diện cho TeleDrive với validation và auto-sync
"""

import json
import os
import re
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from dotenv import load_dotenv


class ConfigValidator:
    """Validator cho config.json và .env"""

    def __init__(self):
        self.errors = []
        self.warnings = []

    def validate_env_file(self, env_path: str = '.env') -> bool:
        """Validate .env file"""
        self.errors.clear()
        self.warnings.clear()

        if not os.path.exists(env_path):
            self.errors.append(f"File {env_path} không tồn tại")
            return False

        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            self.errors.append(f"Không thể đọc file {env_path}: {e}")
            return False

        # Parse environment variables
        env_vars = {}
        for line in content.split('\n'):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

        # Validate required fields
        required_fields = ['TELEGRAM_API_ID', 'TELEGRAM_API_HASH', 'TELEGRAM_PHONE']
        for field in required_fields:
            if field not in env_vars or not env_vars[field]:
                self.errors.append(f"Thiếu hoặc trống {field}")
            elif env_vars[field] in ['your_api_id_here', 'your_api_hash_here', '+84xxxxxxxxx']:
                self.errors.append(f"{field} chưa được cấu hình (vẫn là giá trị mặc định)")

        # Validate API_ID
        if 'TELEGRAM_API_ID' in env_vars:
            try:
                api_id = int(env_vars['TELEGRAM_API_ID'])
                if api_id <= 0:
                    self.errors.append("TELEGRAM_API_ID phải là số nguyên dương")
            except ValueError:
                self.errors.append("TELEGRAM_API_ID phải là số nguyên")

        # Validate API_HASH
        if 'TELEGRAM_API_HASH' in env_vars:
            api_hash = env_vars['TELEGRAM_API_HASH']
            if not re.match(r'^[a-fA-F0-9]{32}$', api_hash):
                self.errors.append("TELEGRAM_API_HASH phải là chuỗi 32 ký tự hex")

        # Validate PHONE
        if 'TELEGRAM_PHONE' in env_vars:
            phone = env_vars['TELEGRAM_PHONE']
            if not re.match(r'^\+\d{10,15}$', phone):
                self.errors.append("TELEGRAM_PHONE phải có format +[mã quốc gia][số điện thoại] (10-15 chữ số)")

        return len(self.errors) == 0

    def validate_config_json(self, config_path: str = 'config.json') -> bool:
        """Validate config.json file"""
        self.errors.clear()
        self.warnings.clear()

        if not os.path.exists(config_path):
            self.errors.append(f"File {config_path} không tồn tại")
            return False

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            self.errors.append(f"Lỗi JSON trong {config_path}: {e}")
            return False
        except Exception as e:
            self.errors.append(f"Không thể đọc file {config_path}: {e}")
            return False

        # Validate required sections
        required_sections = ['telegram', 'output', 'scanning', 'download', 'display', 'filters']
        for section in required_sections:
            if section not in config:
                self.errors.append(f"Thiếu section '{section}'")

        return len(self.errors) == 0

    def get_validation_report(self) -> str:
        """Get validation report"""
        report = []

        if self.errors:
            report.append("❌ LỖI:")
            for error in self.errors:
                report.append(f"  - {error}")

        if self.warnings:
            report.append("⚠️ CẢNH BÁO:")
            for warning in self.warnings:
                report.append(f"  - {warning}")

        if not self.errors and not self.warnings:
            report.append("✅ Cấu hình hợp lệ!")

        return "\n".join(report)

class ConfigManager:
    def __init__(self, config_file='config.json'):
        self.config_file = config_file
        self.config = self.load_config()
        self.ensure_directories()

    def load_config(self):
        """Load configuration from JSON file"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                # Auto-migrate old config format
                if config.get('_schema_version', '1.0') < '2.0':
                    config = self.migrate_config(config)
                return config
        except FileNotFoundError:
            print(f"Không tìm thấy {self.config_file}")
            return self.get_default_config()
        except json.JSONDecodeError as e:
            print(f"Lỗi đọc {self.config_file}: {e}")
            return self.get_default_config()

    def ensure_directories(self):
        """Ensure all required directories exist"""
        directories = [
            self.config.get('output', {}).get('directory', 'output'),
            self.config.get('download', {}).get('download_directory', 'downloads'),
            'logs',
            'data',
            'data/backups',
            'plugins'
        ]

        for directory in directories:
            os.makedirs(directory, exist_ok=True)

    def migrate_config(self, old_config):
        """Migrate old config format to new format"""
        print("🔄 Đang migrate config từ v1.0 lên v2.0...")

        # Create new config structure
        new_config = self.get_default_config()

        # Migrate telegram settings
        if 'telegram' in old_config:
            new_config['telegram'].update(old_config['telegram'])

        # Migrate other sections
        for section in ['output', 'scanning', 'download', 'display', 'filters', 'security', 'logging']:
            if section in old_config:
                new_config[section].update(old_config[section])

        # Update schema version
        new_config['_schema_version'] = '2.0'
        new_config['_last_updated'] = datetime.now().strftime('%Y-%m-%d')

        print("✅ Migration hoàn tất!")
        return new_config
    
    def save_config(self):
        """Save configuration to JSON file with validation"""
        try:
            # Validate before saving
            validator = ConfigValidator()
            temp_file = self.config_file + '.tmp'

            # Save to temp file first
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)

            # Validate temp file
            if validator.validate_config_json(temp_file):
                # Move temp file to actual file
                os.rename(temp_file, self.config_file)
                print(f"✅ Đã lưu và validate cấu hình vào {self.config_file}")
                return True
            else:
                # Remove temp file and show errors
                os.remove(temp_file)
                print("❌ Cấu hình không hợp lệ:")
                print(validator.get_validation_report())
                return False

        except Exception as e:
            print(f"Lỗi lưu {self.config_file}: {e}")
            return False
    
    def get_default_config(self):
        """Get default configuration with full structure"""
        return {
            "_schema_version": "2.0",
            "_description": "TeleDrive - Telegram File Scanner Complete Configuration",
            "_last_updated": datetime.now().strftime('%Y-%m-%d'),
            "_author": "TeleDrive Team",

            "project": {
                "name": "TeleDrive",
                "version": "2.0.0",
                "description": "Advanced Telegram File Scanner with UI",
                "debug_mode": False,
                "auto_update": True,
                "telemetry_enabled": False
            },

            "telegram": {
                "api_id": "",
                "api_hash": "",
                "phone_number": "",
                "session_name": "telegram_scanner_session",
                "connection_timeout": 30,
                "request_timeout": 60,
                "retry_attempts": 3,
                "retry_delay": 5,
                "auto_login": True,
                "save_session": True,
                "two_factor_auth": {
                    "enabled": False,
                    "password": "",
                    "hint": ""
                }
            },

            "channels": {
                "global_settings": {
                    "auto_join_private": True,
                    "skip_existing_files": True,
                    "parallel_scan": False,
                    "max_concurrent_channels": 3,
                    "delay_between_channels": 2,
                    "create_separate_folders": True,
                    "backup_results": True,
                    "continue_on_error": True,
                    "detailed_logging": True
                },
                "list": [],
                "templates": {
                    "document_only": {
                        "file_types": {
                            "documents": True,
                            "photos": False,
                            "videos": False,
                            "audio": False,
                            "voice": False,
                            "stickers": False,
                            "animations": False,
                            "video_notes": False
                        }
                    },
                    "media_only": {
                        "file_types": {
                            "documents": False,
                            "photos": True,
                            "videos": True,
                            "audio": True,
                            "voice": True,
                            "stickers": False,
                            "animations": True,
                            "video_notes": True
                        }
                    }
                }
            },

            "output": {
                "directory": "output",
                "create_subdirs": True,
                "timestamp_folders": False,
                "backup_existing": True,
                "formats": {
                    "csv": {"enabled": True, "filename": "telegram_files.csv"},
                    "json": {"enabled": True, "filename": "telegram_files.json"},
                    "excel": {"enabled": True, "filename": "telegram_files.xlsx"},
                    "simple_json": {"enabled": False, "filename": "simple_files.json"}
                }
            },

            "scanning": {
                "max_messages": None,
                "batch_size": 100,
                "scan_direction": "newest_first",
                "include_deleted": False,
                "skip_duplicates": True,
                "file_types": {
                    "documents": True, "photos": True, "videos": True,
                    "audio": True, "voice": True, "stickers": True,
                    "animations": True, "video_notes": True
                },
                "performance": {
                    "concurrent_downloads": 3,
                    "sleep_between_batches": 1,
                    "memory_limit_mb": 512,
                    "cache_size": 1000
                }
            },

            "download": {
                "generate_links": True,
                "include_preview": False,
                "auto_download": False,
                "download_directory": "downloads",
                "create_date_folders": True,
                "preserve_filename": True,
                "max_file_size_mb": 100,
                "download_timeout": 300,
                "verify_downloads": True
            },

            "display": {
                "show_progress": True,
                "show_file_details": True,
                "show_statistics": True,
                "language": "vi",
                "date_format": "DD/MM/YYYY HH:mm:ss",
                "file_size_format": "auto",
                "log_level": "INFO"
            },

            "filters": {
                "min_file_size": 0,
                "max_file_size": None,
                "file_extensions": [],
                "exclude_extensions": [],
                "date_from": None,
                "date_to": None,
                "filename_patterns": [],
                "exclude_patterns": []
            },

            "security": {
                "mask_phone_numbers": True,
                "mask_user_ids": False,
                "exclude_personal_info": True,
                "secure_session": True,
                "auto_logout": False
            },

            "logging": {
                "enabled": True,
                "level": "INFO",
                "file": "logs/scanner.log",
                "max_size_mb": 10,
                "backup_count": 5,
                "console_output": True,
                "detailed_steps": True
            },

            "database": {
                "enabled": True,
                "type": "sqlite",
                "connection": {
                    "sqlite": {
                        "file": "data/teledrive.db",
                        "timeout": 30
                    }
                }
            },

            "ui": {
                "enabled": True,
                "server": {
                    "host": "127.0.0.1",
                    "port": 8080,
                    "debug": False
                },
                "theme": {
                    "default": "telegram",
                    "dark_mode": True
                }
            },

            "api": {
                "enabled": True,
                "version": "v1",
                "base_path": "/api"
            },

            "notifications": {
                "enabled": True,
                "channels": {
                    "desktop": {"enabled": True, "sound": True}
                },
                "events": {
                    "scan_completed": True,
                    "scan_error": True,
                    "new_files_found": True
                }
            },

            "advanced": {
                "use_ipv6": False,
                "proxy": {"enabled": False},
                "rate_limiting": {"enabled": True, "requests_per_second": 10},
                "experimental": {"parallel_scanning": False, "smart_retry": True}
            }
        }

    def load_env_vars(self):
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

    def sync_env_to_config(self):
        """Sync environment variables to config.json"""
        print("🔄 ĐỒNG BỘ CẤU HÌNH")
        print("=" * 40)

        # Load .env variables
        print("📄 Đọc file .env...")
        env_vars = self.load_env_vars()

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

        # Update telegram section
        if 'telegram' not in self.config:
            self.config['telegram'] = {}

        telegram_section = self.config['telegram']
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
        self.config['_last_updated'] = datetime.now().strftime('%Y-%m-%d')

        # Save config
        if updated_fields:
            print(f"🔄 Cập nhật: {', '.join(updated_fields)}")
            if self.save_config():
                print("✅ Đã đồng bộ thành công!")
                return True
            else:
                return False
        else:
            print("✅ Cấu hình đã được đồng bộ!")
            return True

    def validate_sync(self):
        """Validate that sync was successful"""
        print("\n🔍 KIỂM TRA ĐỒNG BỘ")
        print("-" * 30)

        env_vars = self.load_env_vars()
        telegram_section = self.config.get('telegram', {})

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

    def validate_configuration(self):
        """Validate current configuration"""
        print("\n🔍 KIỂM TRA CẤU HÌNH")
        print("-"*30)

        validator = ConfigValidator()

        # Validate .env
        print("📄 Kiểm tra .env...")
        env_valid = validator.validate_env_file()
        if env_valid:
            print("✅ .env hợp lệ!")
        else:
            print("❌ .env có lỗi:")
            print(validator.get_validation_report())

        # Validate config.json
        print("\n📄 Kiểm tra config.json...")
        config_valid = validator.validate_config_json()
        if config_valid:
            print("✅ config.json hợp lệ!")
        else:
            print("❌ config.json có lỗi:")
            print(validator.get_validation_report())

        # Overall result
        print("\n" + "-"*30)
        if env_valid and config_valid:
            print("🎉 TẤT CẢ CẤU HÌNH HỢP LỆ!")
            return True
        else:
            print("⚠️ CÓ LỖI TRONG CẤU HÌNH!")
            return False

    def update_telegram_config(self, api_id=None, api_hash=None, phone_number=None):
        """Update Telegram configuration"""
        if api_id:
            self.config['telegram']['api_id'] = str(api_id)
        if api_hash:
            self.config['telegram']['api_hash'] = str(api_hash)
        if phone_number:
            self.config['telegram']['phone_number'] = str(phone_number)
        return self.save_config()
    
    def update_output_config(self, directory=None, csv_enabled=None, json_enabled=None, excel_enabled=None):
        """Update output configuration"""
        if directory:
            self.config['output']['directory'] = directory
        if csv_enabled is not None:
            self.config['output']['formats']['csv']['enabled'] = csv_enabled
        if json_enabled is not None:
            self.config['output']['formats']['json']['enabled'] = json_enabled
        if excel_enabled is not None:
            self.config['output']['formats']['excel']['enabled'] = excel_enabled
        return self.save_config()
    
    def update_scanning_config(self, max_messages=None, batch_size=None, file_types=None):
        """Update scanning configuration"""
        if max_messages is not None:
            self.config['scanning']['max_messages'] = max_messages
        if batch_size:
            self.config['scanning']['batch_size'] = batch_size
        if file_types:
            self.config['scanning']['file_types'].update(file_types)
        return self.save_config()
    
    def update_filter_config(self, min_size=None, max_size=None, extensions=None, exclude_ext=None):
        """Update filter configuration"""
        if min_size is not None:
            self.config['filters']['min_file_size'] = min_size
        if max_size is not None:
            self.config['filters']['max_file_size'] = max_size
        if extensions is not None:
            self.config['filters']['file_extensions'] = extensions
        if exclude_ext is not None:
            self.config['filters']['exclude_extensions'] = exclude_ext
        return self.save_config()
    
    def get_config(self, section=None):
        """Get configuration section or full config"""
        if section:
            return self.config.get(section, {})
        return self.config

    # ==================== CHANNEL MANAGEMENT ====================

    def add_channel(self, channel_data):
        """Add new channel to configuration"""
        if 'channels' not in self.config:
            self.config['channels'] = {'global_settings': {}, 'list': [], 'templates': {}}

        # Validate required fields
        required_fields = ['id', 'name', 'type', 'identifier']
        for field in required_fields:
            if field not in channel_data:
                raise ValueError(f"Thiếu trường bắt buộc: {field}")

        # Check for duplicate ID
        existing_ids = [ch['id'] for ch in self.config['channels']['list']]
        if channel_data['id'] in existing_ids:
            raise ValueError(f"Channel ID '{channel_data['id']}' đã tồn tại")

        # Set default values
        default_channel = {
            'enabled': True,
            'priority': len(self.config['channels']['list']) + 1,
            'auto_join': False,
            'invite_link': '',
            'access_hash': '',
            'last_scan': None,
            'total_files': 0,
            'settings': self.get_default_channel_settings()
        }

        # Merge with provided data
        channel = {**default_channel, **channel_data}
        self.config['channels']['list'].append(channel)

        return self.save_config()

    def remove_channel(self, channel_id):
        """Remove channel from configuration"""
        if 'channels' not in self.config:
            return False

        channels = self.config['channels']['list']
        original_count = len(channels)
        self.config['channels']['list'] = [ch for ch in channels if ch['id'] != channel_id]

        if len(self.config['channels']['list']) < original_count:
            return self.save_config()
        return False

    def update_channel(self, channel_id, updates):
        """Update channel configuration"""
        if 'channels' not in self.config:
            return False

        for channel in self.config['channels']['list']:
            if channel['id'] == channel_id:
                channel.update(updates)
                return self.save_config()
        return False

    def get_enabled_channels(self):
        """Get list of enabled channels"""
        if 'channels' not in self.config:
            return []

        enabled = [ch for ch in self.config['channels']['list'] if ch.get('enabled', False)]
        return sorted(enabled, key=lambda x: x.get('priority', 999))

    def get_channel_by_id(self, channel_id):
        """Get channel by ID"""
        if 'channels' not in self.config:
            return None

        for channel in self.config['channels']['list']:
            if channel['id'] == channel_id:
                return channel
        return None

    def get_default_channel_settings(self):
        """Get default settings for new channel"""
        return {
            'max_messages': None,
            'scan_direction': 'newest_first',
            'include_deleted': False,
            'skip_duplicates': True,
            'scan_replies': True,
            'scan_forwards': True,
            'file_types': {
                'documents': True,
                'photos': True,
                'videos': True,
                'audio': True,
                'voice': True,
                'stickers': False,
                'animations': True,
                'video_notes': True
            },
            'filters': {
                'min_file_size': 0,
                'max_file_size': None,
                'file_extensions': [],
                'exclude_extensions': [],
                'date_from': None,
                'date_to': None,
                'filename_patterns': [],
                'exclude_patterns': [],
                'sender_filter': [],
                'exclude_senders': []
            },
            'output': {
                'prefix': '',
                'separate_folder': True,
                'folder_name': '',
                'formats': {
                    'json': True,
                    'csv': True,
                    'excel': True,
                    'simple_json': False
                }
            }
        }

    # ==================== UI CONFIGURATION ====================

    def update_ui_config(self, section, updates):
        """Update UI configuration section"""
        if 'ui' not in self.config:
            self.config['ui'] = {}

        if section not in self.config['ui']:
            self.config['ui'][section] = {}

        self.config['ui'][section].update(updates)
        return self.save_config()

    def get_ui_config(self, section=None):
        """Get UI configuration"""
        ui_config = self.config.get('ui', {})
        if section:
            return ui_config.get(section, {})
        return ui_config

    # ==================== DATABASE CONFIGURATION ====================

    def update_database_config(self, db_type=None, connection_params=None):
        """Update database configuration"""
        if 'database' not in self.config:
            self.config['database'] = {}

        if db_type:
            self.config['database']['type'] = db_type

        if connection_params:
            if 'connection' not in self.config['database']:
                self.config['database']['connection'] = {}

            if db_type in self.config['database']['connection']:
                self.config['database']['connection'][db_type].update(connection_params)

        return self.save_config()

    def get_database_config(self):
        """Get database configuration"""
        return self.config.get('database', {})

    # ==================== NOTIFICATION CONFIGURATION ====================

    def update_notification_config(self, channel, settings):
        """Update notification configuration for specific channel"""
        if 'notifications' not in self.config:
            self.config['notifications'] = {'enabled': True, 'channels': {}, 'events': {}}

        if 'channels' not in self.config['notifications']:
            self.config['notifications']['channels'] = {}

        self.config['notifications']['channels'][channel] = settings
        return self.save_config()

    def get_notification_config(self):
        """Get notification configuration"""
        return self.config.get('notifications', {})
    
    def print_config(self):
        """Print current configuration"""
        print("\n" + "="*60)
        print("           CẤU HÌNH TELEGRAM FILE SCANNER")
        print("="*60)
        
        # Telegram settings
        telegram = self.config.get('telegram', {})
        print(f"\n📱 TELEGRAM:")
        print(f"   API ID: {telegram.get('api_id', 'Chưa cấu hình')}")
        print(f"   API Hash: {'*' * len(telegram.get('api_hash', '')) if telegram.get('api_hash') else 'Chưa cấu hình'}")
        print(f"   Số điện thoại: {telegram.get('phone_number', 'Chưa cấu hình')}")
        
        # Output settings
        output = self.config.get('output', {})
        formats = output.get('formats', {})
        print(f"\n📁 OUTPUT:")
        print(f"   Thư mục: {output.get('directory', 'output')}")
        print(f"   CSV: {'✓' if formats.get('csv', {}).get('enabled') else '✗'}")
        print(f"   JSON: {'✓' if formats.get('json', {}).get('enabled') else '✗'}")
        print(f"   Excel: {'✓' if formats.get('excel', {}).get('enabled') else '✗'}")
        
        # Scanning settings
        scanning = self.config.get('scanning', {})
        file_types = scanning.get('file_types', {})
        print(f"\n🔍 SCANNING:")
        print(f"   Max messages: {scanning.get('max_messages', 'Không giới hạn')}")
        print(f"   Batch size: {scanning.get('batch_size', 100)}")
        print(f"   File types: {', '.join([k for k, v in file_types.items() if v])}")
        
        # Filter settings
        filters = self.config.get('filters', {})
        print(f"\n🔧 FILTERS:")
        print(f"   Min size: {filters.get('min_file_size', 0)} bytes")
        print(f"   Max size: {filters.get('max_file_size', 'Không giới hạn')}")
        print(f"   Extensions: {filters.get('file_extensions', []) or 'Tất cả'}")
        
        print("="*60)

def main():
    """Interactive config manager"""
    config_mgr = ConfigManager()
    
    while True:
        print("\n" + "="*50)
        print("        QUẢN LÝ CẤU HÌNH")
        print("="*50)
        print("1. Xem cấu hình hiện tại")
        print("2. Cấu hình Telegram API")
        print("3. Cấu hình Output")
        print("4. Cấu hình Scanning")
        print("5. Cấu hình Filters")
        print("6. Đồng bộ từ .env sang config.json")
        print("7. Kiểm tra validation")
        print("8. Reset về mặc định")
        print("0. Thoát")
        print("-"*50)

        choice = input("Chọn (0-8): ").strip()

        if choice == '0':
            break
        elif choice == '1':
            config_mgr.print_config()
        elif choice == '2':
            configure_telegram(config_mgr)
        elif choice == '3':
            configure_output(config_mgr)
        elif choice == '4':
            configure_scanning(config_mgr)
        elif choice == '5':
            configure_filters(config_mgr)
        elif choice == '6':
            config_mgr.sync_env_to_config()
            config_mgr.validate_sync()
            input("\nNhấn Enter để tiếp tục...")
        elif choice == '7':
            config_mgr.validate_configuration()
            input("\nNhấn Enter để tiếp tục...")
        elif choice == '8':
            config_mgr.config = config_mgr.get_default_config()
            config_mgr.save_config()
            print("Đã reset về cấu hình mặc định!")
        else:
            print("Lựa chọn không hợp lệ!")

def configure_telegram(config_mgr):
    """Configure Telegram settings"""
    print("\n📱 CẤU HÌNH TELEGRAM API")
    print("-"*30)
    
    api_id = input("API ID (Enter để bỏ qua): ").strip()
    api_hash = input("API Hash (Enter để bỏ qua): ").strip()
    phone = input("Số điện thoại (+84xxxxxxxxx) (Enter để bỏ qua): ").strip()
    
    config_mgr.update_telegram_config(
        api_id=api_id if api_id else None,
        api_hash=api_hash if api_hash else None,
        phone_number=phone if phone else None
    )

def configure_output(config_mgr):
    """Configure output settings"""
    print("\n📁 CẤU HÌNH OUTPUT")
    print("-"*25)
    
    directory = input("Thư mục output (Enter để bỏ qua): ").strip()
    
    csv_input = input("Xuất CSV? (y/n/Enter để bỏ qua): ").strip().lower()
    csv_enabled = True if csv_input == 'y' else False if csv_input == 'n' else None
    
    json_input = input("Xuất JSON? (y/n/Enter để bỏ qua): ").strip().lower()
    json_enabled = True if json_input == 'y' else False if json_input == 'n' else None
    
    excel_input = input("Xuất Excel? (y/n/Enter để bỏ qua): ").strip().lower()
    excel_enabled = True if excel_input == 'y' else False if excel_input == 'n' else None
    
    config_mgr.update_output_config(
        directory=directory if directory else None,
        csv_enabled=csv_enabled,
        json_enabled=json_enabled,
        excel_enabled=excel_enabled
    )

def configure_scanning(config_mgr):
    """Configure scanning settings"""
    print("\n🔍 CẤU HÌNH SCANNING")
    print("-"*28)
    
    max_msg = input("Số message tối đa (Enter = không giới hạn): ").strip()
    max_messages = int(max_msg) if max_msg.isdigit() else None
    
    batch = input("Batch size (Enter để bỏ qua): ").strip()
    batch_size = int(batch) if batch.isdigit() else None
    
    config_mgr.update_scanning_config(
        max_messages=max_messages,
        batch_size=batch_size
    )

def configure_filters(config_mgr):
    """Configure filter settings"""
    print("\n🔧 CẤU HÌNH FILTERS")
    print("-"*26)

    min_size = input("Kích thước file tối thiểu (bytes, Enter để bỏ qua): ").strip()
    min_file_size = int(min_size) if min_size.isdigit() else None

    max_size = input("Kích thước file tối đa (bytes, Enter để bỏ qua): ").strip()
    max_file_size = int(max_size) if max_size.isdigit() else None

    extensions = input("Phần mở rộng cho phép (cách nhau bởi dấu phẩy, Enter để bỏ qua): ").strip()
    file_extensions = [ext.strip() for ext in extensions.split(',')] if extensions else None

    config_mgr.update_filter_config(
        min_size=min_file_size,
        max_size=max_file_size,
        extensions=file_extensions
    )

def validate_configuration():
    """Validate current configuration (wrapper function)"""
    config_mgr = ConfigManager()
    config_mgr.validate_configuration()
    input("\nNhấn Enter để tiếp tục...")

if __name__ == "__main__":
    main()
