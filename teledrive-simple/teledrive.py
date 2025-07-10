#!/usr/bin/env python3
"""
TeleDrive - Simple Telegram Channel File Manager
A minimalist tool for managing files in Telegram channels
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import List, Optional
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

# Validate configuration
if not all([API_ID, API_HASH, PHONE_NUMBER]):
    print("❌ Missing required configuration. Please check your .env file.")
    print("Required: API_ID, API_HASH, PHONE_NUMBER")
    sys.exit(1)

# Create download directory
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

class TeleDrive:
    """Simple TeleDrive client"""
    
    def __init__(self):
        self.client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        self.connected = False
    
    async def connect(self):
        """Connect to Telegram"""
        try:
            await self.client.start(phone=PHONE_NUMBER)
            self.connected = True
            me = await self.client.get_me()
            print(f"✅ Connected as: {me.first_name} {me.last_name or ''}")
            return True
        except SessionPasswordNeededError:
            print("❌ Two-factor authentication enabled. Please disable it temporarily.")
            return False
        except PhoneCodeInvalidError:
            print("❌ Invalid phone code.")
            return False
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from Telegram"""
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
    
    async def list_files(self, channel: str, limit: int = 50) -> List[dict]:
        """List files from channel"""
        try:
            entity = await self.client.get_entity(channel)
            files = []
            
            print(f"📋 Fetching files from {channel}...")
            
            async for message in self.client.iter_messages(entity, limit=limit):
                if message.document:
                    filename = self.get_filename(message)
                    size = message.document.size
                    files.append({
                        'id': message.id,
                        'name': filename,
                        'size': size,
                        'size_formatted': self.format_size(size),
                        'date': message.date,
                        'message': message
                    })
            
            print(f"✅ Found {len(files)} files")
            return files
            
        except Exception as e:
            print(f"❌ Failed to list files: {e}")
            return []
    
    async def search_files(self, channel: str, query: str, limit: int = 20) -> List[dict]:
        """Search files in channel"""
        try:
            all_files = await self.list_files(channel, limit * 3)
            query_lower = query.lower()
            
            matching_files = [
                f for f in all_files 
                if query_lower in f['name'].lower()
            ][:limit]
            
            print(f"🔍 Found {len(matching_files)} files matching '{query}'")
            return matching_files
            
        except Exception as e:
            print(f"❌ Search failed: {e}")
            return []
    
    async def download_file(self, file_info: dict, download_path: Optional[Path] = None) -> bool:
        """Download a file"""
        try:
            if download_path is None:
                download_path = DOWNLOAD_DIR / file_info['name']
            
            download_path.parent.mkdir(parents=True, exist_ok=True)
            
            print(f"⬇️  Downloading {file_info['name']} ({file_info['size_formatted']})...")
            
            await self.client.download_media(
                file_info['message'],
                file=str(download_path)
            )
            
            print(f"✅ Downloaded to {download_path}")
            return True
            
        except Exception as e:
            print(f"❌ Download failed: {e}")
            return False
    
    async def upload_file(self, channel: str, file_path: Path, caption: str = "") -> bool:
        """Upload a file to channel"""
        try:
            if not file_path.exists():
                print(f"❌ File not found: {file_path}")
                return False
            
            entity = await self.client.get_entity(channel)
            
            print(f"⬆️  Uploading {file_path.name}...")
            
            await self.client.send_file(
                entity,
                file=str(file_path),
                caption=caption,
                force_document=True
            )
            
            print(f"✅ Uploaded {file_path.name}")
            return True
            
        except Exception as e:
            print(f"❌ Upload failed: {e}")
            return False

def print_files(files: List[dict]):
    """Print files in a simple table format"""
    if not files:
        print("No files found.")
        return
    
    print(f"\n{'#':<3} {'Name':<40} {'Size':<10} {'Date':<16}")
    print("-" * 70)
    
    for i, file in enumerate(files, 1):
        name = file['name'][:37] + "..." if len(file['name']) > 40 else file['name']
        date_str = file['date'].strftime("%Y-%m-%d %H:%M")
        print(f"{i:<3} {name:<40} {file['size_formatted']:<10} {date_str:<16}")

async def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("TeleDrive - Simple Telegram Channel File Manager")
        print("\nUsage:")
        print("  python teledrive.py list <channel> [limit]")
        print("  python teledrive.py search <channel> <query> [limit]")
        print("  python teledrive.py download <channel> <file_number>")
        print("  python teledrive.py upload <channel> <file_path> [caption]")
        print("\nExamples:")
        print("  python teledrive.py list @mychannel 10")
        print("  python teledrive.py search @mychannel 'video' 5")
        print("  python teledrive.py download @mychannel 1")
        print("  python teledrive.py upload @mychannel ./file.pdf 'My document'")
        return
    
    command = sys.argv[1].lower()
    
    # Initialize TeleDrive
    teledrive = TeleDrive()
    
    try:
        # Connect to Telegram
        if not await teledrive.connect():
            return
        
        if command == "list":
            if len(sys.argv) < 3:
                print("❌ Usage: python teledrive.py list <channel> [limit]")
                return
            
            channel = sys.argv[2]
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 50
            
            files = await teledrive.list_files(channel, limit)
            print_files(files)
        
        elif command == "search":
            if len(sys.argv) < 4:
                print("❌ Usage: python teledrive.py search <channel> <query> [limit]")
                return
            
            channel = sys.argv[2]
            query = sys.argv[3]
            limit = int(sys.argv[4]) if len(sys.argv) > 4 else 20
            
            files = await teledrive.search_files(channel, query, limit)
            print_files(files)
        
        elif command == "download":
            if len(sys.argv) < 4:
                print("❌ Usage: python teledrive.py download <channel> <file_number>")
                return
            
            channel = sys.argv[2]
            file_number = int(sys.argv[3])
            
            # First list files to get the file info
            files = await teledrive.list_files(channel, 100)
            
            if file_number < 1 or file_number > len(files):
                print(f"❌ Invalid file number. Available: 1-{len(files)}")
                return
            
            file_info = files[file_number - 1]
            await teledrive.download_file(file_info)
        
        elif command == "upload":
            if len(sys.argv) < 4:
                print("❌ Usage: python teledrive.py upload <channel> <file_path> [caption]")
                return
            
            channel = sys.argv[2]
            file_path = Path(sys.argv[3])
            caption = sys.argv[4] if len(sys.argv) > 4 else ""
            
            await teledrive.upload_file(channel, file_path, caption)
        
        else:
            print(f"❌ Unknown command: {command}")
    
    finally:
        await teledrive.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
