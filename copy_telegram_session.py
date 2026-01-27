#!/usr/bin/env python3
"""
Copy Telegram Desktop Session to TeleDrive
Workaround for opentele compatibility issues on Python 3.14
"""

import os
import shutil
import sys
from pathlib import Path

def find_telegram_desktop():
    """Tìm thư mục Telegram Desktop tdata"""
    possible_paths = [
        os.path.expandvars(r"%APPDATA%\Telegram Desktop\tdata"),
        os.path.expandvars(r"%USERPROFILE%\AppData\Roaming\Telegram Desktop\tdata"),
        "C:\\Program Files\\Telegram Desktop\\tdata",
        "C:\\Program Files (x86)\\Telegram Desktop\\tdata",
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None

def check_telegram_logged_in(tdata_path):
    """Kiểm tra xem Telegram Desktop đã đăng nhập chưa"""
    # Kiểm tra các file quan trọng
    key_data = os.path.join(tdata_path, "key_data")
    if not os.path.exists(key_data):
        return False
    
    # Kiểm tra có thư mục D877F783D5D3EF8C (hoặc tương tự)
    for item in os.listdir(tdata_path):
        item_path = os.path.join(tdata_path, item)
        if os.path.isdir(item_path) and len(item) == 16:
            # Có thể là thư mục session
            return True
    
    return False

def copy_session_files(tdata_path, dest_dir="data"):
    """Copy session files từ Telegram Desktop"""
    try:
        # Tạo thư mục đích
        os.makedirs(dest_dir, exist_ok=True)
        
        # Copy key_data
        key_data_src = os.path.join(tdata_path, "key_data")
        key_data_dst = os.path.join(dest_dir, "telegram_key_data")
        
        if os.path.exists(key_data_src):
            shutil.copy2(key_data_src, key_data_dst)
            print(f"✅ Copied key_data")
        
        # Copy session folders
        copied_folders = 0
        for item in os.listdir(tdata_path):
            item_path = os.path.join(tdata_path, item)
            if os.path.isdir(item_path) and len(item) == 16:
                dest_folder = os.path.join(dest_dir, f"telegram_{item}")
                if os.path.exists(dest_folder):
                    shutil.rmtree(dest_folder)
                shutil.copytree(item_path, dest_folder)
                copied_folders += 1
                print(f"✅ Copied session folder: {item}")
        
        if copied_folders > 0:
            print(f"\n✅ Đã copy {copied_folders} session folders")
            return True
        else:
            print("❌ Không tìm thấy session folders")
            return False
            
    except Exception as e:
        print(f"❌ Lỗi khi copy: {e}")
        return False

def create_session_marker():
    """Tạo marker file để app biết có session từ Desktop"""
    marker_file = "data/.telegram_desktop_session"
    try:
        with open(marker_file, 'w') as f:
            f.write("1")
        print(f"✅ Created session marker")
        return True
    except Exception as e:
        print(f"❌ Lỗi tạo marker: {e}")
        return False

def main():
    print("=" * 60)
    print("Copy Telegram Desktop Session to TeleDrive")
    print("=" * 60)
    print()
    
    # Bước 1: Tìm Telegram Desktop
    print("[1/4] Tìm Telegram Desktop...")
    tdata_path = find_telegram_desktop()
    
    if not tdata_path:
        print("❌ Không tìm thấy Telegram Desktop")
        print()
        print("Vui lòng:")
        print("1. Cài đặt Telegram Desktop từ: https://desktop.telegram.org/")
        print("2. Đăng nhập vào Telegram Desktop")
        print("3. Chạy lại script này")
        return 1
    
    print(f"✅ Tìm thấy: {tdata_path}")
    print()
    
    # Bước 2: Kiểm tra đã đăng nhập
    print("[2/4] Kiểm tra trạng thái đăng nhập...")
    if not check_telegram_logged_in(tdata_path):
        print("❌ Telegram Desktop chưa đăng nhập")
        print()
        print("Vui lòng:")
        print("1. Mở Telegram Desktop")
        print("2. Đăng nhập vào tài khoản của bạn")
        print("3. Chạy lại script này")
        return 1
    
    print("✅ Telegram Desktop đã đăng nhập")
    print()
    
    # Bước 3: Copy session files
    print("[3/4] Copy session files...")
    if not copy_session_files(tdata_path):
        print("❌ Không thể copy session files")
        return 1
    
    print()
    
    # Bước 4: Tạo marker
    print("[4/4] Tạo session marker...")
    if not create_session_marker():
        print("❌ Không thể tạo marker")
        return 1
    
    print()
    print("=" * 60)
    print("✅ HOÀN THÀNH!")
    print("=" * 60)
    print()
    print("Session đã được copy thành công!")
    print()
    print("Bây giờ bạn có thể:")
    print("1. Chạy TeleDrive: run.bat hoặc python main.py")
    print("2. Ứng dụng sẽ tự động sử dụng session từ Telegram Desktop")
    print("3. Không cần đăng nhập lại!")
    print()
    print("Lưu ý:")
    print("- Session được lưu trong thư mục data/")
    print("- Nếu đăng xuất Telegram Desktop, cần copy lại session")
    print()
    
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n❌ Đã hủy bởi người dùng")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
