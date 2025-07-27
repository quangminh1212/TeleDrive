#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Check API Status - Kiểm tra trạng thái API và kết nối Telegram
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

load_dotenv()

def check_credentials():
    """Kiểm tra API credentials"""
    print("🔍 Kiểm tra API Credentials...")
    print("-" * 40)
    
    api_id = os.getenv('TELEGRAM_API_ID')
    api_hash = os.getenv('TELEGRAM_API_HASH')
    phone = os.getenv('TELEGRAM_PHONE')
    
    print(f"📱 API ID: {api_id}")
    print(f"🔑 API Hash: {api_hash[:10]}..." if api_hash else "❌ Không có")
    print(f"📞 Phone: {phone}")
    
    if not all([api_id, api_hash, phone]):
        print("\n❌ Thiếu API credentials!")
        return False
    
    print("\n✅ API credentials đã có đầy đủ")
    return True

async def check_connection():
    """Kiểm tra kết nối Telegram"""
    try:
        from telethon import TelegramClient
        
        api_id = os.getenv('TELEGRAM_API_ID')
        api_hash = os.getenv('TELEGRAM_API_HASH')
        
        print("\n🌐 Kiểm tra kết nối Telegram...")
        print("-" * 40)
        
        client = TelegramClient('temp_session', api_id, api_hash)
        await client.connect()
        
        if await client.is_user_authorized():
            me = await client.get_me()
            print("✅ Đã kết nối và đăng nhập")
            print(f"👤 Tài khoản: {me.first_name} {me.last_name or ''}")
            await client.disconnect()
            return True
        else:
            print("⚠️ Chưa đăng nhập")
            print("💡 Chạy: python telegram_login.py")
            await client.disconnect()
            return False
            
    except ImportError:
        print("❌ Chưa cài đặt telethon")
        return False
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")
        return False

def check_files():
    """Kiểm tra các file cần thiết"""
    print("\n📁 Kiểm tra files...")
    print("-" * 40)
    
    files_to_check = [
        ('.env', 'Environment variables'),
        ('config.json', 'Configuration file'),
        ('requirements.txt', 'Dependencies'),
        ('main.py', 'Main application'),
        ('telegram_login.py', 'Login script')
    ]
    
    all_ok = True
    for file_path, description in files_to_check:
        if os.path.exists(file_path):
            print(f"✅ {description}: {file_path}")
        else:
            print(f"❌ {description}: {file_path} (không tìm thấy)")
            all_ok = False
    
    return all_ok

async def main():
    """Main function"""
    print("🔧 TeleDrive API Status Check")
    print("=" * 50)
    
    creds_ok = check_credentials()
    files_ok = check_files()
    
    if creds_ok:
        conn_ok = await check_connection()
    else:
        conn_ok = False
    
    print("\n" + "=" * 50)
    print("📊 TỔNG KẾT:")
    print(f"🔑 API Credentials: {'✅ OK' if creds_ok else '❌ Lỗi'}")
    print(f"📁 Files: {'✅ OK' if files_ok else '❌ Lỗi'}")
    print(f"🌐 Telegram Connection: {'✅ OK' if conn_ok else '❌ Lỗi'}")
    
    if all([creds_ok, files_ok, conn_ok]):
        print("\n🎉 TẤT CẢ ĐỀU OK!")
        print("🚀 Có thể sử dụng TeleDrive")
    else:
        print("\n⚠️ CẦN KHẮC PHỤC:")
        if not conn_ok:
            print("   - Chạy: python telegram_login.py")

if __name__ == '__main__':
    asyncio.run(main())
