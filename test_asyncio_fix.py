#!/usr/bin/env python3
"""
Test script để kiểm tra lỗi asyncio event loop đã được sửa chưa
"""

import asyncio
import sys
from pathlib import Path

async def test_telegram_connection():
    """Test kết nối Telegram cơ bản"""
    try:
        # Setup Windows event loop FIRST
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            print("✅ Đã cấu hình Windows ProactorEventLoopPolicy")

        # Import config
        import config
        print(f"📋 Đã tải config: API_ID={config.API_ID}")
        
        # Import Telethon
        from telethon import TelegramClient
        print("📦 Đã import TelegramClient")
        
        # Tạo client
        client = TelegramClient(
            config.SESSION_NAME,
            int(config.API_ID),
            config.API_HASH
        )
        print("🔧 Đã tạo TelegramClient")
        
        # Kết nối
        print("🔗 Đang kết nối...")
        await client.connect()
        print("✅ Đã kết nối thành công")
        
        # Kiểm tra đăng nhập
        if await client.is_user_authorized():
            me = await client.get_me()
            print(f"👤 Đã đăng nhập: {me.first_name} {me.last_name or ''}")
            print(f"📱 Số điện thoại: {me.phone}")
            return True
        else:
            print("❌ Chưa đăng nhập")
            return False
            
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if 'client' in locals():
            await client.disconnect()
            print("🔌 Đã ngắt kết nối")

def main():
    """Main function"""
    print("🧪 TEST ASYNCIO EVENT LOOP FIX")
    print("=" * 50)
    
    # Setup Windows event loop FIRST - before any asyncio operations
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("✅ Đã cấu hình Windows ProactorEventLoopPolicy")
    
    # Check session file
    try:
        import config
        session_file = f"{config.SESSION_NAME}.session"
        if not Path(session_file).exists():
            print(f"❌ Không tìm thấy session file: {session_file}")
            print("💡 Vui lòng chạy: python login_telegram.py")
            return
        else:
            print(f"✅ Session file tồn tại: {session_file}")
    except Exception as e:
        print(f"❌ Lỗi tải config: {e}")
        return
    
    try:
        success = asyncio.run(test_telegram_connection())
        
        print("\n" + "=" * 50)
        if success:
            print("🎉 TEST THÀNH CÔNG!")
            print("✅ Lỗi asyncio event loop đã được sửa")
            print("💡 Bây giờ bạn có thể chạy: python main.py")
        else:
            print("❌ TEST THẤT BẠI!")
            print("💡 Vui lòng kiểm tra lại cấu hình")
            
    except Exception as e:
        print(f"\n❌ Lỗi trong test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
