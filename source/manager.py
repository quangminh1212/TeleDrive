#!/usr/bin/env python3
"""
Config Manager cho Telegram File Scanner
Quản lý cấu hình trong config.json với validation
"""

import json
import os
import re
from datetime import datetime
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
    
    def load_config(self):
        """Load configuration from JSON file"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Không tìm thấy {self.config_file}")
            return self.get_default_config()
        except json.JSONDecodeError as e:
            print(f"Lỗi đọc {self.config_file}: {e}")
            return self.get_default_config()
    
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
        """Get default configuration"""
        return {
            "telegram": {
                "api_id": "",
                "api_hash": "",
                "phone_number": "",
                "session_name": "session"
            },
            "output": {
                "directory": "output",
                "formats": {
                    "csv": {"enabled": True, "filename": "telegram_files.csv"},
                    "json": {"enabled": True, "filename": "telegram_files.json"},
                    "excel": {"enabled": True, "filename": "telegram_files.xlsx"}
                }
            },
            "scanning": {
                "max_messages": None,
                "batch_size": 100,
                "file_types": {
                    "documents": True, "photos": True, "videos": True,
                    "audio": True, "voice": True, "stickers": True, "animations": True
                }
            },
            "download": {
                "generate_links": True, "include_preview": False,
                "auto_download": False, "download_directory": "downloads"
            },
            "display": {
                "show_progress": True, "show_file_details": True,
                "language": "vi", "date_format": "DD/MM/YYYY HH:mm:ss"
            },
            "filters": {
                "min_file_size": 0, "max_file_size": None,
                "file_extensions": [], "exclude_extensions": [],
                "date_from": None, "date_to": None
            }
        }

    def load_env_vars(self):
        """Load environment variables from .env file"""
        load_dotenv()
        return {
            'api_id': os.getenv('TELEGRAM_API_ID', ''),
            'api_hash': os.getenv('TELEGRAM_API_HASH', ''),
            'phone_number': os.getenv('TELEGRAM_PHONE', ''),
            'session_name': os.getenv('TELEGRAM_SESSION_NAME', 'session'),
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
