#!/usr/bin/env python3
"""
Demo script để test TeleDrive
"""

import os
import sys
from pathlib import Path

def show_project_info():
    """Hiển thị thông tin dự án"""
    print("🚀 TeleDrive - Telegram File Manager")
    print("=" * 50)
    print()
    
    # Kiểm tra file cần thiết
    files = {
        "app.py": "Ứng dụng desktop chính",
        "cmd.py": "Giao diện dòng lệnh", 
        "telegram.py": "Module xử lý Telegram API",
        "run.bat": "Script khởi chạy Windows",
        "install.bat": "Script cài đặt Windows",
        ".env": "File cấu hình API",
        "requirements.txt": "Danh sách thư viện"
    }
    
    print("📁 Cấu trúc dự án:")
    for file, desc in files.items():
        status = "✅" if Path(file).exists() else "❌"
        print(f"   {status} {file:<15} - {desc}")
    
    print()
    
    # Kiểm tra cấu hình
    print("⚙️ Cấu hình:")
    if Path('.env').exists():
        try:
            from dotenv import load_dotenv
            load_dotenv()
            
            api_id = os.getenv('API_ID')
            api_hash = os.getenv('API_HASH')
            
            if api_id and api_hash:
                print(f"   ✅ API_ID: {api_id}")
                print(f"   ✅ API_HASH: {api_hash[:10]}...")
            else:
                print("   ❌ API_ID hoặc API_HASH chưa được cấu hình")
        except ImportError:
            print("   ❌ python-dotenv chưa được cài đặt")
    else:
        print("   ❌ File .env không tồn tại")
    
    print()
    
    # Hướng dẫn sử dụng
    print("🎯 Cách sử dụng:")
    print("   1. Cài đặt: install.bat")
    print("   2. Cấu hình: Chỉnh sửa file .env")
    print("   3. Chạy desktop: run.bat")
    print("   4. Chạy CLI: run.bat cmd")
    print()
    
    print("✨ Tính năng mới:")
    print("   • Giao diện theo phong cách Telegram")
    print("   • Chọn miền quốc gia cho số điện thoại")
    print("   • Màu trắng sữa tinh tế")
    print("   • Đăng nhập 3 bước an toàn")
    print("   • Script Windows .bat tiện lợi")

def test_imports():
    """Test import các module"""
    print("\n🧪 Test import modules:")
    
    modules = [
        ("customtkinter", "CustomTkinter GUI"),
        ("telethon", "Telegram API"),
        ("dotenv", "Environment variables"),
        ("app", "Desktop application"),
        ("cmd", "Command line interface"),
        ("telegram", "Telegram handler")
    ]
    
    for module, desc in modules:
        try:
            __import__(module)
            print(f"   ✅ {module:<15} - {desc}")
        except ImportError as e:
            print(f"   ❌ {module:<15} - {desc} ({e})")

def main():
    """Hàm chính"""
    show_project_info()
    test_imports()
    
    print("\n" + "=" * 50)
    print("🎉 TeleDrive đã sẵn sàng!")
    print("💡 Chạy 'run.bat' để bắt đầu")

if __name__ == "__main__":
    main()
