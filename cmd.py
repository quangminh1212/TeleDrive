#!/usr/bin/env python3
"""
CMD - Giao diện dòng lệnh cho TeleDrive
"""

import asyncio
import sys
from pathlib import Path
from telegram import get_telegram_manager

def print_files(files):
    """In danh sách file"""
    if not files:
        print("Không tìm thấy file nào.")
        return
    
    print(f"\n{'STT':<3} {'Tên file':<40} {'Kích thước':<10} {'Ngày':<16}")
    print("-" * 70)
    
    for i, file in enumerate(files, 1):
        name = file['name'][:37] + "..." if len(file['name']) > 40 else file['name']
        print(f"{i:<3} {name:<40} {file['size_formatted']:<10} {file['date']:<16}")

async def cmd_list(channel, limit=50):
    """Liệt kê file"""
    print(f"📋 Đang tải danh sách file từ {channel}...")
    
    telegram = get_telegram_manager()
    result = await telegram.list_files(channel, limit)
    
    if result["success"]:
        print(f"✅ Tìm thấy {len(result['files'])} file")
        print_files(result["files"])
    else:
        print(f"❌ Lỗi: {result['message']}")

async def cmd_search(channel, query, limit=20):
    """Tìm kiếm file"""
    print(f"🔍 Đang tìm kiếm '{query}' trong {channel}...")
    
    telegram = get_telegram_manager()
    result = await telegram.search_files(channel, query, limit)
    
    if result["success"]:
        print(f"✅ Tìm thấy {len(result['files'])} file phù hợp")
        print_files(result["files"])
    else:
        print(f"❌ Lỗi: {result['message']}")

async def cmd_download(channel, file_number):
    """Tải file"""
    print(f"⬇️ Đang tải file số {file_number} từ {channel}...")
    
    telegram = get_telegram_manager()
    
    # Lấy danh sách file trước
    list_result = await telegram.list_files(channel, 100)
    if not list_result["success"]:
        print(f"❌ Lỗi lấy danh sách file: {list_result['message']}")
        return
    
    files = list_result["files"]
    if file_number < 1 or file_number > len(files):
        print(f"❌ Số file không hợp lệ. Có {len(files)} file.")
        return
    
    file_info = files[file_number - 1]
    result = await telegram.download_file(channel, file_info["id"])
    
    if result["success"]:
        print(f"✅ {result['message']}")
        print(f"📁 Đường dẫn: {result['file_path']}")
    else:
        print(f"❌ Lỗi: {result['message']}")

async def cmd_upload(channel, file_path, caption=""):
    """Upload file"""
    print(f"⬆️ Đang upload {file_path} lên {channel}...")
    
    telegram = get_telegram_manager()
    result = await telegram.upload_file(channel, file_path, caption)
    
    if result["success"]:
        print(f"✅ {result['message']}")
    else:
        print(f"❌ Lỗi: {result['message']}")

async def main():
    """Hàm chính"""
    if len(sys.argv) < 2:
        print("TeleDrive - Quản lý file Telegram")
        print("\nCách sử dụng:")
        print("  python cmd.py list <channel> [limit]")
        print("  python cmd.py search <channel> <từ_khóa> [limit]")
        print("  python cmd.py download <channel> <số_file>")
        print("  python cmd.py upload <channel> <đường_dẫn_file> [mô_tả]")
        print("\nVí dụ:")
        print("  python cmd.py list @mychannel 10")
        print("  python cmd.py search @mychannel 'video' 5")
        print("  python cmd.py download @mychannel 1")
        print("  python cmd.py upload @mychannel ./file.pdf 'Tài liệu'")
        return
    
    command = sys.argv[1].lower()
    
    # Kết nối Telegram
    telegram = get_telegram_manager()
    connect_result = await telegram.connect()
    
    if not connect_result["success"]:
        print(f"❌ Không thể kết nối Telegram: {connect_result['message']}")
        print("💡 Hãy chạy ứng dụng desktop để đăng nhập trước.")
        return
    
    user = connect_result.get("user")
    if user:
        print(f"✅ Đã kết nối với tài khoản: {user.first_name}")
    
    try:
        if command == "list":
            if len(sys.argv) < 3:
                print("❌ Cách dùng: python cmd.py list <channel> [limit]")
                return
            
            channel = sys.argv[2]
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 50
            await cmd_list(channel, limit)
        
        elif command == "search":
            if len(sys.argv) < 4:
                print("❌ Cách dùng: python cmd.py search <channel> <từ_khóa> [limit]")
                return
            
            channel = sys.argv[2]
            query = sys.argv[3]
            limit = int(sys.argv[4]) if len(sys.argv) > 4 else 20
            await cmd_search(channel, query, limit)
        
        elif command == "download":
            if len(sys.argv) < 4:
                print("❌ Cách dùng: python cmd.py download <channel> <số_file>")
                return
            
            channel = sys.argv[2]
            file_number = int(sys.argv[3])
            await cmd_download(channel, file_number)
        
        elif command == "upload":
            if len(sys.argv) < 4:
                print("❌ Cách dùng: python cmd.py upload <channel> <đường_dẫn_file> [mô_tả]")
                return
            
            channel = sys.argv[2]
            file_path = sys.argv[3]
            caption = sys.argv[4] if len(sys.argv) > 4 else ""
            await cmd_upload(channel, file_path, caption)
        
        else:
            print(f"❌ Lệnh không hợp lệ: {command}")
    
    finally:
        await telegram.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
