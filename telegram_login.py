#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Telegram Login Script - Script đăng nhập Telegram lần đầu
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def telegram_login():
    """Đăng nhập Telegram lần đầu"""
    try:
        from telethon import TelegramClient
        
        # Get API credentials
        api_id = os.getenv('TELEGRAM_API_ID')
        api_hash = os.getenv('TELEGRAM_API_HASH')
        phone = os.getenv('TELEGRAM_PHONE')
        
        print("🔐 TeleDrive - Đăng nhập Telegram")
        print("=" * 40)
        print(f"📱 Số điện thoại: {phone}")
        print(f"🆔 API ID: {api_id}")
        print()
        
        if not all([api_id, api_hash, phone]):
            print("❌ Thiếu API credentials trong file .env!")
            return False
        
        # Create client
        session_file = 'telegram_scanner_session'
        client = TelegramClient(session_file, api_id, api_hash)
        
        print("🚀 Đang kết nối với Telegram...")
        await client.connect()
        
        if not await client.is_user_authorized():
            print("📲 Gửi mã xác thực...")
            await client.send_code_request(phone)
            
            # Nhập mã xác thực
            code = input("🔢 Nhập mã xác thực từ Telegram: ")
            
            try:
                await client.sign_in(phone, code)
                print("✅ Đăng nhập thành công!")
            except Exception as e:
                if 'password' in str(e).lower():
                    # Cần mật khẩu 2FA
                    password = input("🔒 Nhập mật khẩu 2FA: ")
                    await client.sign_in(password=password)
                    print("✅ Đăng nhập thành công với 2FA!")
                else:
                    raise e
        else:
            print("✅ Đã đăng nhập từ trước!")
        
        # Lấy thông tin user
        me = await client.get_me()
        print()
        print("👤 Thông tin tài khoản:")
        print(f"   Tên: {me.first_name} {me.last_name or ''}")
        print(f"   Username: @{me.username or 'Không có'}")
        print(f"   ID: {me.id}")
        print(f"   Số điện thoại: {me.phone}")
        
        await client.disconnect()
        
        print()
        print("🎉 Hoàn thành đăng nhập!")
        print("💡 Giờ bạn có thể sử dụng TeleDrive scanner")
        print("🚀 Chạy: python main.py hoặc run.bat")
        
        return True
        
    except ImportError:
        print("❌ Chưa cài đặt telethon!")
        print("💡 Chạy: pip install telethon")
        return False
    except Exception as e:
        print(f"❌ Lỗi đăng nhập: {e}")
        return False

def main():
    """Main function"""
    print("Đảm bảo bạn đã:")
    print("1. Cài đặt dependencies: pip install -r requirements.txt")
    print("2. Cấu hình API credentials trong file .env")
    print("3. Có điện thoại để nhận mã xác thực")
    print()
    
    confirm = input("Tiếp tục đăng nhập? (y/n): ")
    if confirm.lower() not in ['y', 'yes', 'có']:
        print("Hủy đăng nhập.")
        return
    
    try:
        success = asyncio.run(telegram_login())
        if success:
            print("\n✅ Đăng nhập thành công!")
        else:
            print("\n❌ Đăng nhập thất bại!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️ Đã hủy đăng nhập.")
        sys.exit(1)

if __name__ == '__main__':
    main()
