#!/usr/bin/env python3
"""
Auto Login Telegram
Tự động đăng nhập Telegram bằng cách sử dụng session có sẵn từ Telegram Desktop
Không cần API credentials
"""

import os
import sys
import asyncio
import subprocess
from pathlib import Path

# Import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_telegram_desktop_running():
    """Kiểm tra Telegram Desktop có đang chạy không"""
    try:
        # Windows
        result = subprocess.run(
            ['tasklist', '/FI', 'IMAGENAME eq Telegram.exe'],
            capture_output=True,
            text=True
        )
        return 'Telegram.exe' in result.stdout
    except:
        return False

def find_telegram_desktop_path():
    """Tìm đường dẫn Telegram Desktop"""
    possible_paths = [
        os.path.expandvars(r"%LOCALAPPDATA%\Telegram Desktop\Telegram.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Telegram Desktop\Telegram.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Telegram Desktop\Telegram.exe"),
        "C:\\Program Files\\Telegram Desktop\\Telegram.exe",
        "C:\\Program Files (x86)\\Telegram Desktop\\Telegram.exe"
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None

async def auto_login():
    """Tự động đăng nhập Telegram"""
    print("🚀 Auto Login Telegram")
    print("=" * 50)
    
    # Kiểm tra xem đã có session chưa
    session_file = "data/session.session"
    
    if os.path.exists(session_file):
        print("✅ Đã tìm thấy session file")
        print("🔄 Đang kiểm tra session...")
        
        try:
            from telethon import TelegramClient
            import config
            
            client = TelegramClient(
                "data/session",
                int(config.API_ID) if config.API_ID else 0,
                config.API_HASH if config.API_HASH else ""
            )
            
            await client.connect()
            
            if await client.is_user_authorized():
                me = await client.get_me()
                print(f"✅ Đã đăng nhập!")
                print(f"👤 {me.first_name} {me.last_name or ''}")
                print(f"📱 @{me.username or 'không có username'}")
                await client.disconnect()
                return True
            else:
                print("⚠️ Session không hợp lệ")
                await client.disconnect()
        except Exception as e:
            print(f"⚠️ Lỗi kiểm tra session: {e}")
    
    # Nếu chưa có session, thử import từ Telegram Desktop
    print("\n📱 Đang tìm Telegram Desktop...")
    
    telegram_path = find_telegram_desktop_path()
    
    if not telegram_path:
        print("❌ Không tìm thấy Telegram Desktop")
        print("\nHƯỚNG DẪN:")
        print("1. Tải và cài đặt Telegram Desktop từ: https://desktop.telegram.org/")
        print("2. Mở Telegram Desktop và đăng nhập")
        print("3. Chạy lại script này")
        return False
    
    print(f"✅ Tìm thấy Telegram Desktop: {telegram_path}")
    
    # Kiểm tra Telegram Desktop có đang chạy không
    if not check_telegram_desktop_running():
        print("\n⚠️ Telegram Desktop chưa chạy")
        print("🚀 Đang khởi động Telegram Desktop...")
        
        try:
            subprocess.Popen([telegram_path])
            print("✅ Đã khởi động Telegram Desktop")
            print("\n📝 HƯỚNG DẪN:")
            print("1. Đăng nhập vào Telegram Desktop")
            print("2. Đóng Telegram Desktop")
            print("3. Chạy lại script này để import session")
            return False
        except Exception as e:
            print(f"❌ Không thể khởi động Telegram Desktop: {e}")
            return False
    else:
        print("✅ Telegram Desktop đang chạy")
        print("\n⚠️ Vui lòng đóng Telegram Desktop trước khi import session")
        print("Sau đó chạy: python scripts/import_telegram_desktop_session.py")
        return False

async def main():
    """Main function"""
    success = await auto_login()
    
    if not success:
        print("\n" + "=" * 50)
        print("CÁC BƯỚC TIẾP THEO:")
        print("1. Cài đặt thư viện: pip install opentele")
        print("2. Đảm bảo Telegram Desktop đã đăng nhập")
        print("3. Đóng Telegram Desktop")
        print("4. Chạy: python scripts/import_telegram_desktop_session.py")
        print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())
