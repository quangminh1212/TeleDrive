#!/usr/bin/env python3
"""
Debug script để kiểm tra Telegram Desktop session
"""
import os
import sys

print("=== Kiểm Tra Telegram Desktop ===\n")

# Các đường dẫn có thể có
possible_paths = [
    os.path.expandvars(r"%APPDATA%\Telegram Desktop\tdata"),
    os.path.expanduser("~/AppData/Roaming/Telegram Desktop/tdata"),
    os.path.expanduser("~\\AppData\\Roaming\\Telegram Desktop\\tdata"),
    "C:\\Users\\%USERNAME%\\AppData\\Roaming\\Telegram Desktop\\tdata",
]

print("Đang tìm Telegram Desktop...\n")

found_path = None
for path in possible_paths:
    expanded = os.path.expandvars(os.path.expanduser(path))
    print(f"Kiểm tra: {expanded}")
    if os.path.exists(expanded):
        print(f"  ✅ Tìm thấy!")
        found_path = expanded
        break
    else:
        print(f"  ❌ Không tồn tại")

if not found_path:
    print("\n❌ Không tìm thấy Telegram Desktop!")
    print("\nGợi ý:")
    print("1. Cài đặt Telegram Desktop từ: https://desktop.telegram.org/")
    print("2. Đăng nhập vào Telegram Desktop")
    print("3. Chạy lại script này")
    sys.exit(1)

print(f"\n✅ Tìm thấy Telegram Desktop tại: {found_path}\n")

# Kiểm tra nội dung
print("Nội dung thư mục tdata:")
try:
    items = os.listdir(found_path)
    for item in items[:20]:  # Chỉ hiển thị 20 item đầu
        item_path = os.path.join(found_path, item)
        if os.path.isdir(item_path):
            print(f"  📁 {item}/")
        else:
            size = os.path.getsize(item_path)
            print(f"  📄 {item} ({size} bytes)")
    
    if len(items) > 20:
        print(f"  ... và {len(items) - 20} item khác")
except Exception as e:
    print(f"  ❌ Lỗi đọc thư mục: {e}")

# Kiểm tra opentele
print("\n=== Kiểm Tra opentele ===\n")
try:
    from opentele.td import TDesktop
    from opentele.api import UseCurrentSession
    print("✅ opentele đã được cài đặt")
    
    # Thử load session
    print(f"\nĐang thử load session từ: {found_path}")
    try:
        tdesk = TDesktop(found_path)
        print("✅ Load TDesktop thành công!")
        
        if tdesk.isLoaded():
            print("✅ Session đã được load!")
            print("\n🎉 Auto-login sẽ hoạt động!")
        else:
            print("❌ Session chưa được load")
            print("\nGợi ý:")
            print("1. Mở Telegram Desktop")
            print("2. Đăng nhập vào account")
            print("3. Đợi sync xong")
            print("4. Thử lại")
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Lỗi load TDesktop: {error_msg}")
        
        if "No account has been loaded" in error_msg:
            print("\n⚠️ Telegram Desktop chưa có account nào được đăng nhập!")
            print("\nGợi ý:")
            print("1. Mở Telegram Desktop")
            print("2. Đăng nhập vào account của bạn")
            print("3. Đợi sync xong (thấy tin nhắn)")
            print("4. Đóng Telegram Desktop (hoặc để chạy)")
            print("5. Chạy lại script này")
        else:
            print(f"\n⚠️ Lỗi không xác định: {error_msg}")
            
except ImportError as e:
    print("❌ opentele chưa được cài đặt")
    print(f"\nLỗi: {e}")
    print("\nCài đặt:")
    print("  pip install opentele")
except Exception as e:
    print(f"❌ Lỗi: {e}")
    print("\n⚠️ opentele có thể không tương thích với Python hiện tại")
    print("opentele chỉ hoạt động với Python 3.11")
    print(f"Python hiện tại: {sys.version}")

print("\n=== Kết Thúc ===")
