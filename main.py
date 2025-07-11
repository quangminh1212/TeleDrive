#!/usr/bin/env python3
"""
Private Channel Scanner với logging chi tiết
Chuyên dụng cho việc quét file trong private channel/group Telegram
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

class PrivateChannelScanner(TelegramFileScanner):
    """Scanner chuyên dụng cho private channel"""
    
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
    
    async def scan_private_channel_interactive(self):
        """Quét private channel với giao diện tương tác"""
        print("🔐 PRIVATE CHANNEL SCANNER")
        print("=" * 50)
        
        await self.initialize()
        
        print("\n📋 Chọn cách truy cập private channel:")
        print("1. Tôi đã là thành viên (nhập username hoặc link)")
        print("2. Join từ invite link")
        
        choice = input("\n👉 Lựa chọn (1/2): ").strip()
        
        if choice == "2":
            invite_link = input("👉 Nhập invite link (https://t.me/joinchat/xxx hoặc https://t.me/+xxx): ").strip()
            if not invite_link:
                print("❌ Link không hợp lệ!")
                return
                
            success = await self.join_private_channel(invite_link)
            if not success:
                return
                
            # Sau khi join, lấy entity
            entity = await self.get_channel_entity(invite_link)
            
        else:
            channel_input = input("👉 Nhập username hoặc link channel: ").strip()
            if not channel_input:
                print("❌ Vui lòng nhập thông tin channel!")
                return
                
            entity = await self.get_channel_entity(channel_input)
        
        if not entity:
            return
            
        # Kiểm tra quyền truy cập chi tiết
        await self.check_channel_permissions(entity)
        
        # Quét channel
        await self.scan_channel_by_entity(entity)
        
        if self.files_data:
            await self.save_results()
            print(f"\n🎉 Hoàn thành! Đã tìm thấy {len(self.files_data)} file")
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
    if DETAILED_LOGGING_AVAILABLE:
        log_step("KHỞI ĐỘNG ỨNG DỤNG", "Bắt đầu Private Channel Scanner")

    scanner = PrivateChannelScanner()

    try:
        if DETAILED_LOGGING_AVAILABLE:
            log_step("BẮT ĐẦU QUÉT", "Khởi động quá trình quét interactive")

        await scanner.scan_private_channel_interactive()

        if DETAILED_LOGGING_AVAILABLE:
            log_step("HOÀN THÀNH", "Quá trình quét đã hoàn thành thành công")

    except KeyboardInterrupt:
        print("\n⏹️ Đã dừng bởi người dùng")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("DỪNG BỞI NGƯỜI DÙNG", "Ứng dụng bị dừng bởi Ctrl+C", "WARNING")

    except Exception as e:
        print(f"LOI: {e}")
        if DETAILED_LOGGING_AVAILABLE:
            log_error(e, "Main application error")

        if "CHUA CAU HINH PHONE_NUMBER" in str(e):
            print()
            print("HUONG DAN CAU HINH SO DIEN THOAI:")
            print("1. Mo file config.json")
            print("2. Thay '+84xxxxxxxxx' bang so dien thoai that")
            print("3. Vi du: +84987654321")
            print("4. Phai co ma quoc gia (+84 cho Viet Nam)")
        else:
            import traceback
            traceback.print_exc()
    finally:
        if DETAILED_LOGGING_AVAILABLE:
            log_step("ĐÓNG ỨNG DỤNG", "Đang đóng kết nối và dọn dẹp")
        await scanner.close()

if __name__ == "__main__":
    import config

    # Setup detailed logging nếu có
    if DETAILED_LOGGING_AVAILABLE:
        try:
            from logger import setup_detailed_logging
            logging_config = config.CONFIG.get('logging', {})
            if logging_config.get('enabled', True):
                setup_detailed_logging(logging_config)
                log_step("KHỞI TẠO HỆ THỐNG", "Đã thiết lập logging chi tiết")
        except Exception as e:
            print(f"Warning: Không thể setup detailed logging: {e}")

    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

    asyncio.run(main())
