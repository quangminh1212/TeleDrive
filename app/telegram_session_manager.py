#!/usr/bin/env python3
"""
Telegram Session Manager
Quản lý session Telegram với hỗ trợ auto-import từ Telegram Desktop
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any

class TelegramSessionManager:
    """Quản lý session Telegram"""
    
    def __init__(self):
        self.session_paths = [
            "data/session.session",
            "session.session",
            "../data/session.session"
        ]
        self.telegram_desktop_paths = [
            os.path.expandvars(r"%APPDATA%\Telegram Desktop\tdata"),
            os.path.expanduser("~/AppData/Roaming/Telegram Desktop/tdata"),
        ]
    
    def find_session(self) -> Optional[str]:
        """Tìm session file hiện có"""
        for session_path in self.session_paths:
            if os.path.exists(session_path):
                return session_path
        return None
    
    def find_telegram_desktop(self) -> Optional[str]:
        """Tìm Telegram Desktop tdata"""
        for tdata_path in self.telegram_desktop_paths:
            expanded_path = os.path.expandvars(tdata_path)
            if os.path.exists(expanded_path):
                return expanded_path
        return None
    
    async def check_session_valid(self, session_path: str) -> bool:
        """Kiểm tra session có hợp lệ không"""
        try:
            from telethon import TelegramClient
            import config
            
            # Xóa .session extension nếu có
            session_path = session_path.replace('.session', '')
            
            # Lấy API credentials
            api_id = int(config.API_ID) if hasattr(config, 'API_ID') and config.API_ID else 0
            api_hash = config.API_HASH if hasattr(config, 'API_HASH') and config.API_HASH else ""
            
            client = TelegramClient(session_path, api_id, api_hash)
            
            await client.connect()
            is_authorized = await client.is_user_authorized()
            await client.disconnect()
            
            return is_authorized
        except Exception as e:
            print(f"⚠️  Lỗi kiểm tra session: {e}")
            return False
    
    async def auto_import_from_desktop(self) -> bool:
        """Tự động import session từ Telegram Desktop"""
        try:
            print("🔄 Đang tự động import session từ Telegram Desktop...")
            
            tdata_path = self.find_telegram_desktop()
            if not tdata_path:
                print("❌ Không tìm thấy Telegram Desktop")
                return False
            
            print(f"✅ Tìm thấy Telegram Desktop: {tdata_path}")
            
            # Import opentele
            try:
                from opentele.td import TDesktop
                from opentele.api import UseCurrentSession
            except ImportError:
                print("❌ Chưa cài đặt opentele")
                print("Chạy: pip install opentele")
                return False
            
            # Load TDesktop session
            tdesk = TDesktop(tdata_path)
            
            if not tdesk.isLoaded():
                print("❌ Telegram Desktop chưa đăng nhập")
                return False
            
            print("✅ Đã load session từ Telegram Desktop")
            
            # Convert to Telethon
            session_file = "data/session"
            client = await tdesk.ToTelethon(
                session=session_file,
                flag=UseCurrentSession
            )
            
            await client.connect()
            
            if await client.is_user_authorized():
                me = await client.get_me()
                print(f"✅ Import thành công! Tài khoản: {me.first_name}")
                await client.disconnect()
                return True
            else:
                print("❌ Không thể authorize")
                await client.disconnect()
                return False
                
        except Exception as e:
            print(f"❌ Lỗi auto-import: {e}")
            return False
    
    async def ensure_session(self) -> Dict[str, Any]:
        """Đảm bảo có session hợp lệ"""
        result = {
            'success': False,
            'session_path': None,
            'message': '',
            'auto_imported': False
        }
        
        # Kiểm tra session hiện có
        session_path = self.find_session()
        
        if session_path:
            print(f"✅ Tìm thấy session: {session_path}")
            
            # Kiểm tra session có hợp lệ không
            if await self.check_session_valid(session_path):
                result['success'] = True
                result['session_path'] = session_path
                result['message'] = 'Session hợp lệ'
                return result
            else:
                print("⚠️  Session không hợp lệ, thử auto-import...")
        else:
            print("⚠️  Không tìm thấy session, thử auto-import...")
        
        # Thử auto-import từ Telegram Desktop
        if await self.auto_import_from_desktop():
            result['success'] = True
            result['session_path'] = 'data/session.session'
            result['message'] = 'Đã auto-import từ Telegram Desktop'
            result['auto_imported'] = True
            return result
        
        # Không thể tạo session
        result['message'] = 'Không có session hợp lệ. Vui lòng chạy setup_telegram_auto_login.bat'
        return result
    
    def get_session_info(self) -> Dict[str, Any]:
        """Lấy thông tin session"""
        session_path = self.find_session()
        
        if not session_path:
            return {
                'exists': False,
                'path': None,
                'size': 0,
                'modified': None
            }
        
        import os
        from datetime import datetime
        
        stat = os.stat(session_path)
        
        return {
            'exists': True,
            'path': session_path,
            'size': stat.st_size,
            'modified': datetime.fromtimestamp(stat.st_mtime)
        }

# Global instance
session_manager = TelegramSessionManager()

async def ensure_telegram_session() -> bool:
    """Helper function để đảm bảo có session"""
    result = await session_manager.ensure_session()
    
    if result['success']:
        print(f"✅ {result['message']}")
        if result['auto_imported']:
            print("🎉 Đã tự động import session từ Telegram Desktop!")
        return True
    else:
        print(f"❌ {result['message']}")
        return False

def check_session_exists() -> bool:
    """Kiểm tra session có tồn tại không (sync)"""
    info = session_manager.get_session_info()
    return info['exists']

if __name__ == "__main__":
    # Test
    async def test():
        print("🧪 Testing Telegram Session Manager")
        print("=" * 50)
        
        # Kiểm tra session info
        info = session_manager.get_session_info()
        print(f"\nSession Info:")
        print(f"  Exists: {info['exists']}")
        if info['exists']:
            print(f"  Path: {info['path']}")
            print(f"  Size: {info['size']:,} bytes")
            print(f"  Modified: {info['modified']}")
        
        # Ensure session
        print("\n" + "=" * 50)
        result = await session_manager.ensure_session()
        print(f"\nResult: {result}")
    
    asyncio.run(test())
