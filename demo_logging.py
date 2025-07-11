#!/usr/bin/env python3
"""
Demo script để show logging system trong action
Mô phỏng quá trình scan channel với logging chi tiết
"""

import asyncio
import json
import time
from logger import setup_detailed_logging, log_step, log_config_change, log_api_call, log_file_operation, log_progress, log_error

async def demo_scan_process():
    """Demo quá trình scan với logging chi tiết"""
    
    # Load config và setup logging
    with open('config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    logging_config = config.get('logging', {})
    setup_detailed_logging(logging_config)
    
    print("🎬 DEMO: Telegram File Scanner với Logging Chi Tiết")
    print("=" * 60)
    
    # Bước 1: Khởi tạo
    log_step("KHỞI ĐỘNG ỨNG DỤNG", "Bắt đầu demo quá trình scan")
    await asyncio.sleep(1)
    
    # Bước 2: Load config
    log_step("LOAD CONFIGURATION", "Đang tải cấu hình từ config.json")
    log_config_change("LOAD", {
        "file": "config.json",
        "telegram_api_id": config.get('telegram', {}).get('api_id', 'N/A'),
        "logging_enabled": config.get('logging', {}).get('enabled', False)
    })
    await asyncio.sleep(1)
    
    # Bước 3: Khởi tạo client
    log_step("KHỞI TẠO CLIENT", "Đang tạo Telegram client")
    log_api_call("TelegramClient.__init__", {
        "session_name": "demo_session",
        "api_id": config.get('telegram', {}).get('api_id', 'demo'),
        "api_hash": "demo_hash"
    })
    await asyncio.sleep(1)
    
    # Bước 4: Đăng nhập
    log_step("ĐĂNG NHẬP", "Đang đăng nhập vào Telegram")
    log_api_call("client.start", {
        "phone": config.get('telegram', {}).get('phone_number', '+84xxxxxxxxx')
    }, "success")
    await asyncio.sleep(1)
    
    # Bước 5: Lấy thông tin channel
    log_step("LẤY THÔNG TIN CHANNEL", "Đang lấy entity của channel")
    log_api_call("client.get_entity", {
        "channel": "@demo_channel"
    }, "entity_found")
    await asyncio.sleep(1)
    
    # Bước 6: Đếm tin nhắn
    log_step("ĐẾM TIN NHẮN", "Đang đếm tổng số tin nhắn trong channel")
    total_messages = 1500  # Demo
    log_api_call("client.iter_messages", {
        "entity": "@demo_channel",
        "limit": None
    }, f"{total_messages} messages found")
    await asyncio.sleep(1)
    
    # Bước 7: Quét file
    log_step("BẮT ĐẦU QUÉT FILE", f"Đang quét {total_messages:,} tin nhắn để tìm file")
    
    files_found = 0
    for i in range(1, total_messages + 1):
        # Mô phỏng tìm file
        if i % 10 == 0:  # Giả sử cứ 10 message có 1 file
            files_found += 1
            if files_found % 5 == 0:  # Log progress mỗi 5 file
                log_progress(files_found, total_messages // 10, "files found")
        
        # Log progress tổng thể mỗi 100 message
        if i % 100 == 0:
            log_progress(i, total_messages, "messages processed")
            await asyncio.sleep(0.1)  # Tạm dừng để thấy progress
    
    log_step("HOÀN THÀNH QUÉT", f"Đã quét {total_messages:,} tin nhắn, tìm thấy {files_found} file")
    
    # Bước 8: Lưu kết quả
    log_step("LƯU KẾT QUẢ", f"Đang lưu {files_found} file vào các định dạng")
    
    # Lưu CSV
    log_file_operation("CREATE", "output/demo_files.csv", f"CSV với {files_found} records")
    await asyncio.sleep(0.5)
    
    # Lưu Excel
    log_file_operation("CREATE", "output/demo_files.xlsx", f"Excel với {files_found} records")
    await asyncio.sleep(0.5)
    
    # Lưu JSON
    log_file_operation("CREATE", "output/demo_files.json", f"JSON chi tiết với {files_found} files")
    await asyncio.sleep(0.5)
    
    # Lưu Simple JSON
    log_file_operation("CREATE", "output/demo_simple.json", f"JSON đơn giản với {files_found} files")
    await asyncio.sleep(0.5)
    
    # Bước 9: Thống kê
    log_step("THỐNG KÊ", "Tạo báo cáo thống kê")
    stats = {
        "total_messages": total_messages,
        "files_found": files_found,
        "success_rate": f"{(files_found/total_messages*100):.1f}%",
        "file_types": {
            "documents": files_found // 2,
            "photos": files_found // 3,
            "videos": files_found // 4
        }
    }
    log_config_change("STATS", stats)
    
    # Bước 10: Hoàn thành
    log_step("HOÀN THÀNH", "Demo quá trình scan đã hoàn thành thành công")
    
    print("\n✅ Demo hoàn thành!")
    print("📁 Kiểm tra thư mục logs/ để xem chi tiết logging:")
    print("   - logs/scanner.log   (log chính)")
    print("   - logs/config.log    (thay đổi config)")
    print("   - logs/api.log       (API calls)")
    print("   - logs/files.log     (file operations)")
    print("   - logs/errors.log    (errors nếu có)")

async def demo_with_error():
    """Demo với lỗi để test error logging"""
    log_step("DEMO LỖI", "Mô phỏng lỗi để test error logging")
    
    try:
        # Mô phỏng lỗi API
        raise ConnectionError("Không thể kết nối đến Telegram API")
    except Exception as e:
        log_error(e, "Demo connection error")
    
    try:
        # Mô phỏng lỗi file
        raise FileNotFoundError("Không tìm thấy file config")
    except Exception as e:
        log_error(e, "Demo file error")

if __name__ == "__main__":
    print("Chọn demo:")
    print("1. Demo quá trình scan bình thường")
    print("2. Demo với lỗi")
    print("3. Cả hai")
    
    choice = input("Nhập lựa chọn (1-3): ").strip()
    
    if choice in ['1', '3']:
        asyncio.run(demo_scan_process())
    
    if choice in ['2', '3']:
        print("\n" + "="*60)
        asyncio.run(demo_with_error())
