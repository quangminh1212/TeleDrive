#!/usr/bin/env python3
"""
Advanced Logging System cho Telegram File Scanner
Hỗ trợ logging chi tiết cho từng bước và module
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import json


class DetailedLogger:
    """Logger chi tiết với nhiều level và file riêng biệt"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.loggers = {}
        self.setup_logging()
    
    def setup_logging(self):
        """Thiết lập logging system"""
        # Tạo thư mục logs
        logs_dir = Path("logs")
        logs_dir.mkdir(exist_ok=True)
        
        # Cấu hình format chi tiết
        detailed_format = logging.Formatter(
            self.config.get('format', 
                '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s')
        )
        
        simple_format = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        
        # Setup main logger
        self.main_logger = self._create_logger(
            'main', 
            self.config.get('file', 'logs/scanner.log'),
            detailed_format
        )
        
        # Setup specialized loggers nếu enabled
        if self.config.get('separate_files', {}).get('enabled', False):
            separate_files = self.config['separate_files']
            
            self.config_logger = self._create_logger(
                'config', 
                separate_files.get('config_log', 'logs/config.log'),
                detailed_format
            )
            
            self.api_logger = self._create_logger(
                'api', 
                separate_files.get('api_log', 'logs/api.log'),
                detailed_format
            )
            
            self.files_logger = self._create_logger(
                'files', 
                separate_files.get('files_log', 'logs/files.log'),
                detailed_format
            )
            
            self.errors_logger = self._create_logger(
                'errors', 
                separate_files.get('errors_log', 'logs/errors.log'),
                detailed_format,
                level=logging.ERROR
            )
    
    def _create_logger(self, name: str, filename: str, formatter: logging.Formatter, 
                      level: Optional[int] = None) -> logging.Logger:
        """Tạo logger với cấu hình chi tiết"""
        logger = logging.getLogger(name)
        
        # Set level
        if level is None:
            level_str = self.config.get('level', 'INFO').upper()
            level = getattr(logging, level_str, logging.INFO)
        logger.setLevel(level)
        
        # Clear existing handlers
        logger.handlers.clear()
        
        # File handler với rotation
        file_handler = logging.handlers.RotatingFileHandler(
            filename,
            maxBytes=self.config.get('max_size_mb', 10) * 1024 * 1024,
            backupCount=self.config.get('backup_count', 5),
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        # Console handler nếu enabled
        if self.config.get('console_output', True):
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(formatter)
            logger.addHandler(console_handler)
        
        self.loggers[name] = logger
        return logger
    
    def log_step(self, step_name: str, details: str = "", level: str = "INFO"):
        """Log một bước cụ thể với format đặc biệt"""
        if not self.config.get('detailed_steps', True):
            return

        separator = "=" * 60
        timestamp = datetime.now().strftime("%H:%M:%S")

        message = f"\n{separator}\n[{timestamp}] BƯỚC: {step_name}\n{separator}"
        if details:
            message += f"\nChi tiết: {details}"
        message += f"\n{separator}"

        # Map custom levels to standard logging levels
        level_mapping = {
            'success': 'info',
            'debug': 'debug',
            'info': 'info',
            'warning': 'warning',
            'error': 'error',
            'critical': 'critical'
        }

        actual_level = level_mapping.get(level.lower(), 'info')
        getattr(self.main_logger, actual_level)(message)
    
    def log_config_change(self, action: str, details: Dict[str, Any]):
        """Log thay đổi cấu hình"""
        if not self.config.get('log_config_changes', True):
            return
            
        if hasattr(self, 'config_logger'):
            self.config_logger.info(f"CONFIG {action}: {json.dumps(details, ensure_ascii=False, indent=2)}")
        else:
            self.main_logger.info(f"CONFIG {action}: {details}")
    
    def log_api_call(self, method: str, params: Dict[str, Any], result: str = ""):
        """Log API calls"""
        if not self.config.get('log_api_calls', True):
            return
            
        if hasattr(self, 'api_logger'):
            self.api_logger.debug(f"API CALL: {method} | Params: {params} | Result: {result}")
        else:
            self.main_logger.debug(f"API CALL: {method} | Params: {params}")
    
    def log_file_operation(self, operation: str, file_path: str, details: str = ""):
        """Log file operations"""
        if not self.config.get('log_file_operations', True):
            return
            
        if hasattr(self, 'files_logger'):
            self.files_logger.info(f"FILE {operation}: {file_path} | {details}")
        else:
            self.main_logger.info(f"FILE {operation}: {file_path}")
    
    def log_progress(self, current: int, total: int, item_name: str = "items"):
        """Log progress với chi tiết"""
        if not self.config.get('show_progress_details', True):
            return
            
        percentage = (current / total * 100) if total > 0 else 0
        self.main_logger.info(f"PROGRESS: {current}/{total} {item_name} ({percentage:.1f}%)")
    
    def log_error(self, error: Exception, context: str = ""):
        """Log lỗi chi tiết"""
        import traceback
        
        error_details = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context,
            'traceback': traceback.format_exc()
        }
        
        if hasattr(self, 'errors_logger'):
            self.errors_logger.error(f"ERROR: {json.dumps(error_details, ensure_ascii=False, indent=2)}")
        else:
            self.main_logger.error(f"ERROR in {context}: {error}")
            self.main_logger.debug(traceback.format_exc())
    
    def get_logger(self, name: str = 'main') -> logging.Logger:
        """Lấy logger theo tên"""
        return self.loggers.get(name, self.main_logger)


# Global logger instance
_detailed_logger: Optional[DetailedLogger] = None


def setup_detailed_logging(config: Dict[str, Any]) -> DetailedLogger:
    """Setup global detailed logger"""
    global _detailed_logger
    _detailed_logger = DetailedLogger(config)
    return _detailed_logger


def get_logger(name: str = 'main') -> logging.Logger:
    """Lấy logger instance"""
    if _detailed_logger is None:
        # Fallback to basic logging
        logging.basicConfig(level=logging.INFO)
        return logging.getLogger(name)
    return _detailed_logger.get_logger(name)


def log_step(step_name: str, details: str = "", level: str = "INFO"):
    """Log step với global logger"""
    if _detailed_logger:
        _detailed_logger.log_step(step_name, details, level)


def log_config_change(action: str, details: Dict[str, Any]):
    """Log config change với global logger"""
    if _detailed_logger:
        _detailed_logger.log_config_change(action, details)


def log_api_call(method: str, params: Dict[str, Any], result: str = ""):
    """Log API call với global logger"""
    if _detailed_logger:
        _detailed_logger.log_api_call(method, params, result)


def log_file_operation(operation: str, file_path: str, details: str = ""):
    """Log file operation với global logger"""
    if _detailed_logger:
        _detailed_logger.log_file_operation(operation, file_path, details)


def log_progress(current: int, total: int, item_name: str = "items"):
    """Log progress với global logger"""
    if _detailed_logger:
        _detailed_logger.log_progress(current, total, item_name)


def log_error(error: Exception, context: str = ""):
    """Log error với global logger"""
    if _detailed_logger:
        _detailed_logger.log_error(error, context)
