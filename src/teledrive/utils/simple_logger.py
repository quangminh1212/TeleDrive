#!/usr/bin/env python3
"""
Simple Logger cho TeleDrive
Logger đơn giản với ít log không cần thiết
"""

import logging
import sys
from pathlib import Path


def setup_simple_logging():
    """Setup logging đơn giản và sạch sẽ"""
    
    # Tạo thư mục logs
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Tắt các logger không cần thiết
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    logging.getLogger('urllib3').setLevel(logging.ERROR)
    logging.getLogger('requests').setLevel(logging.ERROR)
    logging.getLogger('telethon').setLevel(logging.ERROR)
    logging.getLogger('asyncio').setLevel(logging.ERROR)
    
    # Setup root logger với format đơn giản
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S',
        handlers=[
            logging.FileHandler('logs/teledrive.log', encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Tạo logger cho TeleDrive
    logger = logging.getLogger('teledrive')
    logger.setLevel(logging.INFO)
    
    return logger


def get_simple_logger(name='teledrive'):
    """Lấy simple logger"""
    return logging.getLogger(name)


# Setup global simple logger
setup_simple_logging()
