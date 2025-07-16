#!/usr/bin/env python3
"""
Main Scanner - Quét file trong kênh Telegram với logging chi tiết
Hỗ trợ cả public và private channel
"""

import asyncio
import json
import pandas as pd
from datetime import datetime
from typing import Dict, Optional
from pathlib import Path

from telethon import TelegramClient
from telethon.tl.types import (
    MessageMediaDocument, MessageMediaPhoto,
    DocumentAttributeFilename, DocumentAttributeVideo,
    DocumentAttributeAudio, DocumentAttributeSticker,
    DocumentAttributeAnimated
)
from tqdm.asyncio import tqdm
import aiofiles

import config

# Import detailed logging
try:
    from logger import log_step, log_api_call, log_file_operation, log_progress, log_error, get_logger
    DETAILED_LOGGING_AVAILABLE = True
    logger = get_logger('engine')
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)

class TelegramFileScanner:
    def __init__(self):
        self.client = None
        self.files_data = []
        self.output_dir = Path(config.OUTPUT_DIR)
        self.output_dir.mkdir(exist_ok=True)
        
    async def initialize(self):
        """Khởi tạo Telegram client"""
        if DETAILED_LOGGING_AVAILABLE:
            log_step("KHỞI TẠO CLIENT", "Bắt đầu khởi tạo Telegram client")

        # Kiểm tra số điện thoại
        if not config.PHONE_NUMBER or config.PHONE_NUMBER == '+84xxxxxxxxx':
            error_msg = "CHUA CAU HINH PHONE_NUMBER trong config"
            if DETAILED_LOGGING_AVAILABLE:
                log_step("VALIDATION ERROR", error_msg, "ERROR")
            raise ValueError(error_msg)

        try:
            if DETAILED_LOGGING_AVAILABLE:
                log_step("TẠO CLIENT", f"API_ID: {config.API_ID}, Session: {config.SESSION_NAME}")

            self.client = TelegramClient(
                config.SESSION_NAME,
                int(config.API_ID),
                config.API_HASH
            )

            if DETAILED_LOGGING_AVAILABLE:
                log_step("ĐĂNG NHẬP", f"Đăng nhập với số: {config.PHONE_NUMBER}")
                log_api_call("client.start", {"phone": config.PHONE_NUMBER})

            await self.client.start(phone=config.PHONE_NUMBER)

            print("Da ket noi thanh cong voi Telegram!")
            if DETAILED_LOGGING_AVAILABLE:
                log_step("KHỞI TẠO THÀNH CÔNG", "Đã kết nối thành công với Telegram")

        except ValueError as e:
            if "invalid literal for int()" in str(e):
                error_msg = "API_ID phai la so nguyen, khong phai text"
                if DETAILED_LOGGING_AVAILABLE:
                    log_error(e, "API_ID validation")
                raise ValueError(error_msg)
            if DETAILED_LOGGING_AVAILABLE:
                log_error(e, "Client initialization")
            raise e
        except Exception as e:
            if DETAILED_LOGGING_AVAILABLE:
                log_error(e, "Client initialization - unexpected error")
            raise e
        
    async def get_channel_entity(self, channel_input: str):
        """Lấy entity của kênh từ username hoặc invite link"""
        try:
            # Xử lý invite link cho private channel
            if 'joinchat' in channel_input or '+' in channel_input:
                print("🔐 Phát hiện private channel invite link")
                entity = await self.client.get_entity(channel_input)
                return entity

            # Xử lý username hoặc public link
            if channel_input.startswith('https://t.me/'):
                channel_input = channel_input.replace('https://t.me/', '')
                # Xử lý private channel link với +
                if channel_input.startswith('+'):
                    entity = await self.client.get_entity(channel_input)
                    return entity

            if channel_input.startswith('@'):
                channel_input = channel_input[1:]

            entity = await self.client.get_entity(channel_input)

            # Kiểm tra quyền truy cập
            try:
                # Thử lấy thông tin cơ bản để kiểm tra quyền
                await self.client.get_messages(entity, limit=1)
                print(f"✅ Có quyền truy cập kênh: {getattr(entity, 'title', 'Unknown')}")
            except Exception as access_error:
                print(f"⚠️ Cảnh báo quyền truy cập: {access_error}")
                print("💡 Đảm bảo bạn là thành viên của kênh private này")

            return entity

        except Exception as e:
            print(f"❌ Không thể truy cập kênh '{channel_input}': {e}")
            print("💡 Gợi ý:")
            print("   - Đối với public channel: @channelname hoặc https://t.me/channelname")
            print("   - Đối với private channel: https://t.me/joinchat/xxxxx hoặc https://t.me/+xxxxx")
            print("   - Đảm bảo bạn đã join kênh private trước")
            return None
            
    def extract_file_info(self, message) -> Optional[Dict]:
        """Trích xuất thông tin file từ message"""
        if not message.media:
            return None
            
        file_info = {
            'message_id': message.id,
            'date': message.date.isoformat(),
            'file_type': None,
            'file_name': None,
            'file_size': None,
            'mime_type': None,
            'duration': None,
            'width': None,
            'height': None,
            'download_link': None,
            'message_text': message.text or '',
            'sender_id': getattr(message.sender, 'id', None) if message.sender else None
        }
        
        # Xử lý Document (files, videos, audio, etc.)
        if isinstance(message.media, MessageMediaDocument):
            doc = message.media.document
            file_info['file_size'] = doc.size
            file_info['mime_type'] = doc.mime_type
            
            # Lấy tên file và các thuộc tính
            for attr in doc.attributes:
                if isinstance(attr, DocumentAttributeFilename):
                    file_info['file_name'] = attr.file_name
                    file_info['file_type'] = 'document'
                elif isinstance(attr, DocumentAttributeVideo):
                    file_info['file_type'] = 'video'
                    file_info['duration'] = attr.duration
                    file_info['width'] = attr.w
                    file_info['height'] = attr.h
                elif isinstance(attr, DocumentAttributeAudio):
                    file_info['file_type'] = 'audio'
                    file_info['duration'] = attr.duration
                    if attr.voice:
                        file_info['file_type'] = 'voice'
                elif isinstance(attr, DocumentAttributeSticker):
                    file_info['file_type'] = 'sticker'
                elif isinstance(attr, DocumentAttributeAnimated):
                    file_info['file_type'] = 'animation'
                    
            # Nếu không có tên file, tạo tên mặc định
            if not file_info['file_name']:
                ext = self.get_extension_from_mime(file_info['mime_type'])
                file_info['file_name'] = f"file_{message.id}{ext}"
                
        # Xử lý Photo
        elif isinstance(message.media, MessageMediaPhoto):
            photo = message.media.photo
            file_info['file_type'] = 'photo'
            file_info['file_name'] = f"photo_{message.id}.jpg"
            if photo.sizes:
                largest_size = max(photo.sizes, key=lambda x: getattr(x, 'size', 0))
                file_info['file_size'] = getattr(largest_size, 'size', None)
                file_info['width'] = getattr(largest_size, 'w', None)
                file_info['height'] = getattr(largest_size, 'h', None)
                
        # Tạo download link nếu được yêu cầu
        if config.GENERATE_DOWNLOAD_LINKS and file_info['file_type']:
            # Tạo link download phù hợp cho cả public và private channel
            if hasattr(message.chat, 'username') and message.chat.username:
                # Public channel
                file_info['download_link'] = f"https://t.me/{message.chat.username}/{message.id}"
            else:
                # Private channel hoặc group - sử dụng chat_id
                chat_id = message.chat.id
                if str(chat_id).startswith('-100'):
                    # Supergroup/Channel
                    clean_id = str(chat_id)[4:]  # Remove -100 prefix
                    file_info['download_link'] = f"https://t.me/c/{clean_id}/{message.id}"
                else:
                    # Fallback
                    file_info['download_link'] = f"tg://openmessage?chat_id={chat_id}&message_id={message.id}"
            
        return file_info if file_info['file_type'] else None

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

    def get_extension_from_mime(self, mime_type: str) -> str:
        """Lấy extension từ MIME type"""
        mime_map = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'video/mp4': '.mp4',
            'video/avi': '.avi',
            'audio/mpeg': '.mp3',
            'audio/ogg': '.ogg',
            'application/pdf': '.pdf',
            'application/zip': '.zip',
            'text/plain': '.txt'
        }
        return mime_map.get(mime_type, '')
        
    def should_include_file_type(self, file_type: str) -> bool:
        """Kiểm tra có nên include file type này không"""
        type_config = {
            'document': config.SCAN_DOCUMENTS,
            'photo': config.SCAN_PHOTOS,
            'video': config.SCAN_VIDEOS,
            'audio': config.SCAN_AUDIO,
            'voice': config.SCAN_VOICE,
            'sticker': config.SCAN_STICKERS,
            'animation': config.SCAN_ANIMATIONS
        }
        return type_config.get(file_type, True)
        
    async def scan_channel(self, channel_input: str):
        """Quét tất cả file trong kênh"""
        if DETAILED_LOGGING_AVAILABLE:
            log_step("BẮT ĐẦU QUÉT", f"Kênh: {channel_input}")

        entity = await self.get_channel_entity(channel_input)
        if not entity:
            if DETAILED_LOGGING_AVAILABLE:
                log_step("LỖI ENTITY", "Không thể lấy thông tin kênh", "ERROR")
            return

        print(f"📡 Bắt đầu quét kênh: {entity.title}")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("THÔNG TIN KÊNH", f"Tên: {entity.title}, ID: {entity.id}")

        print(f"📊 Đang đếm tổng số tin nhắn...")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("ĐẾM TIN NHẮN", "Bắt đầu đếm tổng số tin nhắn")

        # Đếm tổng số tin nhắn
        total_messages = 0
        async for _ in self.client.iter_messages(entity, limit=config.MAX_MESSAGES):
            total_messages += 1

        print(f"📝 Tổng số tin nhắn: {total_messages:,}")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("TỔNG TIN NHẮN", f"Tìm thấy {total_messages:,} tin nhắn")
            log_api_call("iter_messages", {"entity": entity.title, "limit": config.MAX_MESSAGES}, f"{total_messages} messages")

        print(f"🔍 Bắt đầu quét file...")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("BẮT ĐẦU QUÉT FILE", f"Quét {total_messages:,} tin nhắn để tìm file")

        # Quét các tin nhắn và tìm file
        progress_bar = tqdm(total=total_messages, desc="Đang quét")
        processed_count = 0

        async for message in self.client.iter_messages(entity, limit=config.MAX_MESSAGES):
            file_info = self.extract_file_info(message)

            if file_info and self.should_include_file_type(file_info['file_type']):
                self.files_data.append(file_info)
                if DETAILED_LOGGING_AVAILABLE and len(self.files_data) % 10 == 0:
                    log_progress(len(self.files_data), total_messages, "files found")

            processed_count += 1
            progress_bar.update(1)

        progress_bar.close()

        print(f"✅ Hoàn thành! Tìm thấy {len(self.files_data)} file")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("HOÀN THÀNH QUÉT", f"Đã quét {processed_count:,} tin nhắn, tìm thấy {len(self.files_data)} file")
        
    async def save_results(self):
        """Lưu kết quả ra các file"""
        if DETAILED_LOGGING_AVAILABLE:
            log_step("BẮT ĐẦU LƯU KẾT QUẢ", f"Có {len(self.files_data)} file để lưu")

        if not self.files_data:
            print("⚠️ Không có dữ liệu để lưu")
            if DETAILED_LOGGING_AVAILABLE:
                log_step("KHÔNG CÓ DỮ LIỆU", "Không có file nào để lưu", "WARNING")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("CHUẨN BỊ LƯU", f"Timestamp: {timestamp}")

        # Lưu CSV
        csv_path = self.output_dir / f"{timestamp}_{config.CSV_FILENAME}"
        df = pd.DataFrame(self.files_data)
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        print(f"💾 Đã lưu CSV: {csv_path}")
        if DETAILED_LOGGING_AVAILABLE:
            log_file_operation("SAVE", str(csv_path), f"CSV với {len(self.files_data)} records")

        # Lưu Excel
        excel_path = self.output_dir / f"{timestamp}_{config.EXCEL_FILENAME}"
        df.to_excel(excel_path, index=False, engine='openpyxl')
        print(f"💾 Đã lưu Excel: {excel_path}")
        if DETAILED_LOGGING_AVAILABLE:
            log_file_operation("SAVE", str(excel_path), f"Excel với {len(self.files_data)} records")

        # Tạo JSON với format tối ưu cho file và link
        json_data = {
            "scan_info": {
                "timestamp": timestamp,
                "total_files": len(self.files_data),
                "scan_date": datetime.now().isoformat()
            },
            "files": []
        }

        # Format lại data cho JSON với focus vào tên file và link
        for file_data in self.files_data:
            json_file = {
                "file_name": file_data['file_name'],
                "download_link": file_data['download_link'],
                "file_info": {
                    "type": file_data['file_type'],
                    "size": file_data['file_size'],
                    "size_formatted": self.format_size(file_data['file_size']) if file_data['file_size'] else "N/A",
                    "mime_type": file_data['mime_type'],
                    "upload_date": file_data['date']
                },
                "message_info": {
                    "message_id": file_data['message_id'],
                    "message_text": file_data['message_text'],
                    "sender_id": file_data['sender_id']
                }
            }

            # Thêm thông tin media nếu có
            if file_data['duration']:
                json_file['file_info']['duration'] = file_data['duration']
            if file_data['width'] and file_data['height']:
                json_file['file_info']['dimensions'] = {
                    "width": file_data['width'],
                    "height": file_data['height']
                }

            json_data["files"].append(json_file)

        # Lưu JSON
        json_path = self.output_dir / f"{timestamp}_{config.JSON_FILENAME}"
        async with aiofiles.open(json_path, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(json_data, ensure_ascii=False, indent=2))
        print(f"💾 Đã lưu JSON: {json_path}")
        if DETAILED_LOGGING_AVAILABLE:
            log_file_operation("SAVE", str(json_path), f"JSON chi tiết với {len(self.files_data)} files")

        # Lưu JSON đơn giản chỉ tên file và link
        simple_json_data = [
            {
                "file_name": file_data['file_name'],
                "download_link": file_data['download_link'],
                "file_size": self.format_size(file_data['file_size']) if file_data['file_size'] else "N/A",
                "file_type": file_data['file_type']
            }
            for file_data in self.files_data
        ]

        simple_json_path = self.output_dir / f"{timestamp}_simple_files.json"
        async with aiofiles.open(simple_json_path, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(simple_json_data, ensure_ascii=False, indent=2))
        print(f"💾 Đã lưu JSON đơn giản: {simple_json_path}")
        if DETAILED_LOGGING_AVAILABLE:
            log_file_operation("SAVE", str(simple_json_path), f"JSON đơn giản với {len(self.files_data)} files")

        # Thống kê
        self.print_statistics()

        if DETAILED_LOGGING_AVAILABLE:
            log_step("HOÀN THÀNH LƯU KẾT QUẢ", f"Đã lưu thành công {len(self.files_data)} files vào 4 định dạng")
        
    def print_statistics(self):
        """In thống kê"""
        if not self.files_data:
            return
            
        df = pd.DataFrame(self.files_data)
        
        print("\n📊 THỐNG KÊ:")
        print(f"Tổng số file: {len(self.files_data):,}")
        
        # Thống kê theo loại file
        type_counts = df['file_type'].value_counts()
        print("\nPhân loại theo type:")
        for file_type, count in type_counts.items():
            print(f"  {file_type}: {count:,}")
            
        # Thống kê kích thước
        total_size = df['file_size'].sum()
        if total_size > 0:
            print(f"\nTổng kích thước: {self.format_size(total_size)}")
            print(f"Kích thước trung bình: {self.format_size(df['file_size'].mean())}")
            
    def format_size(self, size_bytes: float) -> str:
        """Format kích thước file"""
        if pd.isna(size_bytes):
            return "N/A"
            
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"
        
    async def close(self):
        """Đóng kết nối"""
        if self.client:
            await self.client.disconnect()

async def main():
    scanner = TelegramFileScanner()
    
    try:
        await scanner.initialize()
        
        # Nhập thông tin kênh
        channel_input = input("Nhập username kênh (ví dụ: @channelname) hoặc link: ").strip()
        if not channel_input:
            print("❌ Vui lòng nhập username hoặc link kênh")
            return
            
        await scanner.scan_channel(channel_input)
        await scanner.save_results()
        
    except KeyboardInterrupt:
        print("\n⏹️ Đã dừng bởi người dùng")
    except Exception as e:
        print(f"❌ Lỗi: {e}")
    finally:
        await scanner.close()

if __name__ == "__main__":
    asyncio.run(main())
