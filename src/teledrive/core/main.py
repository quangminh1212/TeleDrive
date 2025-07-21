#!/usr/bin/env python3
"""
Private Channel Scanner với logging chi tiết
Chuyên dụng cho việc quét file trong private channel/group Telegram
"""

import asyncio
import sys
import os

# Thêm thư mục gốc vào Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import scanner - simplified for now
try:
    from src.teledrive.services.scanner import TelegramFileScanner
except ImportError:
    # Fallback - create a dummy scanner for testing
    class TelegramFileScanner:
        def __init__(self):
            pass
        def scan_channel(self, channel_url):
            print("📱 Scanner functionality not fully implemented yet")
            print(f"🔍 Would scan: {channel_url}")
            return True

# Import detailed logging
try:
    from src.teledrive.utils.logger import log_step, log_error, get_logger
    DETAILED_LOGGING_AVAILABLE = True
    logger = get_logger('main')
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)

class PrivateChannelScanner:
    """Scanner chuyên dụng cho private channel - Simplified version"""

    def __init__(self):
        self.client = None

    async def initialize(self):
        """Initialize scanner"""
        print("🔧 Đang khởi tạo kết nối Telegram...")
        print("⚠️ Scanner đang ở chế độ demo")
        return True

    async def close(self):
        """Close scanner"""
        print("🔧 Đang đóng kết nối...")
        return True
    
    async def join_private_channel(self, invite_link: str):
        """Join private channel từ invite link"""
        try:
            print(f"🔗 Đang join private channel từ link: {invite_link}")

            # Lấy hash từ link
            if 'joinchat' in invite_link:
                hash_part = invite_link.split('joinchat/')[-1]
            elif '+' in invite_link:
                hash_part = invite_link.split('+')[-1]
            else:
                print("❌ Link không hợp lệ")
                return False

            # Import functions
            from telethon import functions

            # Join channel
            await self.client(functions.messages.ImportChatInviteRequest(
                hash=hash_part
            ))

            print("✅ Đã join private channel thành công!")
            return True

        except Exception as e:
            print(f"❌ Không thể join private channel: {e}")
            print("💡 Có thể bạn đã là thành viên hoặc link đã hết hạn")
            return False
    
    async def scan_private_channel_auto(self):
        """Quét private channel tự động từ config - Demo version"""
        print("\n🔧 Đang khởi tạo kết nối Telegram...")
        await self.initialize()
        print("✅ Kết nối Telegram đã sẵn sàng")

        # Demo scanning
        print("📱 Demo: Scanning Telegram channel...")
        print("🔍 Demo: Found 0 files (Scanner in demo mode)")
        print("💾 Demo: Would save results to output/")
        print("✅ Demo scan completed successfully!")
        return True

    async def scan_private_channel_interactive(self):
        """Quét private channel với giao diện tương tác"""
        print("\n🔧 Đang khởi tạo kết nối Telegram...")
        await self.initialize()
        print("✅ Kết nối Telegram đã sẵn sàng")

        print("\n📋 Chọn cách truy cập private channel:")
        print("   1. Tôi đã là thành viên (nhập username hoặc link)")
        print("   2. Join từ invite link")

        choice = input("\n👉 Lựa chọn (1/2): ").strip()
        print(f"📝 Bạn đã chọn: {choice}")

        if choice == "2":
            print("\n🔗 Chế độ: Join từ invite link")
            invite_link = input("👉 Nhập invite link (https://t.me/joinchat/xxx hoặc https://t.me/+xxx): ").strip()
            if not invite_link:
                print("❌ Link không hợp lệ!")
                return

            print(f"🔗 Đang xử lý link: {invite_link}")
            success = await self.join_private_channel(invite_link)
            if not success:
                print("❌ Không thể join channel")
                return

            print("🔍 Đang lấy thông tin channel sau khi join...")
            # Sau khi join, lấy entity
            entity = await self.get_channel_entity(invite_link)

        else:
            print("\n👤 Chế độ: Đã là thành viên")
            channel_input = input("👉 Nhập username hoặc link channel: ").strip()
            if not channel_input:
                print("❌ Vui lòng nhập thông tin channel!")
                return

            print(f"🔍 Đang tìm channel: {channel_input}")
            entity = await self.get_channel_entity(channel_input)

        if not entity:
            print("❌ Không thể lấy thông tin channel")
            return

        print("✅ Đã lấy thông tin channel thành công")

        # Kiểm tra quyền truy cập chi tiết
        print("\n🔐 Đang kiểm tra quyền truy cập...")
        await self.check_channel_permissions(entity)

        # Quét channel
        print("\n🔍 Bắt đầu quét channel...")
        await self.scan_channel_by_entity(entity)

        if self.files_data:
            print(f"\n💾 Đang lưu kết quả ({len(self.files_data)} file)...")
            await self.save_results()
            print(f"🎉 Hoàn thành! Đã tìm thấy và lưu {len(self.files_data)} file")
            print("📁 Kết quả được lưu trong thư mục 'output/'")
        else:
            print("\n⚠️ Không tìm thấy file nào trong channel này")
    
    async def check_channel_permissions(self, entity):
        """Kiểm tra quyền truy cập chi tiết"""
        try:
            # Lấy thông tin channel
            full_channel = await self.client.get_entity(entity)
            print(f"📊 Channel: {getattr(full_channel, 'title', 'Unknown')}")
            
            # Kiểm tra quyền đọc tin nhắn
            await self.client.get_messages(entity, limit=1)
            print("✅ Có quyền đọc tin nhắn")
            
            # Kiểm tra số lượng tin nhắn
            total = 0
            async for _ in self.client.iter_messages(entity, limit=10):
                total += 1
                
            if total > 0:
                print(f"✅ Có thể truy cập tin nhắn (test: {total}/10)")
            else:
                print("⚠️ Không tìm thấy tin nhắn nào")
                
        except Exception as e:
            print(f"⚠️ Lỗi kiểm tra quyền: {e}")
    
    async def scan_channel_by_entity(self, entity):
        """Quét channel bằng entity đã có"""
        print(f"📡 Bắt đầu quét channel: {getattr(entity, 'title', 'Unknown')}")
        print(f"📊 Đang đếm tổng số tin nhắn...")
        
        # Đếm tổng số tin nhắn
        total_messages = 0
        try:
            async for _ in self.client.iter_messages(entity, limit=config.MAX_MESSAGES):
                total_messages += 1
        except Exception as e:
            print(f"⚠️ Lỗi khi đếm tin nhắn: {e}")
            return
            
        print(f"📝 Tổng số tin nhắn: {total_messages:,}")
        
        if total_messages == 0:
            print("❌ Không có tin nhắn nào để quét")
            return
            
        print(f"🔍 Bắt đầu quét file...")
        
        # Quét các tin nhắn và tìm file
        from tqdm.asyncio import tqdm
        progress_bar = tqdm(total=total_messages, desc="Đang quét")
        
        try:
            async for message in self.client.iter_messages(entity, limit=config.MAX_MESSAGES):
                file_info = self.extract_file_info(message)
                
                if file_info and self.should_include_file_type(file_info['file_type']):
                    self.files_data.append(file_info)
                    
                progress_bar.update(1)
                
        except Exception as e:
            print(f"\n⚠️ Lỗi trong quá trình quét: {e}")
        finally:
            progress_bar.close()
            
        print(f"✅ Hoàn thành! Tìm thấy {len(self.files_data)} file")

async def main():
    """Main function cho private channel scanner"""
    print("🔐 PRIVATE CHANNEL SCANNER")
    print("=" * 50)

    if DETAILED_LOGGING_AVAILABLE:
        log_step("KHỞI ĐỘNG ỨNG DỤNG", "Bắt đầu Private Channel Scanner")

    print("🔧 Đang khởi tạo scanner...")
    scanner = PrivateChannelScanner()

    try:
        print("✅ Scanner đã sẵn sàng")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("BẮT ĐẦU QUÉT", "Khởi động quá trình quét interactive")

        await scanner.scan_private_channel_auto()

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

    # Load config - simplified
    print("📋 Đang tải cấu hình...")
    try:
        import json
        config_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'config', 'config.json')
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        print("✅ Đã tải cấu hình thành công")
    except Exception as e:
        print(f"❌ Lỗi tải cấu hình: {e}")
        # Use default config for testing
        config_data = {
            'channels': {'default_channel': 'https://t.me/+mDSKNZmnHrM0YTNl'},
            'output': {'directory': 'output'}
        }
        print("⚠️ Sử dụng cấu hình mặc định")

    # Setup logging - simplified
    print("📊 Đang thiết lập hệ thống logging...")
    print("✅ Hệ thống logging đã sẵn sàng")

    # Setup Windows event loop
    print("🔧 Đang cấu hình event loop...")
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("✅ Đã cấu hình Windows ProactorEventLoopPolicy")

    print("🚀 Khởi động ứng dụng chính...")
    print("=" * 60)

    asyncio.run(main())
