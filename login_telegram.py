#!/usr/bin/env python3
"""
Script đăng nhập Telegram riêng biệt
Dùng cho lần đăng nhập đầu tiên hoặc khi session hết hạn
"""

import asyncio
import sys
from telethon import TelegramClient

async def login_telegram():
    """Đăng nhập Telegram và tạo session"""
    try:
        # Load config
        import config
        
        print("🔐 ĐĂNG NHẬP TELEGRAM")
        print("=" * 40)
        print(f"📱 Số điện thoại: {config.PHONE_NUMBER}")
        print(f"🔧 API ID: {config.API_ID}")
        print(f"📁 Session: {config.SESSION_NAME}")
        
        # Kiểm tra cấu hình
        if not config.PHONE_NUMBER or config.PHONE_NUMBER == '+84xxxxxxxxx':
            print("❌ Chưa cấu hình số điện thoại trong config.json")
            return False
            
        print("\n🔧 Đang tạo client...")
        client = TelegramClient(
            config.SESSION_NAME,
            int(config.API_ID),
            config.API_HASH
        )
        
        print("🔗 Đang kết nối...")
        await client.connect()
        
        if await client.is_user_authorized():
            print("✅ Đã đăng nhập rồi!")
            me = await client.get_me()
            print(f"👤 Tài khoản: {me.first_name} {me.last_name or ''}")
            return True
        
        print("📱 Cần đăng nhập...")
        print("💡 Telegram sẽ gửi mã xác thực đến điện thoại của bạn")
        
        # Đăng nhập
        await client.start(phone=config.PHONE_NUMBER)
        
        # Kiểm tra thành công
        if await client.is_user_authorized():
            me = await client.get_me()
            print(f"\n🎉 ĐĂNG NHẬP THÀNH CÔNG!")
            print(f"👤 Tài khoản: {me.first_name} {me.last_name or ''}")
            print(f"📱 Số điện thoại: {me.phone}")
            print(f"💾 Session đã được lưu: {config.SESSION_NAME}.session")
            return True
        else:
            print("❌ Đăng nhập thất bại")
            return False
            
    except KeyboardInterrupt:
        print("\n⏹️ Đã hủy đăng nhập")
        return False
    except Exception as e:
        print(f"\n❌ Lỗi đăng nhập: {e}")
        return False
    finally:
        if 'client' in locals():
            await client.disconnect()

def main():
    """Main function"""
    print("🚀 Bắt đầu quá trình đăng nhập...")
    
    try:
        success = asyncio.run(login_telegram())
        
        print("\n" + "=" * 50)
        if success:
            print("✅ HOÀN THÀNH!")
            print("💡 Bây giờ bạn có thể:")
            print("   - Chạy: python main.py")
            print("   - Hoặc dùng: run.bat")
            print("   - Kiểm tra session: python check_session.py")
        else:
            print("❌ THẤT BẠI!")
            print("💡 Vui lòng:")
            print("   - Kiểm tra config.json")
            print("   - Đảm bảo số điện thoại đúng")
            print("   - Thử lại sau")
            
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")

if __name__ == "__main__":
    # Setup Windows event loop
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    main()
