#!/usr/bin/env python3
"""
Config Validator cho Telegram File Scanner
Validation và kiểm tra tính hợp lệ của cấu hình
"""

import re
import os
import json
from typing import Dict, Any, List, Optional, Union
from datetime import datetime

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
        
        # Validate optional numeric fields
        numeric_fields = {
            'TELEGRAM_CONNECTION_TIMEOUT': (1, 300),
            'TELEGRAM_REQUEST_TIMEOUT': (1, 600),
            'TELEGRAM_RETRY_ATTEMPTS': (1, 10),
            'TELEGRAM_RETRY_DELAY': (1, 60)
        }
        
        for field, (min_val, max_val) in numeric_fields.items():
            if field in env_vars:
                try:
                    value = int(env_vars[field])
                    if not (min_val <= value <= max_val):
                        self.warnings.append(f"{field} nên trong khoảng {min_val}-{max_val}")
                except ValueError:
                    self.errors.append(f"{field} phải là số nguyên")
        
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
        
        # Validate schema version
        if '_schema_version' not in config:
            self.warnings.append("Thiếu _schema_version")
        
        # Validate required sections
        required_sections = ['telegram', 'output', 'scanning', 'download', 'display', 'filters']
        for section in required_sections:
            if section not in config:
                self.errors.append(f"Thiếu section '{section}'")
        
        # Validate telegram section
        if 'telegram' in config:
            self._validate_telegram_section(config['telegram'])
        
        # Validate output section
        if 'output' in config:
            self._validate_output_section(config['output'])
        
        # Validate scanning section
        if 'scanning' in config:
            self._validate_scanning_section(config['scanning'])
        
        # Validate download section
        if 'download' in config:
            self._validate_download_section(config['download'])
        
        # Validate display section
        if 'display' in config:
            self._validate_display_section(config['display'])
        
        # Validate filters section
        if 'filters' in config:
            self._validate_filters_section(config['filters'])
        
        return len(self.errors) == 0
    
    def _validate_telegram_section(self, telegram: Dict[str, Any]):
        """Validate telegram section"""
        # Validate timeouts
        timeout_fields = {
            'connection_timeout': (1, 300),
            'request_timeout': (1, 600),
            'retry_attempts': (1, 10),
            'retry_delay': (1, 60),
            'flood_sleep_threshold': (1, 3600)
        }
        
        for field, (min_val, max_val) in timeout_fields.items():
            if field in telegram:
                value = telegram[field]
                if not isinstance(value, int) or not (min_val <= value <= max_val):
                    self.errors.append(f"telegram.{field} phải là số nguyên trong khoảng {min_val}-{max_val}")
    
    def _validate_output_section(self, output: Dict[str, Any]):
        """Validate output section"""
        # Validate directory
        if 'directory' in output:
            directory = output['directory']
            if not isinstance(directory, str) or not directory.strip():
                self.errors.append("output.directory phải là chuỗi không rỗng")
        
        # Validate formats
        if 'formats' in output:
            formats = output['formats']
            required_formats = ['csv', 'json', 'excel']
            for fmt in required_formats:
                if fmt not in formats:
                    self.warnings.append(f"Thiếu format '{fmt}' trong output.formats")
                elif not isinstance(formats[fmt], dict):
                    self.errors.append(f"output.formats.{fmt} phải là object")
                elif 'enabled' not in formats[fmt]:
                    self.warnings.append(f"Thiếu 'enabled' trong output.formats.{fmt}")
    
    def _validate_scanning_section(self, scanning: Dict[str, Any]):
        """Validate scanning section"""
        # Validate batch_size
        if 'batch_size' in scanning:
            batch_size = scanning['batch_size']
            if not isinstance(batch_size, int) or not (1 <= batch_size <= 1000):
                self.errors.append("scanning.batch_size phải là số nguyên trong khoảng 1-1000")
        
        # Validate max_messages
        if 'max_messages' in scanning and scanning['max_messages'] is not None:
            max_messages = scanning['max_messages']
            if not isinstance(max_messages, int) or max_messages <= 0:
                self.errors.append("scanning.max_messages phải là số nguyên dương hoặc null")
        
        # Validate file_types
        if 'file_types' in scanning:
            file_types = scanning['file_types']
            if not isinstance(file_types, dict):
                self.errors.append("scanning.file_types phải là object")
            else:
                for file_type, enabled in file_types.items():
                    if not isinstance(enabled, bool):
                        self.errors.append(f"scanning.file_types.{file_type} phải là boolean")
    
    def _validate_download_section(self, download: Dict[str, Any]):
        """Validate download section"""
        # Validate max_file_size_mb
        if 'max_file_size_mb' in download:
            max_size = download['max_file_size_mb']
            if not isinstance(max_size, (int, float)) or max_size <= 0:
                self.errors.append("download.max_file_size_mb phải là số dương")
        
        # Validate extensions
        for field in ['allowed_extensions', 'blocked_extensions']:
            if field in download:
                extensions = download[field]
                if not isinstance(extensions, list):
                    self.errors.append(f"download.{field} phải là array")
                elif not all(isinstance(ext, str) for ext in extensions):
                    self.errors.append(f"download.{field} phải chứa các chuỗi")
    
    def _validate_display_section(self, display: Dict[str, Any]):
        """Validate display section"""
        # Validate language
        if 'language' in display:
            language = display['language']
            valid_languages = ['vi', 'en', 'auto']
            if language not in valid_languages:
                self.warnings.append(f"display.language nên là một trong: {valid_languages}")
        
        # Validate log_level
        if 'log_level' in display:
            log_level = display['log_level']
            valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
            if log_level not in valid_levels:
                self.errors.append(f"display.log_level phải là một trong: {valid_levels}")
    
    def _validate_filters_section(self, filters: Dict[str, Any]):
        """Validate filters section"""
        # Validate file sizes
        for field in ['min_file_size', 'max_file_size']:
            if field in filters and filters[field] is not None:
                size = filters[field]
                if not isinstance(size, (int, float)) or size < 0:
                    self.errors.append(f"filters.{field} phải là số không âm hoặc null")
        
        # Validate arrays
        array_fields = ['file_extensions', 'exclude_extensions', 'filename_patterns', 'exclude_patterns']
        for field in array_fields:
            if field in filters:
                value = filters[field]
                if not isinstance(value, list):
                    self.errors.append(f"filters.{field} phải là array")
                elif not all(isinstance(item, str) for item in value):
                    self.errors.append(f"filters.{field} phải chứa các chuỗi")
    
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
    
    def validate_all(self) -> bool:
        """Validate both .env and config.json"""
        env_valid = self.validate_env_file()
        config_valid = self.validate_config_json()
        return env_valid and config_valid

def main():
    """Main validation function"""
    validator = ConfigValidator()
    
    print("🔍 KIỂM TRA CẤU HÌNH")
    print("=" * 50)
    
    # Validate .env
    print("\n📄 Kiểm tra .env...")
    env_valid = validator.validate_env_file()
    if not env_valid:
        print(validator.get_validation_report())
    else:
        print("✅ .env hợp lệ!")
    
    # Validate config.json
    print("\n📄 Kiểm tra config.json...")
    config_valid = validator.validate_config_json()
    if not config_valid:
        print(validator.get_validation_report())
    else:
        print("✅ config.json hợp lệ!")
    
    # Overall result
    print("\n" + "=" * 50)
    if env_valid and config_valid:
        print("🎉 TẤT CẢ CẤU HÌNH HỢP LỆ!")
        return True
    else:
        print("❌ CÓ LỖI TRONG CẤU HÌNH!")
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
