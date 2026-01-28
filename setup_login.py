#!/usr/bin/env python3
"""
Setup Login - Đăng nhập Telegram một lần để tạo session
Hoạt động với mọi Python version, không cần opentele
"""

import asyncio
import sys
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
import config


async def setup_login():
    """Đăng nhập và tạo session"""
    
    print("\n" + "="*60)
    print("🔐 SETUP LOGIN - TeleDrive")
    print("="*60)
    
    # Kiểm tra config
    print("\n1️⃣ Kiểm tra config...")
    if not config.API_ID or not config.API_HASH:
        print("❌ Thiếu API_ID hoặc API_HASH trong config.json")
        return False
    
    print(f"✅ API_ID: {config.API_ID}")
    print(f"✅ API_HASH: {config.API_HASH[:8]}...")
    
    # Tạo client
    session_file = "data/session"
    client = TelegramClient(
        session_file,
        int(config.API_ID),
        config.API_HASH
    )
    
    try:
        print("\n2️⃣ Kết nối Telegram...")
        await client.connect()
        print("✅ Kết nối thành công!")
        
        # Kiểm tra đã đăng nhập chưa
        print("\n3️⃣ Kiểm tra session hiện có...")
        if await client.is_user_authorized():
            me = await client.get_me()
            print("✅ Đã có session hợp lệ!")
            print(f"\n👤 Thông tin:")
            print(f"   Tên: {me.first_name} {me.last_name or ''}")
            print(f"   Username: @{me.username or 'N/A'}")
            print(f"   Phone: {me.phone or 'N/A'}")
            print(f"   ID: {me.id}")
            
            print("\n✅ Session đã sẵn sàng!")
            print(f"   File: {session_file}.session")
            return True
        
        # Chưa đăng nhập - bắt đầu đăng nhập
        print("⚠️  Chưa có session. Bắt đầu đăng nhập...")
        
        # Nhập số điện thoại
        phone = input("\n📱 Nhập số điện thoại (với mã quốc gia, vd: +84987654321): ")
        
        # Gửi mã xác thực
        print("\n📤 Đang gửi mã xác thực...")
        await client.send_code_request(phone)
        print("✅ Đã gửi! Kiểm tra Telegram của bạn.")
        
        # Nhập mã xác thực
        code = input("\n🔑 Nhập mã xác thực (5-6 chữ số): ")
        
        try:
            # Đăng nhập với mã
            print("\n🔐 Đang xác thực...")
            await client.sign_in(phone, code)
            print("✅ Đăng nhập thành công!")
            
        except SessionPasswordNeededError:
            # Cần 2FA
            print("\n🔐 Tài khoản có bật 2FA")
            password = input("🔑 Nhập mật khẩu 2FA: ")
            await client.sign_in(password=password)
            print("✅ Đăng nhập thành công với 2FA!")
        
        # Lấy thông tin user
        me = await client.get_me()
        print(f"\n👤 Đã đăng nhập:")
        print(f"   Tên: {me.first_name} {me.last_name or ''}")
        print(f"   Username: @{me.username or 'N/A'}")
        print(f"   Phone: {me.phone or 'N/A'}")
        print(f"   ID: {me.id}")
        
        print(f"\n💾 Session đã được lưu: {session_file}.session")
        print("✅ Bạn có thể sử dụng TeleDrive ngay bây giờ!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        await client.disconnect()


async def main():
    """Main function"""
    
    success = await setup_login()
    
    print("\n" + "="*60)
    if success:
        print("🎉 SETUP HOÀN TẤT!")
        print("="*60)
        print("\n📝 Bước tiếp theo:")
        print("   1. Chạy: run.bat")
        print("   2. Hoặc: python main.py")
        print("\n✅ TeleDrive sẽ tự động sử dụng session đã tạo")
    else:
        print("❌ SETUP THẤT BẠI!")
        print("="*60)
        print("\n📝 Vui lòng:")
        print("   1. Kiểm tra API_ID và API_HASH trong config.json")
        print("   2. Kiểm tra kết nối internet")
        print("   3. Thử lại: python setup_login.py")
    print("="*60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup bị hủy bởi người dùng")
    except Exception as e:
        print(f"\n\n❌ Lỗi không mong đợi: {e}")
        import traceback
        traceback.print_exc()
