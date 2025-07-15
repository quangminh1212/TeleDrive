"""
Telegram File Scanner for TeleDrive
Main scanner functionality for extracting file information from Telegram channels.
"""

import asyncio
import json
import pandas as pd
from datetime import datetime
from typing import Dict, Optional, List
from pathlib import Path

from telethon.tl.types import (
    MessageMediaDocument, MessageMediaPhoto,
    DocumentAttributeFilename, DocumentAttributeVideo,
    DocumentAttributeAudio, DocumentAttributeSticker,
    DocumentAttributeAnimated
)
from tqdm.asyncio import tqdm
import aiofiles

from .client import TelegramClientManager
from ..config.settings import (
    OUTPUT_DIR, MAX_MESSAGES, GENERATE_DOWNLOAD_LINKS,
    SCAN_DOCUMENTS, SCAN_PHOTOS, SCAN_VIDEOS, SCAN_AUDIO,
    SCAN_VOICE, SCAN_STICKERS, SCAN_ANIMATIONS,
    CSV_FILENAME, JSON_FILENAME, EXCEL_FILENAME
)

try:
    from ..utils.logger import log_step, log_api_call, log_file_operation, log_progress, log_error, get_logger
    DETAILED_LOGGING_AVAILABLE = True
    logger = get_logger('scanner')
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)

class TelegramFileScanner:
    """Main scanner class for extracting file information from Telegram channels"""
    
    def __init__(self):
        self.client_manager = TelegramClientManager()
        self.files_data: List[Dict] = []
        self.output_dir = Path(OUTPUT_DIR)
        self.output_dir.mkdir(exist_ok=True)
        
    async def initialize(self):
        """Initialize the scanner"""
        return await self.client_manager.initialize()
    
    @property
    def client(self):
        """Get the Telegram client"""
        return self.client_manager.client
    
    async def get_channel_entity(self, channel_input: str):
        """Get channel entity from username or invite link"""
        return await self.client_manager.get_channel_entity(channel_input)
    
    async def join_private_channel(self, invite_link: str) -> bool:
        """Join private channel from invite link"""
        return await self.client_manager.join_private_channel(invite_link)
    
    async def check_channel_permissions(self, entity):
        """Check detailed channel access permissions"""
        return await self.client_manager.check_channel_permissions(entity)
        
    def extract_file_info(self, message) -> Optional[Dict]:
        """Extract file information from message"""
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
        
        # Handle Document (files, videos, audio, etc.)
        if isinstance(message.media, MessageMediaDocument):
            doc = message.media.document
            file_info['file_size'] = doc.size
            file_info['mime_type'] = doc.mime_type
            
            # Get filename and attributes
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
                    
            # If no filename, create default name
            if not file_info['file_name']:
                ext = self.get_extension_from_mime(file_info['mime_type'])
                file_info['file_name'] = f"file_{message.id}{ext}"
                
        # Handle Photo
        elif isinstance(message.media, MessageMediaPhoto):
            photo = message.media.photo
            file_info['file_type'] = 'photo'
            file_info['file_name'] = f"photo_{message.id}.jpg"
            if photo.sizes:
                largest_size = max(photo.sizes, key=lambda x: getattr(x, 'size', 0))
                file_info['file_size'] = getattr(largest_size, 'size', None)
                file_info['width'] = getattr(largest_size, 'w', None)
                file_info['height'] = getattr(largest_size, 'h', None)
                
        # Create download link if requested
        if GENERATE_DOWNLOAD_LINKS and file_info['file_type']:
            # Create appropriate download link for both public and private channels
            if hasattr(message.chat, 'username') and message.chat.username:
                # Public channel
                file_info['download_link'] = f"https://t.me/{message.chat.username}/{message.id}"
            else:
                # Private channel or group - use chat_id
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
        """Get extension from MIME type"""
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
        """Check if file type should be included"""
        type_config = {
            'document': SCAN_DOCUMENTS,
            'photo': SCAN_PHOTOS,
            'video': SCAN_VIDEOS,
            'audio': SCAN_AUDIO,
            'voice': SCAN_VOICE,
            'sticker': SCAN_STICKERS,
            'animation': SCAN_ANIMATIONS
        }
        return type_config.get(file_type, True)
        
    async def scan_channel(self, channel_input: str):
        """Scan all files in channel"""
        if DETAILED_LOGGING_AVAILABLE:
            log_step("START_SCAN", f"Channel: {channel_input}")

        entity = await self.get_channel_entity(channel_input)
        if not entity:
            if DETAILED_LOGGING_AVAILABLE:
                log_step("ENTITY_ERROR", "Cannot get channel information", "ERROR")
            return

        print(f"📡 Starting channel scan: {entity.title}")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("CHANNEL_INFO", f"Name: {entity.title}, ID: {entity.id}")

        print(f"📊 Counting total messages...")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("COUNT_MESSAGES", "Starting message count")

        # Count total messages
        total_messages = 0
        async for _ in self.client.iter_messages(entity, limit=MAX_MESSAGES):
            total_messages += 1

        print(f"📝 Total messages: {total_messages:,}")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("TOTAL_MESSAGES", f"Found {total_messages:,} messages")
            log_api_call("iter_messages", {"entity": entity.title, "limit": MAX_MESSAGES}, f"{total_messages} messages")

        print(f"🔍 Starting file scan...")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("START_FILE_SCAN", f"Scanning {total_messages:,} messages for files")

        # Scan messages and find files
        progress_bar = tqdm(total=total_messages, desc="Scanning")
        processed_count = 0

        async for message in self.client.iter_messages(entity, limit=MAX_MESSAGES):
            file_info = self.extract_file_info(message)

            if file_info and self.should_include_file_type(file_info['file_type']):
                self.files_data.append(file_info)
                if DETAILED_LOGGING_AVAILABLE and len(self.files_data) % 10 == 0:
                    log_progress(len(self.files_data), total_messages, "files found")

            processed_count += 1
            progress_bar.update(1)

        progress_bar.close()

        print(f"✅ Complete! Found {len(self.files_data)} files")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("SCAN_COMPLETE", f"Scanned {processed_count:,} messages, found {len(self.files_data)} files")

    async def scan_channel_by_entity(self, entity):
        """Scan channel using existing entity"""
        print(f"📡 Starting channel scan: {getattr(entity, 'title', 'Unknown')}")
        print(f"📊 Counting total messages...")
        
        # Count total messages
        total_messages = 0
        try:
            async for _ in self.client.iter_messages(entity, limit=MAX_MESSAGES):
                total_messages += 1
        except Exception as e:
            print(f"⚠️ Error counting messages: {e}")
            return
            
        print(f"📝 Total messages: {total_messages:,}")
        
        if total_messages == 0:
            print("❌ No messages to scan")
            return
            
        print(f"🔍 Starting file scan...")
        
        # Scan messages and find files
        progress_bar = tqdm(total=total_messages, desc="Scanning")
        
        try:
            async for message in self.client.iter_messages(entity, limit=MAX_MESSAGES):
                file_info = self.extract_file_info(message)
                
                if file_info and self.should_include_file_type(file_info['file_type']):
                    self.files_data.append(file_info)
                    
                progress_bar.update(1)
                
        except Exception as e:
            print(f"\n⚠️ Error during scan: {e}")
        finally:
            progress_bar.close()
            
        print(f"✅ Complete! Found {len(self.files_data)} files")
        
    async def save_results(self):
        """Save results to files"""
        if DETAILED_LOGGING_AVAILABLE:
            log_step("START_SAVE", f"Saving {len(self.files_data)} files")

        if not self.files_data:
            print("⚠️ No data to save")
            if DETAILED_LOGGING_AVAILABLE:
                log_step("NO_DATA", "No files to save", "WARNING")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if DETAILED_LOGGING_AVAILABLE:
            log_step("PREPARE_SAVE", f"Timestamp: {timestamp}")

        # Save CSV
        csv_path = self.output_dir / f"{timestamp}_{CSV_FILENAME}"
        df = pd.DataFrame(self.files_data)
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        print(f"💾 Saved CSV: {csv_path}")
        if DETAILED_LOGGING_AVAILABLE:
            log_file_operation("SAVE", str(csv_path), f"CSV with {len(self.files_data)} records")

        # Save Excel
        excel_path = self.output_dir / f"{timestamp}_{EXCEL_FILENAME}"
        df.to_excel(excel_path, index=False, engine='openpyxl')
        print(f"💾 Saved Excel: {excel_path}")
        if DETAILED_LOGGING_AVAILABLE:
            log_file_operation("SAVE", str(excel_path), f"Excel with {len(self.files_data)} records")

        # Create JSON with optimized format for files and links
        json_data = {
            "scan_info": {
                "timestamp": timestamp,
                "total_files": len(self.files_data),
                "scan_date": datetime.now().isoformat()
            },
            "files": []
        }

        # Format data for JSON with focus on filename and link
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

            # Add media info if available
            if file_data['duration']:
                json_file['file_info']['duration'] = file_data['duration']
            if file_data['width'] and file_data['height']:
                json_file['file_info']['dimensions'] = {
                    "width": file_data['width'],
                    "height": file_data['height']
                }

            json_data["files"].append(json_file)

        # Save JSON
        json_path = self.output_dir / f"{timestamp}_{JSON_FILENAME}"
        async with aiofiles.open(json_path, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(json_data, ensure_ascii=False, indent=2))
        print(f"💾 Saved JSON: {json_path}")
        if DETAILED_LOGGING_AVAILABLE:
            log_file_operation("SAVE", str(json_path), f"Detailed JSON with {len(self.files_data)} files")

        # Save simple JSON with just filename and link
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
        print(f"💾 Saved simple JSON: {simple_json_path}")
        if DETAILED_LOGGING_AVAILABLE:
            log_file_operation("SAVE", str(simple_json_path), f"Simple JSON with {len(self.files_data)} files")

        # Statistics
        self.print_statistics()

        if DETAILED_LOGGING_AVAILABLE:
            log_step("SAVE_COMPLETE", f"Successfully saved {len(self.files_data)} files in 4 formats")
        
    def print_statistics(self):
        """Print statistics"""
        if not self.files_data:
            return
            
        df = pd.DataFrame(self.files_data)
        
        print("\n📊 STATISTICS:")
        print(f"Total files: {len(self.files_data):,}")
        
        # Statistics by file type
        type_counts = df['file_type'].value_counts()
        print("\nBreakdown by type:")
        for file_type, count in type_counts.items():
            print(f"  {file_type}: {count:,}")
            
        # Size statistics
        total_size = df['file_size'].sum()
        if total_size > 0:
            print(f"\nTotal size: {self.format_size(total_size)}")
            print(f"Average size: {self.format_size(df['file_size'].mean())}")
            
    def format_size(self, size_bytes: float) -> str:
        """Format file size"""
        if pd.isna(size_bytes):
            return "N/A"
            
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"
        
    async def close(self):
        """Close scanner and client connection"""
        await self.client_manager.close()
