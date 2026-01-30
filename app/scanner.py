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
    from log import (log_step, log_api_call, log_file_operation, log_progress, log_error,
                       log_performance_metric, log_database_operation, log_step_start, log_step_end,
                       log_detailed_error, log_function_calls, log_step_execution, get_logger)
    DETAILED_LOGGING_AVAILABLE = True
    logger = get_logger('engine')
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)

class TelegramFileScanner:
    def __init__(self, offline_mode=False):
        self.client = None
        self.files_data = []
        self.output_dir = Path(config.OUTPUT_DIR)
        self.output_dir.mkdir(exist_ok=True)
        self.offline_mode = offline_mode

    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit with proper cleanup"""
        await self.close()
        return False
        
    async def initialize(self):
        """Khởi tạo Telegram client với retry mechanism và session handling"""
        if DETAILED_LOGGING_AVAILABLE:
            log_step("KHỞI TẠO CLIENT", "Bắt đầu khởi tạo Telegram client")

        if self.offline_mode:
            print("🔌 Running in OFFLINE MODE - Telegram features disabled")
            print("📁 Testing file management features only")
            if DETAILED_LOGGING_AVAILABLE:
                log_step("OFFLINE MODE", "Chạy ở chế độ offline", "WARNING")
            return

        if DETAILED_LOGGING_AVAILABLE:
            log_step("KHỞI TẠO CLIENT", "Bắt đầu khởi tạo Telegram client")

        # Kiểm tra số điện thoại
        if not config.PHONE_NUMBER or config.PHONE_NUMBER == '+84xxxxxxxxx':
            error_msg = "CHUA CAU HINH PHONE_NUMBER trong config"
            if DETAILED_LOGGING_AVAILABLE:
                log_step("VALIDATION ERROR", error_msg, "ERROR")
            raise ValueError(error_msg)

        # Kiểm tra session file tồn tại - copy sang temp để tránh lock
        import shutil
        import tempfile
        import time
        import sqlite3
        
        project_root = Path(__file__).parent.parent
        session_import = project_root / "data" / "session_import.session"
        session_main = project_root / "data" / "session.session"
        
        # Tạo thư mục temp cho scanner
        scanner_temp_dir = project_root / "data" / "scanner_temp"
        scanner_temp_dir.mkdir(exist_ok=True)
        scanner_session = scanner_temp_dir / f"scan_{int(time.time())}.session"
        
        # Copy session file sang temp folder để tránh lock
        source_session = None
        if session_import.exists():
            source_session = session_import
            print(f"✅ Found session_import")
        elif session_main.exists():
            source_session = session_main
            print(f"⚠️ Using main session")
        
        if source_session:
            # Dùng sqlite3 backup API để tránh lock
            max_retries = 3
            copy_success = False
            for attempt in range(max_retries):
                try:
                    # Kết nối read-only đến source và backup sang dest
                    src_conn = sqlite3.connect(f"file:{source_session}?mode=ro", uri=True)
                    dst_conn = sqlite3.connect(str(scanner_session))
                    with dst_conn:
                        src_conn.backup(dst_conn)
                    dst_conn.close()
                    src_conn.close()
                    
                    print(f"✅ Copied session to {scanner_session} (sqlite3 backup)")
                    copy_success = True
                    break
                except Exception as e:
                    print(f"⚠️ Copy attempt {attempt + 1}/{max_retries} failed: {e}")
                    if attempt < max_retries - 1:
                        print(f"⏳ Chờ 2 giây trước khi thử lại...")
                        time.sleep(2)
            
            if not copy_success:
                print(f"❌ Failed to copy session after {max_retries} attempts.")
                print(f"⚠️ Using ORIGINAL session file directly as fallback (Risk: Database Locked)")
                scanner_session = source_session
                
        else:
            raise ValueError("No valid session file found")
        
        session_name = str(scanner_session).replace('.session', '')
        session_path = scanner_session
        session_exists = session_path.exists()

        if DETAILED_LOGGING_AVAILABLE:
            log_step("SESSION CHECK", f"Session file exists: {session_exists} at {session_path}")

        try:
            if DETAILED_LOGGING_AVAILABLE:
                log_step("TẠO CLIENT", f"API_ID: {config.API_ID}, Session: {session_name}")

            self.client = TelegramClient(
                session_name,
                int(config.API_ID),
                config.API_HASH,
                connection_retries=3,
                retry_delay=5,
                timeout=60,
                flood_sleep_threshold=60
            )

            # Thử kết nối với retry mechanism và timeout
            max_retries = 3
            retry_delay = 5
            connection_timeout = 90  # 90 giây timeout cho toàn bộ quá trình

            for attempt in range(max_retries):
                try:
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("ĐĂNG NHẬP", f"Lần thử {attempt + 1}/{max_retries} - Số: {config.PHONE_NUMBER}")
                        log_api_call("client.start", {"phone": config.PHONE_NUMBER, "attempt": attempt + 1})

                    # Wrap connection attempt with timeout
                    async def connect_with_timeout():
                        # Thử kết nối với session có sẵn (chỉ connect, không start)
                        if session_exists:
                            try:
                                if DETAILED_LOGGING_AVAILABLE:
                                    log_step("SỬ DỤNG SESSION", "Thử kết nối với session có sẵn")
                                # Chỉ connect, không start (start sẽ yêu cầu đăng nhập mới)
                                await self.client.connect()
                                
                                # Kiểm tra xem đã authorized chưa
                                if await self.client.is_user_authorized():
                                    print("✅ Kết nối thành công với session có sẵn!")
                                    if DETAILED_LOGGING_AVAILABLE:
                                        log_step("SESSION SUCCESS", "Kết nối thành công với session có sẵn", "SUCCESS")
                                    return True
                                else:
                                    print("⚠️ Session tồn tại nhưng không authorized")
                                    raise ValueError("Session not authorized - cần đăng nhập lại qua Telegram Desktop")
                            except Exception as session_error:
                                print(f"⚠️ Session không hợp lệ: {session_error}")
                                if DETAILED_LOGGING_AVAILABLE:
                                    log_step("SESSION INVALID", f"Session không hợp lệ: {session_error}", "WARNING")
                                raise ValueError(f"Session không hợp lệ: {session_error}")
                        else:
                            raise ValueError("Không tìm thấy session file - cần đăng nhập qua Telegram Desktop")

                    # Apply timeout to connection attempt
                    await asyncio.wait_for(connect_with_timeout(), timeout=connection_timeout)

                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("KHỞI TẠO THÀNH CÔNG", "Đã kết nối thành công với Telegram")
                    
                    # Test connection
                    me = await self.client.get_me()
                    print(f"👤 Đăng nhập với: {me.first_name} (@{me.username})")
                    return

                except asyncio.TimeoutError:
                    error_msg = f"Connection timeout after {connection_timeout} seconds"
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("TIMEOUT ERROR", error_msg, "ERROR")

                    if attempt < max_retries - 1:
                        print(f"⏳ Timeout (lần {attempt + 1}): {error_msg}")
                        print(f"⏳ Chờ {retry_delay} giây trước khi thử lại...")
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                    else:
                        print(f"❌ Connection timeout sau {max_retries} lần thử")
                        raise ConnectionError(f"Failed to connect to Telegram after {max_retries} attempts: {error_msg}")

                except Exception as e:
                    error_msg = str(e)

                    # Xử lý FloodWaitError
                    if "FloodWaitError" in error_msg:
                        wait_time = 0
                        try:
                            # Extract wait time from error message
                            import re
                            match = re.search(r'(\d+) seconds', error_msg)
                            if match:
                                wait_time = int(match.group(1))
                        except:
                            wait_time = 60  # Default wait time

                        if DETAILED_LOGGING_AVAILABLE:
                            log_error(e, f"FloodWaitError - Wait {wait_time} seconds")

                        if attempt < max_retries - 1:
                            print(f"⏳ FloodWaitError: Chờ {wait_time} giây trước khi thử lại...")
                            await asyncio.sleep(min(wait_time, 300))  # Max wait 5 minutes
                            continue
                        else:
                            print(f"❌ FloodWaitError sau {max_retries} lần thử")
                            print("💡 Gợi ý: Chờ {wait_time} giây hoặc sử dụng offline mode")
                            raise ConnectionError(f"Rate limited by Telegram: wait {wait_time} seconds")

                    # Xử lý connection errors
                    if any(keyword in error_msg.lower() for keyword in ['connection', 'network', 'timeout', 'unreachable']):
                        if DETAILED_LOGGING_AVAILABLE:
                            log_error(e, f"Network error attempt {attempt + 1}")

                        if attempt < max_retries - 1:
                            print(f"⚠️ Lỗi mạng (lần {attempt + 1}): {error_msg}")
                            print(f"⏳ Chờ {retry_delay} giây trước khi thử lại...")
                            await asyncio.sleep(retry_delay)
                            retry_delay *= 2  # Exponential backoff
                            continue
                        else:
                            print(f"❌ Không thể kết nối sau {max_retries} lần thử")
                            raise ConnectionError(f"Network connection failed after {max_retries} attempts: {error_msg}")

                    # Xử lý các lỗi khác
                    if DETAILED_LOGGING_AVAILABLE:
                        log_error(e, f"Client initialization attempt {attempt + 1}")

                    if attempt < max_retries - 1:
                        print(f"⚠️ Lỗi kết nối (lần {attempt + 1}): {error_msg}")
                        print(f"⏳ Chờ {retry_delay} giây trước khi thử lại...")
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                    else:
                        print(f"❌ Không thể kết nối sau {max_retries} lần thử")
                        raise ConnectionError(f"Failed to initialize Telegram client: {error_msg}")

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
        if DETAILED_LOGGING_AVAILABLE:
            log_step("RESOLVE CHANNEL", f"Đang phân giải channel: {channel_input}")

        try:
            # Xử lý đặc biệt cho 'me' (Saved Messages)
            if channel_input.lower() == 'me':
                print("📨 Đang truy cập Saved Messages của bạn...")
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("SAVED MESSAGES", "Đang truy cập Saved Messages")
                # Lấy entity của chính user hiện tại
                me = await self.client.get_me()
                print(f"✅ Truy cập Saved Messages của: {me.first_name}")
                return me
            # Xử lý invite link cho private channel
            if 'joinchat' in channel_input or '+' in channel_input:
                print("🔐 Phát hiện private channel invite link")
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("PRIVATE CHANNEL", "Phát hiện private channel invite link")
                    log_api_call("get_entity", {"type": "private_invite", "input": channel_input})
                entity = await self.client.get_entity(channel_input)
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("ENTITY RESOLVED", f"Private channel: {getattr(entity, 'title', 'Unknown')}", "SUCCESS")
                return entity

            # Xử lý username hoặc public link
            if channel_input.startswith('https://t.me/'):
                original_input = channel_input
                channel_input = channel_input.replace('https://t.me/', '')
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("URL PROCESSING", f"Chuyển đổi URL: {original_input} -> {channel_input}")
                # Xử lý private channel link với +
                if channel_input.startswith('+'):
                    if DETAILED_LOGGING_AVAILABLE:
                        log_api_call("get_entity", {"type": "private_plus", "input": channel_input})
                    entity = await self.client.get_entity(channel_input)
                    return entity

            if channel_input.startswith('@'):
                channel_input = channel_input[1:]
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("USERNAME PROCESSING", f"Loại bỏ @ từ username: @{channel_input}")

            if DETAILED_LOGGING_AVAILABLE:
                log_api_call("get_entity", {"type": "public", "input": channel_input})
            entity = await self.client.get_entity(channel_input)

            # Kiểm tra quyền truy cập
            try:
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("ACCESS CHECK", "Kiểm tra quyền truy cập channel")
                # Thử lấy thông tin cơ bản để kiểm tra quyền
                await self.client.get_messages(entity, limit=1)
                print(f"✅ Có quyền truy cập kênh: {getattr(entity, 'title', 'Unknown')}")
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("ACCESS SUCCESS", f"Có quyền truy cập: {getattr(entity, 'title', 'Unknown')}", "SUCCESS")
            except Exception as access_error:
                print(f"⚠️ Cảnh báo quyền truy cập: {access_error}")
                print("💡 Đảm bảo bạn là thành viên của kênh private này")
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("ACCESS WARNING", f"Cảnh báo quyền truy cập: {access_error}", "WARNING")

            return entity

        except Exception as e:
            print(f"❌ Không thể truy cập kênh '{channel_input}': {e}")
            print("💡 Gợi ý:")
            print("   - Đối với public channel: @channelname hoặc https://t.me/channelname")
            print("   - Đối với private channel: https://t.me/joinchat/xxxxx hoặc https://t.me/+xxxxx")
            print("   - Đảm bảo bạn đã join kênh private trước")
            if DETAILED_LOGGING_AVAILABLE:
                log_error(e, f"Channel resolution failed for: {channel_input}")
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
        scan_step_id = None
        if DETAILED_LOGGING_AVAILABLE:
            scan_step_id = log_step_start("SCAN_CHANNEL", f"Scanning channel: {channel_input}")
            log_step("BẮT ĐẦU QUÉT", f"Kênh: {channel_input}")

        try:
            # Step 1: Get channel entity
            entity_step_id = None
            if DETAILED_LOGGING_AVAILABLE:
                entity_step_id = log_step_start("GET_CHANNEL_ENTITY", f"Resolving channel: {channel_input}")

            entity = await self.get_channel_entity(channel_input)

            if DETAILED_LOGGING_AVAILABLE:
                log_step_end(entity_step_id, "GET_CHANNEL_ENTITY", success=True,
                           result=f"Resolved to: {entity.title if hasattr(entity, 'title') else 'Unknown'}")
            if not entity:
                if DETAILED_LOGGING_AVAILABLE:
                    log_step_end(entity_step_id, "GET_CHANNEL_ENTITY", success=False, error="Không thể lấy thông tin kênh")
                    log_step_end(scan_step_id, "SCAN_CHANNEL", success=False, error="Entity resolution failed")
                    log_step("LỖI ENTITY", "Không thể lấy thông tin kênh", "ERROR")
                return

            print(f"📡 Bắt đầu quét kênh: {entity.title}")
            if DETAILED_LOGGING_AVAILABLE:
                log_step("THÔNG TIN KÊNH", f"Tên: {entity.title}, ID: {entity.id}")

            # Step 2: Count total messages
            count_step_id = None
            if DETAILED_LOGGING_AVAILABLE:
                count_step_id = log_step_start("COUNT_MESSAGES", f"Counting messages in {entity.title}")

            print(f"📊 Đang đếm tổng số tin nhắn...")
            if DETAILED_LOGGING_AVAILABLE:
                log_step("ĐẾM TIN NHẮN", "Bắt đầu đếm tổng số tin nhắn")

            # Đếm tổng số tin nhắn
            total_messages = 0
            async for _ in self.client.iter_messages(entity, limit=config.MAX_MESSAGES):
                total_messages += 1

            print(f"📝 Tổng số tin nhắn: {total_messages:,}")
            if DETAILED_LOGGING_AVAILABLE:
                log_step_end(count_step_id, "COUNT_MESSAGES", success=True, result=f"{total_messages:,} messages")
                log_step("TỔNG TIN NHẮN", f"Tìm thấy {total_messages:,} tin nhắn")
                log_api_call("iter_messages", {"entity": entity.title, "limit": config.MAX_MESSAGES}, f"{total_messages} messages")

            # Step 3: Start file scanning
            scan_files_step_id = None
            if DETAILED_LOGGING_AVAILABLE:
                scan_files_step_id = log_step_start("SCAN_FILES", f"Scanning {total_messages:,} messages for files")

            print(f"🔍 Bắt đầu quét file...")
            if DETAILED_LOGGING_AVAILABLE:
                log_step("BẮT ĐẦU QUÉT FILE", f"Quét {total_messages:,} tin nhắn để tìm file")

            # Quét các tin nhắn và tìm file
            progress_bar = tqdm(total=total_messages, desc="Đang quét")
            processed_count = 0
            files_found = 0
            files_filtered = 0
            start_time = datetime.now()

            async for message in self.client.iter_messages(entity, limit=config.MAX_MESSAGES):
                try:
                    file_info = self.extract_file_info(message)

                    if file_info:
                        if self.should_include_file_type(file_info['file_type']):
                            self.files_data.append(file_info)
                            files_found += 1

                            if DETAILED_LOGGING_AVAILABLE and files_found % 50 == 0:
                                log_step("FILE PROGRESS", f"Đã tìm thấy {files_found} file phù hợp từ {processed_count} tin nhắn")
                                log_performance_metric("files_per_message", files_found/processed_count, "ratio", f"Channel: {entity.title}")
                        else:
                            files_filtered += 1
                            if DETAILED_LOGGING_AVAILABLE and files_filtered % 100 == 0:
                                log_step("FILTER INFO", f"Đã lọc bỏ {files_filtered} file không phù hợp")

                    processed_count += 1
                    progress_bar.update(1)

                    # Log performance every 1000 messages
                    if DETAILED_LOGGING_AVAILABLE and processed_count % 1000 == 0:
                        elapsed = (datetime.now() - start_time).total_seconds()
                        log_performance_metric("message_processing_rate", processed_count/elapsed, "msg/sec", f"Channel: {entity.title}")

                except Exception as e:
                    if DETAILED_LOGGING_AVAILABLE:
                        log_error(e, f"Error processing message {message.id}")
                    continue

            progress_bar.close()

            # Log final performance metrics
            if DETAILED_LOGGING_AVAILABLE:
                total_time = (datetime.now() - start_time).total_seconds()
                log_performance_metric("total_scan_time", total_time, "seconds", f"Channel: {entity.title}")
                log_performance_metric("final_processing_rate", processed_count/total_time, "msg/sec", f"Channel: {entity.title}")
                log_step("SCAN STATISTICS", f"Processed: {processed_count}, Found: {files_found}, Filtered: {files_filtered}")

            print(f"✅ Hoàn thành! Tìm thấy {len(self.files_data)} file")
            if DETAILED_LOGGING_AVAILABLE:
                log_step_end(scan_files_step_id, "SCAN_FILES", success=True,
                           result=f"Found {files_found} files, filtered {files_filtered}")
                log_step_end(scan_step_id, "SCAN_CHANNEL", success=True,
                           result=f"Scanned {processed_count:,} messages, found {len(self.files_data)} files")
                log_step("HOÀN THÀNH QUÉT", f"Đã quét {processed_count:,} tin nhắn, tìm thấy {len(self.files_data)} file")

        except Exception as e:
            if DETAILED_LOGGING_AVAILABLE:
                error_id = log_detailed_error(e, "scan_channel", scan_step_id, {
                    'channel_input': channel_input,
                    'processed_count': processed_count if 'processed_count' in locals() else 0,
                    'files_found': files_found if 'files_found' in locals() else 0
                })
                if 'scan_files_step_id' in locals():
                    log_step_end(scan_files_step_id, "SCAN_FILES", success=False, error=str(e))
                if scan_step_id:
                    log_step_end(scan_step_id, "SCAN_CHANNEL", success=False, error=str(e))
            raise
        
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
        """Đóng kết nối với proper cleanup"""
        if self.client:
            try:
                # Check if client is connected before trying to disconnect
                if self.client.is_connected():
                    # Wait for any pending operations to complete
                    await asyncio.sleep(0.1)

                    # Disconnect with timeout
                    await asyncio.wait_for(self.client.disconnect(), timeout=10.0)
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("CLIENT DISCONNECT", "Successfully disconnected Telegram client")
                else:
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("CLIENT DISCONNECT", "Client was already disconnected")
            except asyncio.TimeoutError:
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("CLIENT DISCONNECT", "Timeout during disconnect", "WARNING")
                print("⚠️ Client disconnect timeout - forcing cleanup")
            except Exception as e:
                if DETAILED_LOGGING_AVAILABLE:
                    log_error(e, "Client disconnect error")
                print(f"⚠️ Error during client disconnect: {e}")
            finally:
                self.client = None

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
