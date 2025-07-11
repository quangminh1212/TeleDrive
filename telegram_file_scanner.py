#!/usr/bin/env python3
"""
Telegram File Scanner
Quét và lấy thông tin tất cả các file trong kênh Telegram
"""

import asyncio
import os
import json
import csv
import pandas as pd
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path

from telethon import TelegramClient, events
from telethon.tl.types import (
    MessageMediaDocument, MessageMediaPhoto, 
    DocumentAttributeFilename, DocumentAttributeVideo,
    DocumentAttributeAudio, DocumentAttributeSticker,
    DocumentAttributeAnimated
)
from tqdm.asyncio import tqdm
import aiofiles

import config

class TelegramFileScanner:
    def __init__(self):
        self.client = None
        self.files_data = []
        self.output_dir = Path(config.OUTPUT_DIR)
        self.output_dir.mkdir(exist_ok=True)
        
    async def initialize(self):
        """Khởi tạo Telegram client"""
        if not all([config.API_ID, config.API_HASH, config.PHONE_NUMBER]):
            raise ValueError("Vui lòng cấu hình API credentials trong file .env")
            
        self.client = TelegramClient(
            config.SESSION_NAME, 
            config.API_ID, 
            config.API_HASH
        )
        
        await self.client.start(phone=config.PHONE_NUMBER)
        print("✅ Đã kết nối thành công với Telegram!")
        
    async def get_channel_entity(self, channel_input: str):
        """Lấy entity của kênh từ username hoặc invite link"""
        try:
            if channel_input.startswith('https://t.me/'):
                channel_input = channel_input.replace('https://t.me/', '')
            if channel_input.startswith('@'):
                channel_input = channel_input[1:]
                
            entity = await self.client.get_entity(channel_input)
            return entity
        except Exception as e:
            print(f"❌ Không thể truy cập kênh '{channel_input}': {e}")
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
            file_info['download_link'] = f"tg://resolve?domain={message.chat.username}&post={message.id}" if hasattr(message.chat, 'username') else f"message_id_{message.id}"
            
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
        entity = await self.get_channel_entity(channel_input)
        if not entity:
            return
            
        print(f"📡 Bắt đầu quét kênh: {entity.title}")
        print(f"📊 Đang đếm tổng số tin nhắn...")
        
        # Đếm tổng số tin nhắn
        total_messages = 0
        async for _ in self.client.iter_messages(entity, limit=config.MAX_MESSAGES):
            total_messages += 1
            
        print(f"📝 Tổng số tin nhắn: {total_messages:,}")
        print(f"🔍 Bắt đầu quét file...")
        
        # Quét các tin nhắn và tìm file
        progress_bar = tqdm(total=total_messages, desc="Đang quét")
        
        async for message in self.client.iter_messages(entity, limit=config.MAX_MESSAGES):
            file_info = self.extract_file_info(message)
            
            if file_info and self.should_include_file_type(file_info['file_type']):
                self.files_data.append(file_info)
                
            progress_bar.update(1)
            
        progress_bar.close()
        
        print(f"✅ Hoàn thành! Tìm thấy {len(self.files_data)} file")
        
    async def save_results(self):
        """Lưu kết quả ra các file"""
        if not self.files_data:
            print("⚠️ Không có dữ liệu để lưu")
            return
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Lưu CSV
        csv_path = self.output_dir / f"{timestamp}_{config.CSV_FILENAME}"
        df = pd.DataFrame(self.files_data)
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        print(f"💾 Đã lưu CSV: {csv_path}")
        
        # Lưu Excel
        excel_path = self.output_dir / f"{timestamp}_{config.EXCEL_FILENAME}"
        df.to_excel(excel_path, index=False, engine='openpyxl')
        print(f"💾 Đã lưu Excel: {excel_path}")
        
        # Lưu JSON
        json_path = self.output_dir / f"{timestamp}_{config.JSON_FILENAME}"
        async with aiofiles.open(json_path, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(self.files_data, ensure_ascii=False, indent=2))
        print(f"💾 Đã lưu JSON: {json_path}")
        
        # Thống kê
        self.print_statistics()
        
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
