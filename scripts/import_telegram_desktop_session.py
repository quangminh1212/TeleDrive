#!/usr/bin/env python3
"""
Import Telegram Desktop Session
Chuyển đổi session từ Telegram Desktop sang Telethon để đăng nhập tự động
"""

import os
import sys
import asyncio
from pathlib import Path

try:
    from opentele.td import TDesktop
    from opentele.tl import TelegramClient
    from opentele.api import API, UseCurrentSession
except ImportError:
    print("❌ Chưa cài đặt thư viện opentele")
    print("Chạy lệnh: pip install opentele")
    sys.exit(1)

# Import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config

async def import_desktop_session():
    """Import session từ Telegram Desktop"""
    print("🔐 Import Telegram Desktop Session")
    print("=" * 50)
    
    # Tìm thư mục tdata của Telegram Desktop
    telegram_desktop_paths = [
        os.path.expandvars(r"%APPDATA%\Telegram Desktop\tdata"),
        os.path.expanduser("~/AppData/Roaming/Telegram Desktop/tdata"),
        "C:\\Users\\%USERNAME%\\AppData\\Roaming\\Telegram Desktop\\tdata"
    ]
    
    tdata_path = None
    for path in telegram_desktop_paths:
        expanded_path = os.path.expandvars(path)
        if os.path.exists(expanded_path):
            tdata_path = expanded_path
            break
    
    if not tdata_path:
        print("❌ Không tìm thấy thư mục Telegram Desktop")
        print("Vui lòng đảm bảo Telegram Desktop đã được cài đặt và đăng nhập")
        return False
    
    print(f"✅ Tìm thấy Telegram Desktop tại: {tdata_path}")
    
    try:
        # Load Telegram Desktop session
        print("📱 Đang load session từ Telegram Desktop...")
        tdesk = TDesktop(tdata_path)
        
        # Kiểm tra xem có đăng nhập không
        if not tdesk.isLoaded():
            print("❌ Telegram Desktop chưa đăng nhập")
            print("Vui lòng mở Telegram Desktop và đăng nhập trước")
            return False
        
        print("✅ Đã load session thành công")
        
        # Chuyển đổi sang Telethon client
        print("🔄 Đang chuyển đổi sang Telethon format...")
        
        # Tạo session file cho Telethon
        session_file = f"data/{config.SESSION_NAME}"
        
        # Convert TDesktop to Telethon
        client = await tdesk.ToTelethon(
            session=session_file,
            flag=UseCurrentSession
        )
        
        # Kết nối và kiểm tra
        await client.connect()
        
        if await client.is_user_authorized():
            me = await client.get_me()
            print(f"✅ Đăng nhập thành công!")
            print(f"👤 Tài khoản: {me.first_name} {me.last_name or ''}")
            print(f"📱 Username: @{me.username or 'không có'}")
            print(f"🆔 User ID: {me.id}")
            print(f"📞 Phone: {me.phone or 'không có'}")
            
            await client.disconnect()
            
            print("\n✅ Session đã được import thành công!")
            print(f"📁 File session: {session_file}.session")
            print("\n🎉 Bây giờ bạn có thể chạy ứng dụng mà không cần nhập code!")
            
            return True
        else:
            print("❌ Không thể xác thực với Telegram")
            await client.disconnect()
            return False
            
    except Exception as e:
        print(f"❌ Lỗi khi import session: {e}")
        print(f"Chi tiết: {type(e).__name__}")
        return False

async def main():
    """Main function"""
    success = await import_desktop_session()
    
    if success:
        print("\n" + "=" * 50)
        print("HƯỚNG DẪN SỬ DỤNG:")
        print("1. Session đã được import thành công")
        print("2. Chạy ứng dụng: python app/app.py")
        print("3. Không cần nhập API_ID, API_HASH hay verification code")
        print("=" * 50)
    else:
        print("\n" + "=" * 50)
        print("KHẮC PHỤC:")
        print("1. Đảm bảo Telegram Desktop đã được cài đặt")
        print("2. Mở Telegram Desktop và đăng nhập")
        print("3. Đóng Telegram Desktop")
        print("4. Chạy lại script này")
        print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())
