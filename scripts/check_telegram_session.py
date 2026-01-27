#!/usr/bin/env python3
"""
Check Telegram Session Status
Kiểm tra trạng thái session Telegram hiện tại
"""

import os
import sys
import asyncio
from pathlib import Path
from datetime import datetime

# Import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def check_session():
    """Kiểm tra session hiện tại"""
    print("🔍 Kiểm Tra Session Telegram")
    print("=" * 50)
    
    # Kiểm tra file session
    session_files = [
        "data/session.session",
        "session.session",
        "app/session.session"
    ]
    
    found_session = None
    for session_file in session_files:
        if os.path.exists(session_file):
            found_session = session_file
            break
    
    if not found_session:
        print("❌ Không tìm thấy file session")
        print("\n📝 HƯỚNG DẪN:")
        print("1. Chạy: setup_telegram_auto_login.bat")
        print("2. Hoặc: python scripts/import_telegram_desktop_session.py")
        return False
    
    print(f"✅ Tìm thấy session: {found_session}")
    
    # Lấy thông tin file
    file_stat = os.stat(found_session)
    file_size = file_stat.st_size
    modified_time = datetime.fromtimestamp(file_stat.st_mtime)
    
    print(f"📁 Kích thước: {file_size:,} bytes")
    print(f"🕐 Cập nhật lần cuối: {modified_time.strftime('%d/%m/%Y %H:%M:%S')}")
    
    # Kiểm tra session có hợp lệ không
    try:
        from telethon import TelegramClient
        import config
        
        print("\n🔄 Đang kiểm tra kết nối...")
        
        # Xác định session path (không có .session)
        session_path = found_session.replace('.session', '')
        
        # Tạo client với API credentials nếu có
        if hasattr(config, 'API_ID') and config.API_ID:
            api_id = int(config.API_ID) if config.API_ID else 0
            api_hash = config.API_HASH if config.API_HASH else ""
        else:
            # Sử dụng giá trị mặc định nếu không có config
            api_id = 0
            api_hash = ""
        
        client = TelegramClient(session_path, api_id, api_hash)
        
        await client.connect()
        
        if await client.is_user_authorized():
            me = await client.get_me()
            
            print("✅ Session hợp lệ và đang hoạt động!")
            print("\n👤 THÔNG TIN TÀI KHOẢN:")
            print(f"   Tên: {me.first_name} {me.last_name or ''}")
            print(f"   Username: @{me.username or 'không có'}")
            print(f"   User ID: {me.id}")
            print(f"   Phone: {me.phone or 'không có'}")
            print(f"   Premium: {'Có' if me.premium else 'Không'}")
            
            # Kiểm tra dialogs
            print("\n📱 Đang kiểm tra dialogs...")
            dialog_count = 0
            async for dialog in client.iter_dialogs(limit=10):
                dialog_count += 1
            
            print(f"✅ Có thể truy cập {dialog_count} dialogs")
            
            await client.disconnect()
            
            print("\n🎉 Session hoạt động hoàn hảo!")
            print("🚀 Bạn có thể chạy ứng dụng: run.bat")
            
            return True
        else:
            print("❌ Session không được authorize")
            await client.disconnect()
            
            print("\n📝 KHẮC PHỤC:")
            print("1. Xóa session cũ: del data\\session.session")
            print("2. Import lại: python scripts/import_telegram_desktop_session.py")
            
            return False
            
    except Exception as e:
        print(f"❌ Lỗi kiểm tra session: {e}")
        print(f"Chi tiết: {type(e).__name__}")
        
        print("\n📝 KHẮC PHỤC:")
        print("1. Kiểm tra config: python tests/check_configuration.py")
        print("2. Import lại session: python scripts/import_telegram_desktop_session.py")
        
        return False

async def main():
    """Main function"""
    try:
        success = await check_session()
        
        if not success:
            print("\n" + "=" * 50)
            print("⚠️  Session có vấn đề!")
            print("=" * 50)
            sys.exit(1)
        else:
            print("\n" + "=" * 50)
            print("✅ Mọi thứ đều OK!")
            print("=" * 50)
            sys.exit(0)
    except KeyboardInterrupt:
        print("\n\n⚠️  Đã hủy bởi người dùng")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
