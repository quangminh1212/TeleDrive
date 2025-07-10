#!/usr/bin/env python3
"""
Test script cho TeleDrive
"""

import os
import sys
from pathlib import Path

def test_imports():
    """Kiểm tra import các module"""
    print("🧪 Kiểm tra import modules...")
    
    try:
        import customtkinter
        print("   ✅ customtkinter")
    except ImportError as e:
        print(f"   ❌ customtkinter: {e}")
        return False
    
    try:
        import telethon
        print("   ✅ telethon")
    except ImportError as e:
        print(f"   ❌ telethon: {e}")
        return False
    
    try:
        from dotenv import load_dotenv
        print("   ✅ python-dotenv")
    except ImportError as e:
        print(f"   ❌ python-dotenv: {e}")
        return False
    
    try:
        import app
        print("   ✅ app.py")
    except ImportError as e:
        print(f"   ❌ app.py: {e}")
        return False
    
    try:
        import cmd
        print("   ✅ cmd.py")
    except ImportError as e:
        print(f"   ❌ cmd.py: {e}")
        return False
    
    try:
        import telegram
        print("   ✅ telegram.py")
    except ImportError as e:
        print(f"   ❌ telegram.py: {e}")
        return False
    
    return True

def test_config():
    """Kiểm tra cấu hình"""
    print("\n⚙️ Kiểm tra cấu hình...")
    
    if not Path('.env').exists():
        print("   ❌ File .env không tồn tại")
        return False
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        api_id = os.getenv('API_ID')
        api_hash = os.getenv('API_HASH')
        
        if api_id:
            print(f"   ✅ API_ID: {api_id}")
        else:
            print("   ❌ API_ID chưa được cấu hình")
            return False
        
        if api_hash:
            print(f"   ✅ API_HASH: {api_hash[:10]}...")
        else:
            print("   ❌ API_HASH chưa được cấu hình")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Lỗi đọc cấu hình: {e}")
        return False

def test_files():
    """Kiểm tra file cần thiết"""
    print("\n📁 Kiểm tra file cần thiết...")
    
    required_files = ['app.py', 'cmd.py', 'telegram.py', 'requirements.txt', '.env', 'README.md']
    
    for file in required_files:
        if Path(file).exists():
            print(f"   ✅ {file}")
        else:
            print(f"   ❌ {file} không tồn tại")
            return False
    
    return True

def main():
    """Hàm chính"""
    print("🚀 TeleDrive Test Suite")
    print("=" * 40)
    
    tests = [
        ("Files", test_files),
        ("Config", test_config), 
        ("Imports", test_imports),
    ]
    
    passed = 0
    total = len(tests)
    
    for name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print(f"✅ {name} test passed")
            else:
                print(f"❌ {name} test failed")
        except Exception as e:
            print(f"❌ {name} test error: {e}")
    
    print(f"\n{'='*40}")
    print(f"📊 Kết quả: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 Tất cả test đều pass!")
        print("\n📋 Cách sử dụng:")
        print("   • Chạy ứng dụng desktop: python app.py")
        print("   • Chạy dòng lệnh: python cmd.py")
        print("   • Ứng dụng sẽ yêu cầu đăng nhập Telegram lần đầu")
        return True
    else:
        print("\n❌ Một số test failed. Hãy kiểm tra lại.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
