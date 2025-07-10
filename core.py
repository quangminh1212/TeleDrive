#!/usr/bin/env python3
"""
TeleDrive Core - Telegram Channel File Manager Core Logic
Refactored from CLI version for web interface usage
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

from telethon import TelegramClient
from telethon.tl.types import Message, DocumentAttributeFilename
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_ID = os.getenv('API_ID')
API_HASH = os.getenv('API_HASH')
PHONE_NUMBER = os.getenv('PHONE_NUMBER')
SESSION_NAME = os.getenv('SESSION_NAME', 'teledrive_session')
DOWNLOAD_DIR = Path(os.getenv('DOWNLOAD_DIR', './downloads'))

# Create download directory
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

class TeleDriveCore:
    """Core TeleDrive functionality for web interface"""
    
    def __init__(self):
        if not all([API_ID, API_HASH, PHONE_NUMBER]):
            raise ValueError("Missing required configuration: API_ID, API_HASH, PHONE_NUMBER")
        
        self.client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        self.connected = False
        self._connection_lock = asyncio.Lock()
    
    async def connect(self) -> Dict[str, Any]:
        """Connect to Telegram"""
        async with self._connection_lock:
            if self.connected:
                return {"success": True, "message": "Already connected"}
            
            try:
                await self.client.start(phone=PHONE_NUMBER)
                self.connected = True
                me = await self.client.get_me()
                return {
                    "success": True,
                    "message": f"Connected as: {me.first_name} {me.last_name or ''}",
                    "user": {
                        "first_name": me.first_name,
                        "last_name": me.last_name or "",
                        "username": me.username or "",
                        "phone": me.phone or ""
                    }
                }
            except SessionPasswordNeededError:
                return {"success": False, "message": "Two-factor authentication enabled. Please disable it temporarily."}
            except PhoneCodeInvalidError:
                return {"success": False, "message": "Invalid phone code."}
            except Exception as e:
                return {"success": False, "message": f"Connection failed: {str(e)}"}
    
    async def disconnect(self):
        """Disconnect from Telegram"""
        async with self._connection_lock:
            if self.connected:
                await self.client.disconnect()
                self.connected = False
    
    def get_filename(self, message: Message) -> str:
        """Extract filename from message"""
        if not message.document:
            return "Unknown"
        
        # Try to get filename from document attributes
        for attr in message.document.attributes:
            if isinstance(attr, DocumentAttributeFilename):
                return attr.file_name
        
        # Fallback to generic name
        return f"file_{message.id}"
    
    def format_size(self, size_bytes: int) -> str:
        """Format file size in human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    async def list_files(self, channel: str, limit: int = 50) -> Dict[str, Any]:
        """List files from channel"""
        try:
            if not self.connected:
                connect_result = await self.connect()
                if not connect_result["success"]:
                    return {"success": False, "message": connect_result["message"], "files": []}
            
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
                        'date': message.date.isoformat(),
                        'date_formatted': message.date.strftime("%Y-%m-%d %H:%M:%S"),
                        'mime_type': message.document.mime_type or 'application/octet-stream'
                    })
            
            return {
                "success": True,
                "message": f"Found {len(files)} files",
                "files": files,
                "channel": channel
            }
            
        except Exception as e:
            return {"success": False, "message": f"Failed to list files: {str(e)}", "files": []}
    
    async def search_files(self, channel: str, query: str, limit: int = 20) -> Dict[str, Any]:
        """Search files in channel"""
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
                "message": f"Found {len(matching_files)} files matching '{query}'",
                "files": matching_files,
                "channel": channel,
                "query": query
            }
            
        except Exception as e:
            return {"success": False, "message": f"Search failed: {str(e)}", "files": []}
    
    async def get_file_info(self, channel: str, file_id: int) -> Dict[str, Any]:
        """Get specific file information"""
        try:
            if not self.connected:
                connect_result = await self.connect()
                if not connect_result["success"]:
                    return {"success": False, "message": connect_result["message"]}
            
            entity = await self.client.get_entity(channel)
            message = await self.client.get_messages(entity, ids=file_id)
            
            if not message or not message.document:
                return {"success": False, "message": "File not found"}
            
            filename = self.get_filename(message)
            size = message.document.size
            
            return {
                "success": True,
                "file": {
                    'id': message.id,
                    'name': filename,
                    'size': size,
                    'size_formatted': self.format_size(size),
                    'date': message.date.isoformat(),
                    'date_formatted': message.date.strftime("%Y-%m-%d %H:%M:%S"),
                    'mime_type': message.document.mime_type or 'application/octet-stream'
                }
            }
            
        except Exception as e:
            return {"success": False, "message": f"Failed to get file info: {str(e)}"}
    
    async def download_file(self, channel: str, file_id: int, download_path: Optional[Path] = None) -> Dict[str, Any]:
        """Download a file"""
        try:
            if not self.connected:
                connect_result = await self.connect()
                if not connect_result["success"]:
                    return {"success": False, "message": connect_result["message"]}
            
            entity = await self.client.get_entity(channel)
            message = await self.client.get_messages(entity, ids=file_id)
            
            if not message or not message.document:
                return {"success": False, "message": "File not found"}
            
            filename = self.get_filename(message)
            
            if download_path is None:
                download_path = DOWNLOAD_DIR / filename
            
            download_path.parent.mkdir(parents=True, exist_ok=True)
            
            await self.client.download_media(message, file=str(download_path))
            
            return {
                "success": True,
                "message": f"Downloaded {filename}",
                "file_path": str(download_path),
                "filename": filename
            }
            
        except Exception as e:
            return {"success": False, "message": f"Download failed: {str(e)}"}
    
    async def upload_file(self, channel: str, file_path: Path, caption: str = "") -> Dict[str, Any]:
        """Upload a file to channel"""
        try:
            if not file_path.exists():
                return {"success": False, "message": f"File not found: {file_path}"}
            
            if not self.connected:
                connect_result = await self.connect()
                if not connect_result["success"]:
                    return {"success": False, "message": connect_result["message"]}
            
            entity = await self.client.get_entity(channel)
            
            message = await self.client.send_file(
                entity,
                file=str(file_path),
                caption=caption,
                force_document=True
            )
            
            return {
                "success": True,
                "message": f"Uploaded {file_path.name}",
                "filename": file_path.name,
                "message_id": message.id
            }
            
        except Exception as e:
            return {"success": False, "message": f"Upload failed: {str(e)}"}

# Global instance for web app
teledrive_instance = None

def get_teledrive_instance():
    """Get or create TeleDrive instance"""
    global teledrive_instance
    if teledrive_instance is None:
        teledrive_instance = TeleDriveCore()
    return teledrive_instance
