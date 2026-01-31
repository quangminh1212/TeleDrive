#!/usr/bin/env python3
"""
Telegram Storage Manager
Handles file upload/download to/from Telegram channels as storage backend
"""

import asyncio
import os
import tempfile
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, BinaryIO
from telethon import TelegramClient
from telethon.errors import (
    FloodWaitError, FileReferenceExpiredError, 
    ChannelPrivateError, MessageNotModifiedError
)
from telethon.tl.types import (
    MessageMediaDocument, InputDocumentFileLocation,
    DocumentAttributeFilename
)
from telethon.tl.functions.channels import CreateChannelRequest
from telethon.tl.functions.account import UpdateUsernameRequest
import config
from db import db, File

class TelegramStorageManager:
    """Manages file storage on Telegram channels"""
    
    def __init__(self):
        self.client = None
        self.user_channels = {}  # Cache user channels
        
    async def initialize(self):
        """Initialize Telegram client"""
        try:
            self.client = TelegramClient(
                config.SESSION_NAME,
                int(config.API_ID),
                config.API_HASH,
                connection_retries=3,
                retry_delay=5,
                timeout=60
            )
            await self.client.connect()
            
            if not await self.client.is_user_authorized():
                raise Exception("Telegram client not authorized. Please run authentication first.")
            
            return True
        except Exception as e:
            print(f"Failed to initialize Telegram client: {e}")
            return False
    
    async def close(self):
        """Close Telegram client"""
        if self.client:
            await self.client.disconnect()
    
    async def get_or_create_user_channel(self, user_id: int) -> Optional[str]:
        """Get or create private channel for user storage"""
        try:
            # Check cache first
            if user_id in self.user_channels:
                return self.user_channels[user_id]
            
            # Create channel name
            channel_title = f"TeleDrive Storage - User {user_id}"
            channel_about = f"Private storage channel for TeleDrive user {user_id}"
            
            # Try to find existing channel first
            async for dialog in self.client.iter_dialogs():
                if dialog.title == channel_title and dialog.is_channel:
                    channel_username = dialog.entity.username
                    self.user_channels[user_id] = channel_username
                    return channel_username
            
            # Create new private channel
            result = await self.client(CreateChannelRequest(
                title=channel_title,
                about=channel_about,
                megagroup=False  # Create channel, not supergroup
            ))
            
            channel = result.chats[0]
            channel_username = f"teledrive_user_{user_id}_{channel.id}"
            
            # Set channel username if possible
            try:
                await self.client(UpdateUsernameRequest(
                    channel=channel,
                    username=channel_username
                ))
            except:
                # Username might not be available, use channel ID
                channel_username = str(channel.id)
            
            self.user_channels[user_id] = channel_username
            return channel_username
            
        except Exception as e:
            print(f"Failed to get/create user channel: {e}")
            return None
    
    async def upload_file(self, file_path: str, filename: str, user_id: int) -> Optional[Dict[str, Any]]:
        """Upload file to Saved Messages (for backward compatibility)"""
        return await self.upload_to_saved_messages(file_path, filename)
    
    async def upload_to_saved_messages(self, file_path: str, filename: str) -> Optional[Dict[str, Any]]:
        """Upload file directly to Saved Messages"""
        try:
            # Upload file to Saved Messages ('me' = current user's Saved Messages)
            message = await self.client.send_file(
                'me',  # Saved Messages
                file_path,
                caption=f"📁 {filename}\n🔗 Uploaded via TeleDrive",
                attributes=[DocumentAttributeFilename(filename)]
            )
            
            # Extract file information
            if message.media and isinstance(message.media, MessageMediaDocument):
                document = message.media.document
                
                return {
                    'message_id': message.id,
                    'channel': 'me',  # Saved Messages
                    'channel_id': str(message.chat_id),
                    'file_id': str(document.id),
                    'unique_id': document.file_reference.hex() if document.file_reference else None,
                    'access_hash': str(document.access_hash),
                    'file_reference': document.file_reference,
                    'file_size': document.size,
                    'mime_type': document.mime_type
                }
            
            # Handle photos (images sent without document format)
            if message.media:
                return {
                    'message_id': message.id,
                    'channel': 'me',
                    'channel_id': str(message.chat_id),
                    'file_id': str(message.id),
                    'unique_id': None,
                    'access_hash': None,
                    'file_reference': None,
                    'file_size': os.path.getsize(file_path),
                    'mime_type': 'application/octet-stream'
                }
            
            return None
            
        except FloodWaitError as e:
            print(f"Rate limited, wait {e.seconds} seconds")
            await asyncio.sleep(e.seconds)
            return await self.upload_to_saved_messages(file_path, filename)
        except Exception as e:
            print(f"Failed to upload file to Saved Messages: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def download_file(self, file_record: File, output_path: Optional[str] = None) -> Optional[str]:
        """Download file from Telegram"""
        try:
            if not file_record.is_stored_on_telegram():
                raise Exception("File is not stored on Telegram")
            
            telegram_info = file_record.get_telegram_info()
            
            # Create temp file if no output path specified
            if not output_path:
                temp_dir = tempfile.gettempdir()
                output_path = os.path.join(temp_dir, f"teledrive_{file_record.id}_{file_record.filename}")
            
            # Download from Telegram
            channel = telegram_info['channel']
            message_id = telegram_info['message_id']
            
            # Get the message
            message = await self.client.get_messages(channel, ids=message_id)
            if not message or not message.media:
                raise Exception("Message or media not found")
            
            # Download the file
            downloaded_path = await self.client.download_media(
                message.media,
                file=output_path
            )
            
            return downloaded_path
            
        except FileReferenceExpiredError:
            # File reference expired, need to refresh
            print("File reference expired, refreshing...")
            return await self._refresh_and_download(file_record, output_path)
        except Exception as e:
            print(f"Failed to download file: {e}")
            return None
    
    async def _refresh_and_download(self, file_record: File, output_path: Optional[str] = None) -> Optional[str]:
        """Refresh file reference and download"""
        try:
            telegram_info = file_record.get_telegram_info()
            channel = telegram_info['channel']
            message_id = telegram_info['message_id']
            
            # Get fresh message to update file reference
            message = await self.client.get_messages(channel, ids=message_id)
            if not message or not message.media:
                raise Exception("Message not found for refresh")
            
            # Update file reference in database
            if isinstance(message.media, MessageMediaDocument):
                document = message.media.document
                file_record.telegram_file_reference = document.file_reference
                db.session.commit()
            
            # Try download again
            downloaded_path = await self.client.download_media(
                message.media,
                file=output_path
            )
            
            return downloaded_path
            
        except Exception as e:
            print(f"Failed to refresh and download: {e}")
            return None
    
    async def delete_file(self, file_record: File) -> bool:
        """Delete file from Telegram"""
        try:
            if not file_record.is_stored_on_telegram():
                return True  # Already not on Telegram
            
            telegram_info = file_record.get_telegram_info()
            channel = telegram_info['channel']
            message_id = telegram_info['message_id']
            
            # Delete message from channel
            await self.client.delete_messages(channel, message_id)
            
            return True
            
        except Exception as e:
            print(f"Failed to delete file from Telegram: {e}")
            return False
    
    async def get_file_info(self, file_record: File) -> Optional[Dict[str, Any]]:
        """Get file information from Telegram"""
        try:
            if not file_record.is_stored_on_telegram():
                return None
            
            telegram_info = file_record.get_telegram_info()
            channel = telegram_info['channel']
            message_id = telegram_info['message_id']
            
            message = await self.client.get_messages(channel, ids=message_id)
            if not message or not message.media:
                return None
            
            if isinstance(message.media, MessageMediaDocument):
                document = message.media.document
                return {
                    'file_size': document.size,
                    'mime_type': document.mime_type,
                    'date': message.date,
                    'available': True
                }
            
            return None
            
        except Exception as e:
            print(f"Failed to get file info: {e}")
            return None

# Global instance
telegram_storage = TelegramStorageManager()
