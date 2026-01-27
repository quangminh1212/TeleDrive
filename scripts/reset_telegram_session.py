#!/usr/bin/env python3
"""
Reset Telegram Session
Xóa session cũ và thiết lập lại từ đầu
"""

import os
import sys
import glob
import shutil
from pathlib import Path

def reset_session():
    """Reset tất cả session files"""
    print("🔄 Reset Telegram Session")
    print("=" * 50)
    
    # Danh sách các file/folder cần xóa
    patterns = [
        "data/*.session",
        "data/*.session-journal",
        "*.session",
        "*.session-journal",
        "app/*.session",
        "app/*.session-journal",
        "data/auth_session_*.session",
        "data/code_req_*.session",
        "data/verify_*.session"
    ]
    
    deleted_count = 0
    
    print("\n🗑️  Đang xóa session files...")
    
    for pattern in patterns:
        files = glob.glob(pattern)
        for file in files:
            try:
                if os.path.exists(file):
                    os.remove(file)
                    print(f"   ✅ Đã xóa: {file}")
                    deleted_count += 1
            except Exception as e:
                print(f"   ⚠️  Không thể xóa {file}: {e}")
    
    # Xóa thư mục temp nếu có
    temp_dirs = ["data/temp", "temp", "app/temp"]
    for temp_dir in temp_dirs:
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                print(f"   ✅ Đã xóa thư mục: {temp_dir}")
            except Exception as e:
                print(f"   ⚠️  Không thể xóa {temp_dir}: {e}")
    
    print(f"\n✅ Đã xóa {deleted_count} file(s)")
    
    # Tạo lại thư mục data nếu cần
    if not os.path.exists("data"):
        os.makedirs("data")
        print("✅ Đã tạo thư mục data/")
    
    print("\n" + "=" * 50)
    print("✅ RESET HOÀN TẤT!")
    print("=" * 50)
    
    print("\n📝 CÁC BƯỚC TIẾP THEO:")
    print("1. Chạy: setup_telegram_auto_login.bat")
    print("   Hoặc: python scripts/import_telegram_desktop_session.py")
    print("2. Sau đó chạy: run.bat")
    print("=" * 50)

def main():
    """Main function"""
    print("\n⚠️  CẢNH BÁO: Script này sẽ xóa TẤT CẢ session files!")
    print("Bạn sẽ cần đăng nhập lại sau khi reset.\n")
    
    try:
        response = input("Bạn có chắc chắn muốn tiếp tục? (yes/no): ").strip().lower()
        
        if response in ['yes', 'y', 'có', 'c']:
            reset_session()
        else:
            print("\n❌ Đã hủy reset")
            sys.exit(0)
    except KeyboardInterrupt:
        print("\n\n❌ Đã hủy bởi người dùng")
        sys.exit(1)

if __name__ == "__main__":
    main()
