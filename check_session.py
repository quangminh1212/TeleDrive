#!/usr/bin/env python3
"""
Script kiểm tra trạng thái session Telegram
Giúp xác định xem có cần đăng nhập lại hay không
"""

import asyncio
import sys
from pathlib import Path
from telethon import TelegramClient

def check_session_file():
    """Kiểm tra file session có tồn tại không"""
    session_files = [
        "telegram_scanner_session.session",
        "telegram_scanner_session.session-journal"
    ]
    
    print("🔍 Kiểm tra file session...")
    for session_file in session_files:
        if Path(session_file).exists():
            size = Path(session_file).stat().st_size
            print(f"✅ {session_file} - {size} bytes")
        else:
            print(f"❌ {session_file} - không tồn tại")

async def check_session_validity():
    """Kiểm tra session có hợp lệ không"""
    try:
        # Load config
        import config
        
        print(f"\n🔧 Kiểm tra session với API_ID: {config.API_ID}")
        
        client = TelegramClient(
            config.SESSION_NAME,
            int(config.API_ID),
            config.API_HASH
        )
        
        await client.connect()
        
        if await client.is_user_authorized():
            print("✅ Session hợp lệ - không cần đăng nhập lại")
            
            # Lấy thông tin user
            me = await client.get_me()
            print(f"👤 Đăng nhập với: {me.first_name} {me.last_name or ''}")
            print(f"📱 Số điện thoại: {me.phone}")
            
            return True
        else:
            print("❌ Session không hợp lệ - cần đăng nhập lại")
            return False
            
    except Exception as e:
        print(f"❌ Lỗi kiểm tra session: {e}")
        return False
    finally:
        if 'client' in locals():
            await client.disconnect()

def main():
    """Main function"""
    print("🔐 KIỂM TRA SESSION TELEGRAM")
    print("=" * 40)
    
    # Kiểm tra file session
    check_session_file()
    
    # Kiểm tra tính hợp lệ
    print("\n🔍 Kiểm tra tính hợp lệ của session...")
    
    try:
        is_valid = asyncio.run(check_session_validity())
        
        print("\n" + "=" * 40)
        if is_valid:
            print("🎉 KẾT QUẢ: Session hợp lệ")
            print("💡 Bạn có thể chạy main.py hoặc run.bat")
        else:
            print("⚠️ KẾT QUẢ: Cần đăng nhập lại")
            print("💡 Chạy: python main.py trong terminal để đăng nhập")
            print("💡 KHÔNG dùng run.bat cho lần đăng nhập đầu tiên")
            
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        print("💡 Có thể cần cấu hình lại config.json")

if __name__ == "__main__":
    # Setup Windows event loop
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    main()
