#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart Logger for TeleDrive
Chỉ log những thông tin cần thiết, bỏ qua spam logs
"""

import logging
import sys
from datetime import datetime
from typing import Optional

class SmartLogger:
    """Logger thông minh - chỉ log những gì cần thiết"""
    
    def __init__(self, name: str = "teledrive", level: str = "INFO"):
        self.name = name
        self.level = level
        self._setup_logger()
        
        # Danh sách các message cần bỏ qua
        self.ignore_patterns = [
            "GET /static/",
            "POST /static/",
            "favicon.ico",
            "127.0.0.1",
            "localhost",
            "werkzeug",
            "urllib3",
            "requests",
            "asyncio",
            "telethon.network",
            "telethon.client",
            "Connection pool is full",
            "Starting new HTTP connection",
            "Resetting dropped connection",
        ]
        
        # Chỉ log những event quan trọng
        self.important_events = [
            "login",
            "logout", 
            "admin",
            "error",
            "exception",
            "failed",
            "success",
            "started",
            "stopped",
            "connected",
            "disconnected",
            "scan",
            "download",
            "upload",
            "delete",
            "create",
            "update"
        ]
    
    def _setup_logger(self):
        """Setup logger với format đẹp"""
        self.logger = logging.getLogger(self.name)
        self.logger.setLevel(getattr(logging, self.level.upper()))
        
        # Xóa handlers cũ
        for handler in self.logger.handlers[:]:
            self.logger.removeHandler(handler)
        
        # Tạo handler mới
        handler = logging.StreamHandler(sys.stdout)
        
        # Format đẹp và ngắn gọn
        formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%H:%M:%S'
        )
        handler.setFormatter(formatter)
        
        self.logger.addHandler(handler)
        self.logger.propagate = False
    
    def _should_log(self, message: str) -> bool:
        """Kiểm tra xem có nên log message này không"""
        message_lower = message.lower()
        
        # Bỏ qua các pattern không cần thiết
        for pattern in self.ignore_patterns:
            if pattern.lower() in message_lower:
                return False
        
        # Chỉ log các event quan trọng
        for event in self.important_events:
            if event in message_lower:
                return True
        
        # Log các level cao (WARNING, ERROR)
        return True
    
    def info(self, message: str, **kwargs):
        """Log info message nếu cần thiết"""
        if self._should_log(message):
            self.logger.info(message)
    
    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self.logger.warning(message)
    
    def error(self, message: str, **kwargs):
        """Log error message"""
        self.logger.error(message)
    
    def debug(self, message: str, **kwargs):
        """Log debug message nếu cần thiết"""
        if self._should_log(message):
            self.logger.debug(message)
    
    def critical(self, message: str, **kwargs):
        """Log critical message"""
        self.logger.critical(message)

# Global smart logger instance
smart_logger = SmartLogger()

def get_smart_logger(name: Optional[str] = None) -> SmartLogger:
    """Get smart logger instance"""
    if name:
        return SmartLogger(name)
    return smart_logger

def setup_smart_logging():
    """Setup smart logging cho toàn bộ ứng dụng"""
    
    # Tắt các logger spam
    spam_loggers = [
        'werkzeug',
        'urllib3.connectionpool',
        'requests.packages.urllib3.connectionpool',
        'telethon.network.mtprotosender',
        'telethon.client.telegramclient',
        'asyncio',
        'concurrent.futures'
    ]
    
    for logger_name in spam_loggers:
        logging.getLogger(logger_name).setLevel(logging.WARNING)
        logging.getLogger(logger_name).disabled = True
    
    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Chỉ giữ lại handler của smart logger
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    print("✅ Smart logging initialized - chỉ log những gì cần thiết")

def log_important(message: str, level: str = "INFO"):
    """Log message quan trọng"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    level_colors = {
        "INFO": "💡",
        "SUCCESS": "✅", 
        "WARNING": "⚠️",
        "ERROR": "❌",
        "DEBUG": "🔍"
    }
    
    icon = level_colors.get(level.upper(), "📝")
    print(f"{timestamp} {icon} {message}")

def log_startup(message: str):
    """Log startup message"""
    log_important(message, "SUCCESS")

def log_error_important(message: str):
    """Log error quan trọng"""
    log_important(message, "ERROR")

def log_warning_important(message: str):
    """Log warning quan trọng"""
    log_important(message, "WARNING")

def log_debug_important(message: str):
    """Log debug quan trọng"""
    log_important(message, "DEBUG")
