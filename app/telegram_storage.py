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
from typing import Optional, Dict, Any, BinaryIO, List
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
        self._temp_session_path = None
        
    def _copy_session_to_temp(self):
        """Copy session file to temp to avoid database lock"""
        import sqlite3
        import time
        from pathlib import Path
        
        # Get project root
        project_root = Path(__file__).parent.parent
        
        # Check for session files in order of priority
        session_import = project_root / "data" / "session_import.session"
        session_main = project_root / "data" / "session.session"
        
        source_session = None
        if session_import.exists():
            source_session = session_import
            print(f"[STORAGE] Found session_import: {source_session}")
        elif session_main.exists():
            source_session = session_main
            print(f"[STORAGE] Found main session: {source_session}")
        else:
            print(f"[STORAGE] No session file found in data/")
            return None
        
        # Create temp directory for storage sessions
        storage_temp_dir = project_root / "data" / "storage_temp"
        storage_temp_dir.mkdir(exist_ok=True)
        
        # Create temp session path
        temp_session = storage_temp_dir / f"upload_{int(time.time())}.session"
        
        # Copy using sqlite3 backup API to avoid lock
        max_retries = 3
        for attempt in range(max_retries):
            try:
                src_conn = sqlite3.connect(f"file:{source_session}?mode=ro", uri=True)
                dst_conn = sqlite3.connect(str(temp_session))
                with dst_conn:
                    src_conn.backup(dst_conn)
                dst_conn.close()
                src_conn.close()
                
                print(f"[STORAGE] Copied session to: {temp_session}")
                return str(temp_session).replace('.session', '')
            except Exception as e:
                print(f"[STORAGE] Copy attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(1)
        
        # Fallback: use original session directly (risk: database lock)
        print(f"[STORAGE] Using original session directly (may cause lock)")
        return str(source_session).replace('.session', '')
        
    async def initialize(self):
        """Initialize Telegram client"""
        try:
            # Copy session to temp to avoid lock
            session_path = self._copy_session_to_temp()
            if not session_path:
                print(f"[STORAGE] ERROR: No valid session file found")
                return False
            
            self._temp_session_path = session_path
            print(f"[STORAGE] Using session: {session_path}")
            
            self.client = TelegramClient(
                session_path,
                int(config.API_ID),
                config.API_HASH,
                connection_retries=3,
                retry_delay=5,
                timeout=60
            )
            await self.client.connect()
            
            if not await self.client.is_user_authorized():
                print(f"[STORAGE] Session not authorized: {session_path}")
                raise Exception("Telegram client not authorized. Please run authentication first.")
            
            # Get user info
            me = await self.client.get_me()
            print(f"[STORAGE] Connected as: {me.first_name} (ID: {me.id})")
            
            return True
        except Exception as e:
            print(f"[STORAGE] Failed to initialize Telegram client: {e}")
            import traceback
            traceback.print_exc()
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
    
    async def upload_to_saved_messages(self, file_path: str, filename: str, unique_id: str = None) -> Optional[Dict[str, Any]]:
        """Upload file directly to Saved Messages"""
        try:
            # Verify and log current user before upload
            me = await self.client.get_me()
            print(f"[STORAGE] ✅ Uploading to Saved Messages of: {me.first_name} (ID: {me.id}, Phone: {me.phone})")
            
            # Generate unique_id (epoch timestamp ms) if not provided
            import time
            if not unique_id:
                unique_id = str(int(time.time() * 1000))
            
            # Upload file to Saved Messages ('me' = current user's Saved Messages)
            # Include unique_id in caption for easy mapping/atlas search
            message = await self.client.send_file(
                'me',  # Saved Messages
                file_path,
                caption=f"📁 {filename}\n🆔 ID: {unique_id}\n🔗 Uploaded via TeleDrive\n👤 User: {me.first_name}",
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
                    'teledrive_unique_id': unique_id,  # Our epoch timestamp ms ID for mapping
                    'access_hash': str(document.access_hash),
                    'file_reference': document.file_reference,
                    'file_size': document.size,
                    'mime_type': document.mime_type,
                    'uploaded_by_user': {
                        'telegram_id': me.id,
                        'first_name': me.first_name,
                        'phone': me.phone
                    }
                }
            
            # Handle photos (images sent without document format)
            if message.media:
                return {
                    'message_id': message.id,
                    'channel': 'me',
                    'channel_id': str(message.chat_id),
                    'file_id': str(message.id),
                    'unique_id': None,
                    'teledrive_unique_id': unique_id,  # Our epoch timestamp ms ID for mapping
                    'access_hash': None,
                    'file_reference': None,
                    'file_size': os.path.getsize(file_path),
                    'mime_type': 'application/octet-stream',
                    'uploaded_by_user': {
                        'telegram_id': me.id,
                        'first_name': me.first_name,
                        'phone': me.phone
                    }
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
    
    async def add_id_to_caption(self, message_id: int, unique_id: str) -> bool:
        """Edit message caption to add unique_id if not present"""
        try:
            # Get the message
            message = await self.client.get_messages('me', ids=message_id)
            if not message:
                print(f"[STORAGE] Message {message_id} not found")
                return False
            
            current_caption = message.message or ''
            
            # Check if ID already exists in caption
            if '🆔 ID:' in current_caption:
                print(f"[STORAGE] Message {message_id} already has ID in caption")
                return True
            
            # Get filename from caption (first line after 📁)
            lines = current_caption.split('\n')
            filename = ''
            for line in lines:
                if line.startswith('📁 '):
                    filename = line.replace('📁 ', '').strip()
                    break
            
            if not filename and message.file:
                # Try to get filename from file attributes
                if hasattr(message.file, 'name') and message.file.name:
                    filename = message.file.name
            
            # Get user info
            me = await self.client.get_me()
            
            # Build new caption with ID
            new_caption = f"📁 {filename}\n🆔 ID: {unique_id}\n🔗 Uploaded via TeleDrive\n👤 User: {me.first_name}"
            
            # Edit the message caption
            await self.client.edit_message('me', message_id, new_caption)
            print(f"[STORAGE] Added ID {unique_id} to message {message_id}")
            return True
            
        except Exception as e:
            print(f"[STORAGE] Failed to add ID to caption for message {message_id}: {e}")
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
    
    async def scan_saved_messages(self, limit: int = 500) -> List[Dict[str, Any]]:
        """Scan all files in Saved Messages and return list of files"""
        files = []
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                print(f"[STORAGE] Scanning Saved Messages (limit: {limit}, attempt {attempt + 1}/{max_retries})...")
                
                # Get messages from Saved Messages
                message_count = 0
                file_count = 0
                
                async for message in self.client.iter_messages('me', limit=limit):
                    message_count += 1
                    
                    # Check if message has media (file)
                    if not message.media:
                        continue
                    
                    file_info = {
                        'message_id': message.id,
                        'date': message.date.isoformat() if message.date else None,
                        'caption': message.message or '',
                    }
                    
                    # Handle documents
                    if isinstance(message.media, MessageMediaDocument):
                        doc = message.media.document
                        
                        # Get filename from attributes
                        filename = None
                        for attr in doc.attributes:
                            if hasattr(attr, 'file_name'):
                                filename = attr.file_name
                                break
                        
                        if not filename:
                            filename = f"file_{message.id}"
                        
                        file_info.update({
                            'filename': filename,
                            'file_size': doc.size,
                            'mime_type': doc.mime_type,
                            'file_id': str(doc.id),
                            'access_hash': str(doc.access_hash),
                            'file_reference': doc.file_reference.hex() if doc.file_reference else None,
                            'type': 'document'
                        })
                        files.append(file_info)
                        file_count += 1
                        
                    # Handle photos
                    elif hasattr(message.media, 'photo') and message.media.photo:
                        photo = message.media.photo
                        
                        # Try to extract filename from caption (TeleDrive uploads have format: "📁 filename.ext\n...")
                        photo_filename = f"photo_{message.id}.jpg"
                        caption = message.message or ''
                        if caption.startswith('📁 '):
                            # Extract filename from caption line
                            first_line = caption.split('\n')[0]
                            extracted_name = first_line.replace('📁 ', '').strip()
                            if extracted_name:
                                photo_filename = extracted_name
                                print(f"[STORAGE] Extracted filename from caption: {photo_filename}")
                        
                        # Determine mime type based on extension
                        mime_type = 'image/jpeg'
                        if photo_filename.lower().endswith('.png'):
                            mime_type = 'image/png'
                        elif photo_filename.lower().endswith('.gif'):
                            mime_type = 'image/gif'
                        elif photo_filename.lower().endswith('.webp'):
                            mime_type = 'image/webp'
                        
                        file_info.update({
                            'filename': photo_filename,
                            'file_size': 0,
                            'mime_type': mime_type,
                            'file_id': str(photo.id),
                            'access_hash': str(photo.access_hash),
                            'file_reference': photo.file_reference.hex() if photo.file_reference else None,
                            'type': 'photo'
                        })
                        files.append(file_info)
                        file_count += 1
                
                print(f"[STORAGE] Scan complete: {message_count} messages, {file_count} files found")
                return files
                
            except Exception as e:
                error_msg = str(e)
                print(f"[STORAGE] Scan attempt {attempt + 1}/{max_retries} failed: {error_msg}")
                
                if 'PARSE_FAILED' in error_msg or 'network' in error_msg.lower() or 'connection' in error_msg.lower():
                    if attempt < max_retries - 1:
                        import asyncio
                        wait_time = (attempt + 1) * 2
                        print(f"[STORAGE] Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                
                import traceback
                traceback.print_exc()
                return []
        
        return []

# Global instance
telegram_storage = TelegramStorageManager()

