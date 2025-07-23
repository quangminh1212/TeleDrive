#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple Logger for TeleDrive
Cung cấp chức năng logging đơn giản cho TeleDrive
"""

import os
import logging
from pathlib import Path
from datetime import datetime

def setup_simple_logging(log_level='INFO'):
    """Thiết lập logging đơn giản"""
    # Tạo thư mục logs nếu chưa tồn tại
    log_dir = Path('logs')
    log_dir.mkdir(exist_ok=True)
    
    # Tạo tên file log với timestamp
    timestamp = datetime.now().strftime('%Y%m%d')
    log_file = log_dir / f'teledrive_{timestamp}.log'
    
    # Cấu hình logging
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()  # Log to console as well
        ]
    )
    
    # Tắt các logger không cần thiết
    for logger_name in ['werkzeug', 'urllib3', 'requests', 'telethon']:
        logging.getLogger(logger_name).setLevel(logging.WARNING)
    
    # Tạo logger chính
    logger = logging.getLogger('teledrive')
    logger.info(f"Simple logging initialized. Log file: {log_file}")
    
    return logger

def get_logger(name='teledrive'):
    """Lấy logger theo tên"""
    return logging.getLogger(name)

# Hàm tiện ích để log các sự kiện
def log_info(message, module='app'):
    """Log thông tin"""
    logger = get_logger(f'teledrive.{module}')
    logger.info(message)

def log_warning(message, module='app'):
    """Log cảnh báo"""
    logger = get_logger(f'teledrive.{module}')
    logger.warning(message)

def log_error(message, module='app', exc_info=False):
    """Log lỗi"""
    logger = get_logger(f'teledrive.{module}')
    logger.error(message, exc_info=exc_info)

def log_debug(message, module='app'):
    """Log debug"""
    logger = get_logger(f'teledrive.{module}')
    logger.debug(message) 