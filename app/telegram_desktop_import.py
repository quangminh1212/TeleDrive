#!/usr/bin/env python3
"""
Telegram Desktop Session Import
Import session từ Telegram Desktop
Hỗ trợ nhiều phương pháp tùy Python version
"""

import os
import sys
import shutil
from pathlib import Path
from typing import Optional, Tuple, Dict


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


def copy_tdata_to_project(tdata_path: str, dest_folder: str = "data/telegram_desktop_backup") -> Tuple[bool, str]:
    """
    Copy tdata folder vào project để sử dụng sau
    (Workaround cho Python 3.12+)
    
    Returns:
        (success, message)
    """
    
    try:
        # Tạo folder đích
        os.makedirs(dest_folder, exist_ok=True)
        
        # Copy các file quan trọng
        important_files = ['key_data', 'key_datas', 'settings', 'settings0', 'settings1']
        copied_files = []
        
        for filename in important_files:
            src = os.path.join(tdata_path, filename)
            if os.path.exists(src):
                dst = os.path.join(dest_folder, filename)
                shutil.copy2(src, dst)
                copied_files.append(filename)
        
        # Copy account folders
        account_folders = []
        for item in os.listdir(tdata_path):
            item_path = os.path.join(tdata_path, item)
            if os.path.isdir(item_path) and len(item) == 16:
                try:
                    int(item, 16)
                    dst_folder = os.path.join(dest_folder, item)
                    if os.path.exists(dst_folder):
                        shutil.rmtree(dst_folder)
                    shutil.copytree(item_path, dst_folder)
                    account_folders.append(item)
                except (ValueError, Exception):
                    pass
        
        if not copied_files and not account_folders:
            return False, "Không có file nào được copy"
        
        message = f"Đã copy {len(copied_files)} files và {len(account_folders)} account folders vào {dest_folder}"
        return True, message
        
    except Exception as e:
        return False, f"Lỗi copy: {e}"


def get_import_info() -> Dict:
    """Lấy thông tin về khả năng import"""
    
    info = {
        'tdata_path': None,
        'can_import': False,
        'logged_in': False,
        'message': '',
        'python_version': f"{sys.version_info.major}.{sys.version_info.minor}",
        'opentele_compatible': sys.version_info < (3, 12),
        'workaround_available': True,  # Luôn có workaround
        'account_count': 0,
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
    
    # Đếm số account
    if logged_in:
        try:
            account_count = 0
            for item in os.listdir(tdata_path):
                item_path = os.path.join(tdata_path, item)
                if os.path.isdir(item_path) and len(item) == 16:
                    try:
                        int(item, 16)
                        account_count += 1
                    except ValueError:
                        pass
            info['account_count'] = account_count
        except:
            pass
    
    if logged_in:
        if info['opentele_compatible']:
            info['can_import'] = True
            info['message'] += " - Có thể import với opentele"
        else:
            info['message'] += f" - Python {info['python_version']} không tương thích với opentele"
            info['message'] += "\n   Workaround: Copy tdata và dùng Python 3.11 portable"
    
    return info


def get_workaround_instructions() -> str:
    """Lấy hướng dẫn workaround cho Python 3.12+"""
    
    return """
╔══════════════════════════════════════════════════════════════╗
║  WORKAROUND CHO PYTHON 3.12+                                 ║
╚══════════════════════════════════════════════════════════════╝

Vì opentele chỉ hoạt động với Python 3.11, có 2 cách:

┌─ CÁCH 1: Sử dụng Python 3.11 Portable (Khuyến nghị) ─────────┐
│                                                                │
│  1. Chạy: setup_portable_python.bat                           │
│     → Cài Python 3.11 portable vào thư mục python311/         │
│                                                                │
│  2. Cài opentele:                                             │
│     python311\\python.exe -m pip install opentele              │
│                                                                │
│  3. Chạy test với Python 3.11:                                │
│     python311\\python.exe tests/quick_login_test.py            │
│                                                                │
│  ✅ Ưu điểm: Không ảnh hưởng Python hiện tại                  │
│  ✅ Tự động import từ Telegram Desktop                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ CÁCH 2: Đăng nhập thủ công (Không cần opentele) ────────────┐
│                                                                │
│  1. Chạy test script bình thường                              │
│  2. Nhập số điện thoại khi được yêu cầu                       │
│  3. Nhập mã xác thực từ Telegram                              │
│  4. Session sẽ được lưu để dùng lại                           │
│                                                                │
│  ✅ Ưu điểm: Hoạt động với mọi Python version                 │
│  ⚠️  Nhược điểm: Phải nhập thông tin 1 lần                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ CÁCH 3: Copy tdata và xử lý sau ─────────────────────────────┐
│                                                                │
│  Dùng function copy_tdata_to_project() để backup tdata        │
│  Sau đó xử lý với Python 3.11 khi cần                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
"""


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
    
    if info['logged_in']:
        print(f"Account count: {info['account_count']}")
    
    print(f"Can import: {'✅ Yes' if info['can_import'] else '❌ No'}")
    print(f"\nMessage: {info['message']}")
    
    # Hiển thị workaround nếu cần
    if info['logged_in'] and not info['opentele_compatible']:
        print(get_workaround_instructions())
    
    print("\n" + "=" * 60)
