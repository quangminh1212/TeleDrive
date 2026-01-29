#!/usr/bin/env python3
"""
Import Telegram Desktop Session Script (Python 3.11 only)
Script này phải chạy với Python 3.11 do opentele không tương thích Python 3.12+

Hỗ trợ cả cấu trúc tdata cũ và mới của Telegram Desktop.

Usage: python311/python.exe app/import_tdesktop_session.py [output_session_path]
Output: JSON result to stdout
"""

import os
import sys
import json
import asyncio
from pathlib import Path

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'replace')


def find_telegram_desktop_tdata():
    """Tìm thư mục tdata của Telegram Desktop"""
    possible_paths = []
    
    if sys.platform == 'win32':
        appdata = os.getenv('APPDATA')
        if appdata:
            possible_paths.append(os.path.join(appdata, 'Telegram Desktop', 'tdata'))
    elif sys.platform == 'darwin':
        home = os.path.expanduser('~')
        possible_paths.append(os.path.join(home, 'Library', 'Application Support', 'Telegram Desktop', 'tdata'))
    else:
        home = os.path.expanduser('~')
        possible_paths.extend([
            os.path.join(home, '.local', 'share', 'TelegramDesktop', 'tdata'),
            os.path.join(home, '.var', 'app', 'org.telegram.desktop', 'data', 'TelegramDesktop', 'tdata'),
        ])
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None


def check_tdata_structure(tdata_path: str) -> dict:
    """Kiểm tra cấu trúc tdata và xác định version"""
    result = {
        'version': 'unknown',
        'has_key_data': False,
        'has_user_data': False,
        'hex_folders': [],
        'user_data_folders': [],
        'can_import': False,
        'message': ''
    }
    
    if not os.path.exists(tdata_path):
        result['message'] = 'Thư mục tdata không tồn tại'
        return result
    
    # Kiểm tra key_data/key_datas
    result['has_key_data'] = (
        os.path.exists(os.path.join(tdata_path, 'key_data')) or
        os.path.exists(os.path.join(tdata_path, 'key_datas'))
    )
    
    # Tìm các folders
    for item in os.listdir(tdata_path):
        item_path = os.path.join(tdata_path, item)
        if os.path.isdir(item_path):
            # 16-char hex folders (cũ)
            if len(item) == 16:
                try:
                    int(item, 16)
                    result['hex_folders'].append(item)
                except ValueError:
                    pass
            # user_data folders (mới)
            elif item.startswith('user_data'):
                result['user_data_folders'].append(item)
    
    # Xác định version và khả năng import
    # Telegram Desktop mới sử dụng user_data folders
    if result['user_data_folders']:
        result['version'] = 'new'
        result['can_import'] = False
        result['message'] = f'Cấu trúc tdata mới - {len(result["user_data_folders"])} accounts (opentele chưa hỗ trợ)'
    elif result['hex_folders'] and result['has_key_data']:
        result['version'] = 'old'
        result['can_import'] = True
        result['message'] = f'Cấu trúc tdata cũ - {len(result["hex_folders"])} accounts'
    else:
        result['message'] = 'Không tìm thấy account nào trong Telegram Desktop'
    
    return result


async def import_session_old_structure(tdata_path: str, output_session_path: str):
    """Import session từ tdata cấu trúc cũ bằng opentele"""
    try:
        from opentele.td import TDesktop
        from opentele.api import UseCurrentSession
        
        tdesk = TDesktop(tdata_path)
        
        if not tdesk.isLoaded():
            return {
                'success': False,
                'message': 'Telegram Desktop chưa đăng nhập'
            }
        
        # Đảm bảo thư mục output tồn tại
        output_dir = os.path.dirname(output_session_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        # Convert to Telethon session
        client = await tdesk.ToTelethon(
            session=output_session_path,
            flag=UseCurrentSession
        )
        
        await client.connect()
        
        if await client.is_user_authorized():
            me = await client.get_me()
            
            result = {
                'success': True,
                'message': 'Import session thành công',
                'user': {
                    'id': me.id,
                    'username': me.username,
                    'first_name': me.first_name,
                    'last_name': me.last_name,
                    'phone': me.phone
                },
                'session_path': output_session_path + '.session'
            }
            
            await client.disconnect()
            return result
        else:
            await client.disconnect()
            return {
                'success': False,
                'message': 'Không thể xác thực session'
            }
            
    except Exception as e:
        error_msg = str(e)
        if "No account has been loaded" in error_msg:
            return {
                'success': False,
                'message': 'Không thể load account từ Telegram Desktop. Vui lòng đảm bảo Telegram Desktop đã đóng hoàn toàn.'
            }
        return {
            'success': False,
            'message': f'Lỗi import: {error_msg}'
        }


def import_session_sync(output_session_path: str = "data/session"):
    """Import session từ Telegram Desktop - synchronous wrapper"""
    result = {
        'success': False,
        'message': '',
        'user': None
    }
    
    try:
        # Kiểm tra Python version
        if sys.version_info >= (3, 12):
            result['message'] = f'Python {sys.version_info.major}.{sys.version_info.minor} không hỗ trợ. Cần Python 3.11'
            return result
        
        # Tìm Telegram Desktop
        tdata_path = find_telegram_desktop_tdata()
        if not tdata_path:
            result['message'] = 'Không tìm thấy Telegram Desktop'
            return result
        
        # Kiểm tra cấu trúc tdata TRƯỚC KHI import opentele
        structure = check_tdata_structure(tdata_path)
        
        if structure['version'] == 'new':
            # Telegram Desktop phiên bản mới - opentele chưa hỗ trợ
            result['message'] = (
                'Telegram Desktop new version detected. '
                'The new tdata structure (user_data) is not yet supported by opentele library. '
                'Please use manual login with phone number instead.'
            )
            result['hint'] = (
                'Your Telegram Desktop uses the new data format which is not compatible with auto-import. '
                'Please login manually using your phone number.'
            )
            result['structure'] = structure
            return result
        
        if not structure['can_import']:
            result['message'] = structure['message']
            return result
        
        # Chỉ import opentele khi cấu trúc cũ
        return asyncio.run(import_session_old_structure(tdata_path, output_session_path))
        
    except Exception as e:
        result['message'] = f'Lỗi: {str(e)}'
    
    return result


def main():
    # Parse arguments
    output_path = "data/session"
    if len(sys.argv) > 1:
        output_path = sys.argv[1]
    
    # Run import
    result = import_session_sync(output_path)
    
    # Output JSON result
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
