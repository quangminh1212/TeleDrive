#!/usr/bin/env python3
"""
Script chạy nhanh Telegram File Scanner với giao diện đơn giản
"""

import asyncio
import sys
from scanner import TelegramFileScanner

async def quick_scan():
    """Chạy nhanh với giao diện đơn giản"""
    print("🚀 TELEGRAM FILE SCANNER")
    print("=" * 50)
    
    scanner = TelegramFileScanner()
    
    try:
        print("🔐 Đang kết nối với Telegram...")
        await scanner.initialize()
        
        print("\n📋 Nhập thông tin kênh cần quét:")
        print("   - Username: @channelname")
        print("   - Link: https://t.me/channelname")
        print("   - Hoặc chỉ tên: channelname")
        
        while True:
            channel_input = input("\n👉 Kênh: ").strip()
            if channel_input:
                break
            print("❌ Vui lòng nhập tên kênh!")
        
        print(f"\n🎯 Bắt đầu quét kênh: {channel_input}")
        await scanner.scan_channel(channel_input)
        
        if scanner.files_data:
            await scanner.save_results()
            print(f"\n🎉 Hoàn thành! Đã tìm thấy {len(scanner.files_data)} file")
            print(f"📁 Kết quả đã được lưu trong thư mục 'output/'")
        else:
            print("\n⚠️ Không tìm thấy file nào trong kênh này")
            
    except KeyboardInterrupt:
        print("\n⏹️ Đã dừng bởi người dùng")
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        print("💡 Kiểm tra lại cấu hình trong file .env")
    finally:
        await scanner.close()
        
    input("\n📱 Nhấn Enter để thoát...")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    asyncio.run(quick_scan())
