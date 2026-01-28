#!/usr/bin/env python3
"""
Test App Login Integration
Kiểm tra tích hợp đăng nhập với app.py
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.auth import TelegramAuthenticator
from telethon.errors import SessionPasswordNeededError
import config


async def test_authenticator():
    """Test TelegramAuthenticator class"""
    
    print("\n" + "="*60)
    print("🧪 TEST APP LOGIN INTEGRATION")
    print("="*60)
    
    auth = TelegramAuthenticator()
    
    # Test 1: Kiểm tra session hiện có
    print("\n1️⃣ Test: check_existing_session()")
    print("-" * 60)
    
    result = await auth.check_existing_session()
    
    if result['success']:
        print("✅ Session hiện có hợp lệ!")
        user = result['user']
        print(f"   User ID: {user['id']}")
        print(f"   Username: {user['username']}")
        print(f"   Telegram ID: {user['telegram_id']}")
        print(f"   Name: {user['first_name']} {user.get('last_name', '')}")
        print(f"   Phone: {user.get('phone', 'N/A')}")
        return True
    else:
        print(f"⚠️  {result['message']}")
        print("   Cần đăng nhập mới")
    
    # Test 2: Thử auto-login từ Telegram Desktop
    print("\n2️⃣ Test: try_auto_login_from_desktop()")
    print("-" * 60)
    
    auto_result = await auth.try_auto_login_from_desktop()
    
    if auto_result['success']:
        print("✅ Auto-login thành công!")
        user = auto_result['user']
        print(f"   User ID: {user['id']}")
        print(f"   Username: {user['username']}")
        print(f"   Name: {user['first_name']} {user.get('last_name', '')}")
        return True
    else:
        print(f"⚠️  Auto-login thất bại: {auto_result['message']}")
        if auto_result.get('hint'):
            print(f"   Hint: {auto_result['hint']}")
    
    # Test 3: Đăng nhập thủ công
    print("\n3️⃣ Test: Manual Login Flow")
    print("-" * 60)
    
    choice = input("\n❓ Bạn có muốn test đăng nhập thủ công không? (y/n): ")
    if choice.lower() != 'y':
        print("⏭️  Bỏ qua test đăng nhập thủ công")
        return False
    
    # Nhập số điện thoại
    phone = input("\n📱 Nhập số điện thoại (vd: 987654321): ")
    country_code = input("🌍 Nhập mã quốc gia (vd: +84): ")
    
    # Gửi mã xác thực
    print("\n📤 Gửi mã xác thực...")
    send_result = await auth.send_code_request(phone, country_code)
    
    if not send_result['success']:
        print(f"❌ Gửi mã thất bại: {send_result['error']}")
        return False
    
    print("✅ Đã gửi mã xác thực!")
    print(f"   Session ID: {send_result['session_id']}")
    print(f"   Phone: {send_result['phone_number']}")
    
    # Nhập mã xác thực
    code = input("\n🔑 Nhập mã xác thực từ Telegram: ")
    
    # Xác thực
    print("\n🔐 Xác thực...")
    verify_result = await auth.verify_code(send_result['session_id'], code)
    
    if verify_result['success']:
        print("✅ Đăng nhập thành công!")
        user = verify_result['user']
        print(f"   User ID: {user['id']}")
        print(f"   Username: {user['username']}")
        print(f"   Name: {user['first_name']} {user.get('last_name', '')}")
        return True
    else:
        error = verify_result.get('error', 'Unknown error')
        print(f"❌ Xác thực thất bại: {error}")
        
        # Nếu cần 2FA
        if verify_result.get('requires_password'):
            password = input("\n🔐 Nhập mật khẩu 2FA: ")
            verify_result = await auth.verify_code(
                send_result['session_id'],
                code,
                password
            )
            
            if verify_result['success']:
                print("✅ Đăng nhập thành công với 2FA!")
                user = verify_result['user']
                print(f"   User ID: {user['id']}")
                print(f"   Username: {user['username']}")
                return True
            else:
                print(f"❌ 2FA thất bại: {verify_result.get('error')}")
                return False
        
        return False


async def test_database_integration():
    """Test tích hợp với database"""
    
    print("\n" + "="*60)
    print("🗄️  TEST DATABASE INTEGRATION")
    print("="*60)
    
    try:
        from app.db import db, User
        from app import create_app
        
        # Tạo app context
        app = create_app()
        
        with app.app_context():
            # Kiểm tra có user nào không
            user_count = User.query.count()
            print(f"\n📊 Số lượng users trong database: {user_count}")
            
            if user_count > 0:
                # Lấy user đầu tiên
                user = User.query.first()
                print(f"\n👤 User đầu tiên:")
                print(f"   ID: {user.id}")
                print(f"   Username: {user.username}")
                print(f"   Email: {user.email}")
                print(f"   Telegram ID: {user.telegram_id}")
                print(f"   Phone: {user.phone_number}")
                print(f"   Active: {user.is_active}")
                print(f"   Auth method: {user.auth_method}")
                
                return True
            else:
                print("\n⚠️  Chưa có user nào trong database")
                print("   Vui lòng đăng nhập ít nhất 1 lần")
                return False
                
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main test function"""
    
    print("\n" + "="*60)
    print("🧪 TELEGRAM LOGIN INTEGRATION TEST")
    print("="*60)
    print("\nTest này kiểm tra tích hợp đăng nhập với app.py")
    
    # Test authenticator
    auth_ok = await test_authenticator()
    
    # Test database
    db_ok = await test_database_integration()
    
    # Tổng kết
    print("\n" + "="*60)
    print("📊 KẾT QUẢ TEST")
    print("="*60)
    print(f"Authenticator: {'✅ PASS' if auth_ok else '❌ FAIL'}")
    print(f"Database: {'✅ PASS' if db_ok else '❌ FAIL'}")
    print("="*60)
    
    if auth_ok and db_ok:
        print("\n🎉 TẤT CẢ TEST ĐỀU PASS!")
    else:
        print("\n⚠️  MỘT SỐ TEST THẤT BẠI")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test bị hủy")
    except Exception as e:
        print(f"\n\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
