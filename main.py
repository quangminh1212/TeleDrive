#!/usr/bin/env python3
"""
Telegram File Scanner - Entry Point
Hỗ trợ cả public và private channel/group Telegram
"""

import asyncio
import sys
from engine import TelegramFileScanner

# Import detailed logging
try:
    from logger import log_step, log_error, get_logger
    DETAILED_LOGGING_AVAILABLE = True
    logger = get_logger('main')
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)

async def main():
    """Main function cho Telegram File Scanner"""
    print("📡 TELEGRAM FILE SCANNER")
    print("=" * 50)

    if DETAILED_LOGGING_AVAILABLE:
        log_step("KHỞI ĐỘNG ỨNG DỤNG", "Bắt đầu Telegram File Scanner")

    print("🔧 Đang khởi tạo scanner...")
    scanner = TelegramFileScanner()

    try:
        print("✅ Scanner đã sẵn sàng")

        # Hiển thị menu lựa chọn
        print("\n📋 Chọn chế độ quét:")
        print("   1. Quét public channel/group")
        print("   2. Quét private channel/group (interactive)")

        choice = input("\n👉 Lựa chọn (1/2): ").strip()

        if choice == "2":
            # Chế độ private channel interactive
            if DETAILED_LOGGING_AVAILABLE:
                log_step("BẮT ĐẦU QUÉT", "Khởi động quá trình quét private channel interactive")
            await scanner.scan_private_channel_interactive()
        else:
            # Chế độ public channel thông thường
            if DETAILED_LOGGING_AVAILABLE:
                log_step("BẮT ĐẦU QUÉT", "Khởi động quá trình quét public channel")

            channel_input = input("\n👉 Nhập username kênh (ví dụ: @channelname) hoặc link: ").strip()
            if not channel_input:
                print("❌ Vui lòng nhập username hoặc link kênh")
                return

            await scanner.initialize()
            await scanner.scan_channel(channel_input)
            await scanner.save_results()

        print("\n🎉 Quá trình quét hoàn thành!")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("HOÀN THÀNH", "Quá trình quét đã hoàn thành thành công")

    except KeyboardInterrupt:
        print("\n⏹️ Đã dừng bởi người dùng")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("DỪNG BỞI NGƯỜI DÙNG", "Ứng dụng bị dừng bởi Ctrl+C", "WARNING")

    except Exception as e:
        print(f"\n❌ LỖI: {e}")
        if DETAILED_LOGGING_AVAILABLE:
            log_error(e, "Main application error")

        if "CHUA CAU HINH PHONE_NUMBER" in str(e):
            print("\n📋 HƯỚNG DẪN CẤU HÌNH SỐ ĐIỆN THOẠI:")
            print("   1. Mở file config.json")
            print("   2. Thay '+84xxxxxxxxx' bằng số điện thoại thật")
            print("   3. Ví dụ: +84987654321")
            print("   4. Phải có mã quốc gia (+84 cho Việt Nam)")
        else:
            print("\n📊 Chi tiết lỗi:")
            import traceback
            traceback.print_exc()
    finally:
        print("\n🔧 Đang đóng kết nối...")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("ĐÓNG ỨNG DỤNG", "Đang đóng kết nối và dọn dẹp")
        await scanner.close()
        print("✅ Đã đóng kết nối thành công")

if __name__ == "__main__":
    print("🔧 Đang khởi tạo hệ thống...")

    # Load config
    print("📋 Đang tải cấu hình...")
    try:
        import config
        print("✅ Đã tải cấu hình thành công")
    except Exception as e:
        print(f"❌ Lỗi tải cấu hình: {e}")
        sys.exit(1)

    # Setup detailed logging nếu có
    print("📊 Đang thiết lập hệ thống logging...")
    if DETAILED_LOGGING_AVAILABLE:
        try:
            from logger import setup_detailed_logging
            logging_config = config.CONFIG.get('logging', {})
            if logging_config.get('enabled', True):
                setup_detailed_logging(logging_config)
                log_step("KHỞI TẠO HỆ THỐNG", "Đã thiết lập logging chi tiết")
                print("✅ Hệ thống logging chi tiết đã sẵn sàng")
            else:
                print("⚠️ Logging bị tắt trong cấu hình")
        except Exception as e:
            print(f"⚠️ Không thể setup detailed logging: {e}")
            print("   (Ứng dụng sẽ chạy với logging cơ bản)")
    else:
        print("⚠️ Module logging chi tiết không khả dụng")

    # Setup Windows event loop
    print("🔧 Đang cấu hình event loop...")
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("✅ Đã cấu hình Windows ProactorEventLoopPolicy")

    print("🚀 Khởi động ứng dụng chính...")
    print("=" * 60)

    asyncio.run(main())
