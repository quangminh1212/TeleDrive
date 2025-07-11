#!/usr/bin/env python3
"""
Demo script cho private channel
Hướng dẫn chi tiết cách sử dụng với private channel
"""

import asyncio
import sys
from private_channel_scanner import PrivateChannelScanner

def print_instructions():
    """In hướng dẫn chi tiết"""
    print("🔐 HƯỚNG DẪN SỬ DỤNG PRIVATE CHANNEL SCANNER")
    print("=" * 60)
    print()
    print("📋 CÁC BƯỚC CHUẨN BỊ:")
    print("1. Đảm bảo đã cấu hình API credentials trong file .env")
    print("2. Chuẩn bị thông tin kênh private:")
    print("   - Invite link: https://t.me/joinchat/xxxxx")
    print("   - Hoặc link mới: https://t.me/+xxxxx")
    print("   - Hoặc username nếu đã join: @privatechannel")
    print()
    print("🔗 CÁCH LẤY INVITE LINK:")
    print("- Mở kênh private trong Telegram")
    print("- Nhấn vào tên kênh > Share > Copy Link")
    print("- Hoặc nhờ admin gửi invite link")
    print()
    print("⚠️ LỖI THƯỜNG GẶP:")
    print("- 'Could not find the input entity': Sai tên kênh hoặc chưa join")
    print("- 'CHAT_ADMIN_REQUIRED': Không có quyền truy cập")
    print("- 'INVITE_HASH_EXPIRED': Link invite đã hết hạn")
    print()
    print("💡 GIẢI PHÁP:")
    print("- Đảm bảo đã join kênh trước khi quét")
    print("- Sử dụng invite link mới nhất")
    print("- Kiểm tra quyền của tài khoản trong kênh")
    print()

async def demo_scan():
    """Demo quét private channel"""
    print_instructions()
    
    choice = input("👉 Bạn có muốn tiếp tục quét private channel? (y/n): ").strip().lower()
    if choice != 'y':
        print("👋 Tạm biệt!")
        return
    
    scanner = PrivateChannelScanner()
    
    try:
        print("\n🚀 Bắt đầu quét private channel...")
        await scanner.scan_private_channel_interactive()
        
    except KeyboardInterrupt:
        print("\n⏹️ Đã dừng bởi người dùng")
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        print("\n🔧 TROUBLESHOOTING:")
        print("1. Kiểm tra file .env có đúng API credentials không")
        print("2. Đảm bảo đã join kênh private")
        print("3. Thử với invite link mới")
        print("4. Kiểm tra kết nối internet")
        
        import traceback
        print(f"\n📝 Chi tiết lỗi:")
        traceback.print_exc()
    finally:
        await scanner.close()
    
    input("\n📱 Nhấn Enter để thoát...")

def main():
    """Main function"""
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    asyncio.run(demo_scan())

if __name__ == "__main__":
    main()
