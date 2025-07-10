"""
File Manager module for TeleDrive
Handles file operations including listing, downloading, and uploading
"""

import asyncio
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
from telethon.tl.types import Message, DocumentAttributeFilename, DocumentAttributeVideo, DocumentAttributeAudio
from telegram_client import TelegramClient
from config import Config

logger = logging.getLogger(__name__)

class FileInfo:
    """Class to represent file information"""
    
    def __init__(self, message: Message):
        self.message = message
        self.message_id = message.id
        self.date = message.date
        self.file_name = self._get_filename()
        self.file_size = self._get_filesize()
        self.file_type = self._get_filetype()
        self.caption = message.message or ""
        
    def _get_filename(self) -> str:
        """Extract filename from message"""
        if not self.message.document:
            return "Unknown"
            
        # Try to get filename from document attributes
        for attr in self.message.document.attributes:
            if isinstance(attr, DocumentAttributeFilename):
                return attr.file_name
                
        # Fallback to document mime_type or generic name
        if hasattr(self.message.document, 'mime_type'):
            ext = self.message.document.mime_type.split('/')[-1]
            return f"file_{self.message_id}.{ext}"
            
        return f"file_{self.message_id}"
    
    def _get_filesize(self) -> int:
        """Get file size in bytes"""
        if self.message.document:
            return self.message.document.size
        return 0
    
    def _get_filetype(self) -> str:
        """Get file type/category"""
        return Config.get_file_category(self.file_name)
    
    def get_formatted_size(self) -> str:
        """Get human-readable file size"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for easy serialization"""
        return {
            'message_id': self.message_id,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'formatted_size': self.get_formatted_size(),
            'file_type': self.file_type,
            'date': self.date.isoformat(),
            'caption': self.caption
        }

class FileManager:
    """File manager for Telegram channel operations"""
    
    def __init__(self, telegram_client: TelegramClient):
        self.client = telegram_client
        
    async def list_files(self, channel_identifier: str, limit: int = 100) -> List[FileInfo]:
        """List files from a Telegram channel"""
        try:
            channel = await self.client.get_channel_entity(channel_identifier)
            files = []
            
            logger.info(f"Fetching files from channel: {channel_identifier}")
            
            async for message in self.client.client.iter_messages(channel, limit=limit):
                if message.document:
                    file_info = FileInfo(message)
                    files.append(file_info)
                    logger.debug(f"Found file: {file_info.file_name} ({file_info.get_formatted_size()})")
            
            logger.info(f"Found {len(files)} files in channel")
            return files
            
        except Exception as e:
            logger.error(f"Failed to list files from channel {channel_identifier}: {e}")
            raise
    
    async def search_files(self, channel_identifier: str, query: str, limit: int = 50) -> List[FileInfo]:
        """Search for files in channel by filename or caption"""
        try:
            all_files = await self.list_files(channel_identifier, limit=limit * 2)
            
            # Filter files based on query
            matching_files = []
            query_lower = query.lower()
            
            for file_info in all_files:
                if (query_lower in file_info.file_name.lower() or 
                    query_lower in file_info.caption.lower()):
                    matching_files.append(file_info)
                    
                if len(matching_files) >= limit:
                    break
            
            logger.info(f"Found {len(matching_files)} files matching query: {query}")
            return matching_files
            
        except Exception as e:
            logger.error(f"Failed to search files in channel {channel_identifier}: {e}")
            raise

    async def download_file(self, file_info: FileInfo, download_path: Optional[Path] = None) -> Path:
        """Download a file from Telegram"""
        try:
            if download_path is None:
                download_path = Config.DOWNLOAD_DIR / file_info.file_name
            else:
                download_path = Path(download_path)

            # Create directory if it doesn't exist
            download_path.parent.mkdir(parents=True, exist_ok=True)

            logger.info(f"Downloading {file_info.file_name} to {download_path}")

            # Download the file
            await self.client.client.download_media(
                file_info.message,
                file=str(download_path)
            )

            logger.info(f"Successfully downloaded {file_info.file_name}")
            return download_path

        except Exception as e:
            logger.error(f"Failed to download file {file_info.file_name}: {e}")
            raise

    async def download_files_batch(self, files: List[FileInfo], download_dir: Optional[Path] = None) -> List[Path]:
        """Download multiple files in batch"""
        if download_dir is None:
            download_dir = Config.DOWNLOAD_DIR
        else:
            download_dir = Path(download_dir)

        downloaded_files = []

        for file_info in files:
            try:
                file_path = download_dir / file_info.file_name
                downloaded_path = await self.download_file(file_info, file_path)
                downloaded_files.append(downloaded_path)
            except Exception as e:
                logger.error(f"Failed to download {file_info.file_name}: {e}")
                continue

        logger.info(f"Downloaded {len(downloaded_files)} out of {len(files)} files")
        return downloaded_files

    async def upload_file(self, channel_identifier: str, file_path: Path, caption: str = "") -> Message:
        """Upload a file to Telegram channel"""
        try:
            file_path = Path(file_path)

            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            if file_path.stat().st_size > Config.MAX_FILE_SIZE:
                raise ValueError(f"File size exceeds Telegram limit of {Config.MAX_FILE_SIZE / (1024**3):.1f}GB")

            channel = await self.client.get_channel_entity(channel_identifier)

            logger.info(f"Uploading {file_path.name} to channel {channel_identifier}")

            # Upload the file
            message = await self.client.client.send_file(
                channel,
                file=str(file_path),
                caption=caption,
                force_document=True
            )

            logger.info(f"Successfully uploaded {file_path.name}")
            return message

        except Exception as e:
            logger.error(f"Failed to upload file {file_path}: {e}")
            raise

    async def upload_files_batch(self, channel_identifier: str, file_paths: List[Path], caption_template: str = "") -> List[Message]:
        """Upload multiple files in batch"""
        uploaded_messages = []

        for file_path in file_paths:
            try:
                caption = caption_template.format(filename=file_path.name) if caption_template else ""
                message = await self.upload_file(channel_identifier, file_path, caption)
                uploaded_messages.append(message)
            except Exception as e:
                logger.error(f"Failed to upload {file_path}: {e}")
                continue

        logger.info(f"Uploaded {len(uploaded_messages)} out of {len(file_paths)} files")
        return uploaded_messages
