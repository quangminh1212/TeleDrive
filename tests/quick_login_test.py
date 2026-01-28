#!/usr/bin/env python3
"""
Quick Login Test - Kiểm tra nhanh đăng nhập Telegram
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError

# Import config
try:
    import config
except ImportError:
    # Fallback if running from tests directory
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import config


async def try_telegram_desktop_session():
    """Thử import session từ Telegram Desktop"""
    print("\n🔍 Tìm kiếm Telegram Desktop session...")
    
    try:
        from opentele.td import TDesktop
        from opentele.api import UseCurrentSession
    except (ImportError, BaseException) as e:
        if isinstance(e, ImportError):
            print("⚠️  opentele chưa cài đặt (cần cho auto-import)")
        else:
            print(f"⚠️  opentele không tương thích với Python {sys.version_info.major}.{sys.version_info.minor}")
            print("   opentele chỉ hoạt động với Python 3.11")
        return None
    
    # Tìm Telegram Desktop
    tdata_paths = [
        os.path.expandvars(r"%APPDATA%\Telegram Desktop\tdata"),
        os.path.expanduser("~/Library/Application Support/Telegram Desktop/tdata"),
        os.path.expanduser("~/.local/share/TelegramDesktop/tdata"),
    ]
    
    tdata_path = None
    for path in tdata_paths:
        if os.path.exists(path):
            tdata_path = path
            break
    
    if not tdata_path:
        print("⚠️  Không tìm thấy Telegram Desktop")
        return None
    
    print(f"✅ Tìm thấy: {tdata_path}")
    
    try:
        # Load TDesktop session
        print("📥 Đang load session từ Telegram Desktop...")
        tdesk = TDesktop(tdata_path)
        
        if not tdesk.isLoaded():
            print("⚠️  Telegram Desktop chưa đăng nhập")
            return None
        
        print("✅ Đã load session!")
        
        # Convert sang Telethon
        print("🔄 Đang chuyển đổi sang Telethon...")
        session_file = "tests/quick_test_session"
        client = await tdesk.ToTelethon(
            session=session_file,
            flag=UseCurrentSession
        )
        
        print("✅ Chuyển đổi thành công!")
        return client
        
    except Exception as e:
        print(f"⚠️  Không thể import session: {e}")
        return None


async def quick_test():
    """Kiểm tra nhanh đăng nhập"""
    
    print("\n" + "="*50)
    print("⚡ QUICK LOGIN TEST")
    print("="*50)
    
    # Kiểm tra config
    print("\n1️⃣ Kiểm tra config...")
    if not config.API_ID or not config.API_HASH:
        print("❌ Thiếu API_ID hoặc API_HASH trong config")
        print("\n📝 Cách lấy API credentials:")
        print("   1. Truy cập: https://my.telegram.org/apps")
        print("   2. Đăng nhập Telegram")
        print("   3. Tạo ứng dụng mới")
        print("   4. Copy API_ID và API_HASH")
        print("   5. Cập nhật vào config.py")
        return
    
    print(f"✅ API_ID: {config.API_ID}")
    print(f"✅ API_HASH: {config.API_HASH[:8]}...")
    
    # Thử import từ Telegram Desktop trước
    print("\n2️⃣ Thử import session từ Telegram Desktop...")
    client = await try_telegram_desktop_session()
    
    if not client:
        print("\n⚠️  Không thể import từ Telegram Desktop")
        print("   Sẽ sử dụng session riêng cho test\n")
        
        # Tạo client mới
        session_file = "tests/quick_test_session"
        client = TelegramClient(
            session_file,
            int(config.API_ID),
            config.API_HASH
        )
    
    try:
        print("\n3️⃣ Kết nối Telegram...")
        await client.connect()
        print("✅ Kết nối thành công!")
        
        # Kiểm tra authorization
        print("\n4️⃣ Kiểm tra authorization...")
        if await client.is_user_authorized():
            print("✅ Đã đăng nhập!")
            me = await client.get_me()
            print(f"\n👤 Thông tin:")
            print(f"   Tên: {me.first_name} {me.last_name or ''}")
            print(f"   Username: @{me.username or 'N/A'}")
            print(f"   Phone: {me.phone or 'N/A'}")
            print(f"   ID: {me.id}")
            
            # Test gửi tin nhắn
            print("\n5️⃣ Test gửi tin nhắn...")
            msg = await client.send_message('me', '✅ Quick test thành công!')
            print(f"✅ Đã gửi tin nhắn (ID: {msg.id})")
            
        else:
            print("⚠️  Chưa đăng nhập. Bắt đầu đăng nhập...")
            
            # Nhập số điện thoại
            phone = input("\n📱 Số điện thoại (vd: +84987654321): ")
            
            # Gửi mã
            print("\n📤 Gửi mã xác thực...")
            await client.send_code_request(phone)
            print("✅ Đã gửi! Kiểm tra Telegram của bạn.")
            
            # Nhập mã
            code = input("\n🔑 Nhập mã xác thực: ")
            
            try:
                await client.sign_in(phone, code)
                print("✅ Đăng nhập thành công!")
            except SessionPasswordNeededError:
                password = input("\n🔐 Nhập mật khẩu 2FA: ")
                await client.sign_in(password=password)
                print("✅ Đăng nhập thành công với 2FA!")
            
            # Lấy thông tin
            me = await client.get_me()
            print(f"\n👤 Đã đăng nhập:")
            print(f"   Tên: {me.first_name} {me.last_name or ''}")
            print(f"   Username: @{me.username or 'N/A'}")
            
            # Test gửi tin nhắn
            print("\n5️⃣ Test gửi tin nhắn...")
            msg = await client.send_message('me', '✅ Quick test thành công!')
            print(f"✅ Đã gửi tin nhắn (ID: {msg.id})")
        
        print("\n" + "="*50)
        print("🎉 TEST THÀNH CÔNG!")
        print("="*50)
        
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(quick_test())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test bị hủy")
