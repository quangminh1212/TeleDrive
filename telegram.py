#!/usr/bin/env python3
"""
Telegram - Module xử lý Telegram API đơn giản
"""

import asyncio
import os
from pathlib import Path
from telethon import TelegramClient
from telethon.tl.types import Message, DocumentAttributeFilename
from dotenv import load_dotenv

# Load cấu hình
load_dotenv()

# Cấu hình
API_ID = os.getenv('API_ID')
API_HASH = os.getenv('API_HASH')
SESSION_NAME = os.getenv('SESSION_NAME', 'session')
DOWNLOAD_DIR = Path(os.getenv('DOWNLOAD_DIR', './downloads'))

# Tạo thư mục download
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

class TelegramManager:
    """Quản lý Telegram API"""
    
    def __init__(self):
        if not API_ID or not API_HASH:
            raise ValueError("Thiếu API_ID hoặc API_HASH")
        
        self.client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        self.connected = False
    
    async def connect(self):
        """Kết nối Telegram"""
        try:
            await self.client.connect()
            if await self.client.is_user_authorized():
                self.connected = True
                user = await self.client.get_me()
                return {"success": True, "user": user}
            else:
                return {"success": False, "message": "Chưa đăng nhập"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def disconnect(self):
        """Ngắt kết nối"""
        if self.connected:
            await self.client.disconnect()
            self.connected = False
    
    def get_filename(self, message):
        """Lấy tên file từ message"""
        if not message.document:
            return "Unknown"
        
        for attr in message.document.attributes:
            if isinstance(attr, DocumentAttributeFilename):
                return attr.file_name
        
        return f"file_{message.id}"
    
    def format_size(self, size_bytes):
        """Định dạng kích thước file"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    async def list_files(self, channel, limit=50):
        """Liệt kê file từ channel"""
        try:
            if not self.connected:
                result = await self.connect()
                if not result["success"]:
                    return {"success": False, "message": result["message"], "files": []}
            
            entity = await self.client.get_entity(channel)
            files = []
            
            async for message in self.client.iter_messages(entity, limit=limit):
                if message.document:
                    filename = self.get_filename(message)
                    size = message.document.size
                    files.append({
                        'id': message.id,
                        'name': filename,
                        'size': size,
                        'size_formatted': self.format_size(size),
                        'date': message.date.strftime("%Y-%m-%d %H:%M:%S"),
                        'mime_type': message.document.mime_type or 'unknown'
                    })
            
            return {"success": True, "files": files, "channel": channel}
            
        except Exception as e:
            return {"success": False, "message": str(e), "files": []}
    
    async def search_files(self, channel, query, limit=20):
        """Tìm kiếm file"""
        try:
            result = await self.list_files(channel, limit * 3)
            if not result["success"]:
                return result
            
            query_lower = query.lower()
            matching_files = [
                f for f in result["files"] 
                if query_lower in f['name'].lower()
            ][:limit]
            
            return {
                "success": True,
                "files": matching_files,
                "channel": channel,
                "query": query
            }
            
        except Exception as e:
            return {"success": False, "message": str(e), "files": []}
    
    async def download_file(self, channel, file_id, download_path=None):
        """Download file"""
        try:
            if not self.connected:
                result = await self.connect()
                if not result["success"]:
                    return {"success": False, "message": result["message"]}
            
            entity = await self.client.get_entity(channel)
            message = await self.client.get_messages(entity, ids=file_id)
            
            if not message or not message.document:
                return {"success": False, "message": "Không tìm thấy file"}
            
            filename = self.get_filename(message)
            
            if download_path is None:
                download_path = DOWNLOAD_DIR / filename
            
            download_path.parent.mkdir(parents=True, exist_ok=True)
            
            await self.client.download_media(message, file=str(download_path))
            
            return {
                "success": True,
                "message": f"Đã tải {filename}",
                "file_path": str(download_path),
                "filename": filename
            }
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def upload_file(self, channel, file_path, caption=""):
        """Upload file"""
        try:
            if not Path(file_path).exists():
                return {"success": False, "message": f"Không tìm thấy file: {file_path}"}
            
            if not self.connected:
                result = await self.connect()
                if not result["success"]:
                    return {"success": False, "message": result["message"]}
            
            entity = await self.client.get_entity(channel)
            
            message = await self.client.send_file(
                entity,
                file=str(file_path),
                caption=caption,
                force_document=True
            )
            
            return {
                "success": True,
                "message": f"Đã upload {Path(file_path).name}",
                "filename": Path(file_path).name,
                "message_id": message.id
            }
            
        except Exception as e:
            return {"success": False, "message": str(e)}

# Instance toàn cục
telegram_manager = None

def get_telegram_manager():
    """Lấy instance TelegramManager"""
    global telegram_manager
    if telegram_manager is None:
        telegram_manager = TelegramManager()
    return telegram_manager
