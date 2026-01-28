#!/usr/bin/env python3
"""
Telegram Desktop Session Import
Import session từ Telegram Desktop mà không cần opentele
Tương thích với tất cả phiên bản Python
"""

import os
import sys
from pathlib import Path
from typing import Optional, Tuple


def find_telegram_desktop_tdata() -> Optional[str]:
    """Tìm thư mục tdata của Telegram Desktop"""
    
    # Các đường dẫn có thể có
    possible_paths = []
    
    if sys.platform == 'win32':
        # Windows
        appdata = os.getenv('APPDATA')
        if appdata:
            possible_paths.append(os.path.join(appdata, 'Telegram Desktop', 'tdata'))
    
    elif sys.platform == 'darwin':
        # macOS
        home = os.path.expanduser('~')
        possible_paths.append(os.path.join(home, 'Library', 'Application Support', 'Telegram Desktop', 'tdata'))
    
    else:
        # Linux
        home = os.path.expanduser('~')
        possible_paths.extend([
            os.path.join(home, '.local', 'share', 'TelegramDesktop', 'tdata'),
            os.path.join(home, '.var', 'app', 'org.telegram.desktop', 'data', 'TelegramDesktop', 'tdata'),
        ])
    
    # Tìm path tồn tại
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None


def check_telegram_desktop_logged_in(tdata_path: str) -> Tuple[bool, str]:
    """
    Kiểm tra xem Telegram Desktop đã đăng nhập chưa
    
    Returns:
        (is_logged_in, message)
    """
    
    if not os.path.exists(tdata_path):
        return False, "Thư mục tdata không tồn tại"
    
    # Kiểm tra các file/folder cần thiết
    required_items = []
    
    # Tìm các folder account (dạng D877F783D5D3EF8C)
    account_folders = []
    try:
        for item in os.listdir(tdata_path):
            item_path = os.path.join(tdata_path, item)
            if os.path.isdir(item_path) and len(item) == 16:
                # Folder có tên 16 ký tự hex
                try:
                    int(item, 16)  # Kiểm tra có phải hex không
                    account_folders.append(item)
                except ValueError:
                    pass
    except Exception as e:
        return False, f"Không thể đọc thư mục tdata: {e}"
    
    if not account_folders:
        return False, "Không tìm thấy account nào trong Telegram Desktop"
    
    # Kiểm tra key_data hoặc key_datas
    has_key_data = (
        os.path.exists(os.path.join(tdata_path, 'key_data')) or
        os.path.exists(os.path.join(tdata_path, 'key_datas'))
    )
    
    if not has_key_data:
        return False, "Không tìm thấy key_data (Telegram Desktop chưa đăng nhập)"
    
    return True, f"Tìm thấy {len(account_folders)} account(s)"


async def try_import_with_opentele(tdata_path: str, session_file: str):
    """
    Thử import bằng opentele (chỉ hoạt động với Python 3.11)
    
    Returns:
        (success, client_or_error_message)
    """
    
    try:
        # Kiểm tra Python version
        if sys.version_info >= (3, 12):
            return False, f"opentele không tương thích với Python {sys.version_info.major}.{sys.version_info.minor} (chỉ hỗ trợ 3.11)"
        
        # Import opentele
        try:
            from opentele.td import TDesktop
            from opentele.api import UseCurrentSession
        except ImportError:
            return False, "opentele chưa được cài đặt (pip install opentele)"
        except BaseException as e:
            return False, f"opentele không tương thích: {e}"
        
        # Load TDesktop
        tdesk = TDesktop(tdata_path)
        
        if not tdesk.isLoaded():
            return False, "Telegram Desktop chưa đăng nhập"
        
        # Convert sang Telethon
        client = await tdesk.ToTelethon(
            session=session_file,
            flag=UseCurrentSession
        )
        
        return True, client
        
    except Exception as e:
        return False, f"Lỗi import: {e}"


def get_import_info() -> dict:
    """Lấy thông tin về khả năng import"""
    
    info = {
        'tdata_path': None,
        'can_import': False,
        'logged_in': False,
        'message': '',
        'python_version': f"{sys.version_info.major}.{sys.version_info.minor}",
        'opentele_compatible': sys.version_info < (3, 12),
    }
    
    # Tìm tdata
    tdata_path = find_telegram_desktop_tdata()
    info['tdata_path'] = tdata_path
    
    if not tdata_path:
        info['message'] = "Không tìm thấy Telegram Desktop"
        return info
    
    # Kiểm tra đã đăng nhập chưa
    logged_in, message = check_telegram_desktop_logged_in(tdata_path)
    info['logged_in'] = logged_in
    info['message'] = message
    
    if logged_in:
        if info['opentele_compatible']:
            info['can_import'] = True
            info['message'] += " - Có thể import với opentele"
        else:
            info['message'] += f" - Không thể import (Python {info['python_version']} không tương thích với opentele)"
    
    return info


if __name__ == "__main__":
    """Test module"""
    print("=" * 60)
    print("Telegram Desktop Import Info")
    print("=" * 60)
    
    info = get_import_info()
    
    print(f"\nPython Version: {info['python_version']}")
    print(f"opentele Compatible: {'✅ Yes' if info['opentele_compatible'] else '❌ No (requires Python 3.11)'}")
    print(f"\nTelegram Desktop tdata: {info['tdata_path'] or '❌ Not found'}")
    print(f"Logged in: {'✅ Yes' if info['logged_in'] else '❌ No'}")
    print(f"Can import: {'✅ Yes' if info['can_import'] else '❌ No'}")
    print(f"\nMessage: {info['message']}")
    
    print("\n" + "=" * 60)
