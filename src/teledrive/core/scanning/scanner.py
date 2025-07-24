#!/usr/bin/env python3
"""
Telegram Scanner Module

Main module for scanning and processing Telegram files.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Union

# Configure logging
logger = logging.getLogger(__name__)

# Import configuration
from src.teledrive.config import config, validate_environment


class TelegramScanner:
    """
    Scanner for retrieving files from Telegram channels and chats.
    """
    
    def __init__(self, api_id: str = None, api_hash: str = None, phone: str = None):
        """Initialize the scanner with credentials."""
        self.api_id = api_id or config.telegram.api_id
        self.api_hash = api_hash or config.telegram.api_hash
        self.phone = phone or config.telegram.phone_number
        self.client = None
        self.is_connected = False
    
    async def connect(self) -> bool:
        """Connect to Telegram API."""
        try:
            # Import here to avoid circular dependencies
            from telethon import TelegramClient
            
            # Create session directory if it doesn't exist
            session_dir = Path("instance")
            session_dir.mkdir(exist_ok=True)
            
            # Initialize client
            session_path = session_dir / "telegram_scanner_session"
            self.client = TelegramClient(
                str(session_path),
                self.api_id, 
                self.api_hash
            )
            
            # Connect to Telegram
            await self.client.connect()
            
            # Check authorization
            if not await self.client.is_user_authorized():
                # Request phone code verification
                await self.client.send_code_request(self.phone)
                logger.info("Authorization required. Please check your phone for verification code.")
                return False
            
            self.is_connected = True
            logger.info("Successfully connected to Telegram API")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Telegram: {e}")
            return False
    
    async def scan_channel(self, channel_id: str, limit: int = 100) -> List[Dict]:
        """
        Scan a specific channel for files.
        
        Args:
            channel_id: Channel username or ID
            limit: Maximum number of messages to scan
            
        Returns:
            List of file information dictionaries
        """
        if not self.is_connected or not self.client:
            logger.error("Not connected to Telegram API")
            return []
            
        try:
            results = []
            channel = await self.client.get_entity(channel_id)
            
            async for message in self.client.iter_messages(channel, limit=limit):
                if message.media:
                    # Process file
                    file_info = await self._process_media(message)
                    if file_info:
                        results.append(file_info)
            
            return results
            
        except Exception as e:
            logger.error(f"Error scanning channel {channel_id}: {e}")
            return []
    
    async def _process_media(self, message) -> Optional[Dict]:
        """Process a media message and extract file information."""
        try:
            # Extract file information
            file_info = {
                'message_id': message.id,
                'date': message.date.isoformat(),
                'caption': message.text if message.text else '',
            }
            
            # Get media-specific information
            if hasattr(message.media, 'document'):
                file_info['file_id'] = message.media.document.id
                file_info['file_name'] = getattr(message.media, 'document').attributes[0].file_name
                file_info['mime_type'] = message.media.document.mime_type
                file_info['file_size'] = message.media.document.size
                file_info['type'] = 'document'
            elif hasattr(message.media, 'photo'):
                file_info['file_id'] = message.media.photo.id
                file_info['file_name'] = f"photo_{message.id}.jpg"
                file_info['type'] = 'photo'
            else:
                return None
                
            return file_info
            
        except Exception as e:
            logger.error(f"Error processing media: {e}")
            return None
            
    async def close(self):
        """Close the Telegram client connection."""
        if self.client:
            await self.client.disconnect()
            self.is_connected = False


async def main():
    """Main entry point for the scanner."""
    try:
        # Validate environment configuration
        validate_environment()
        
        # Initialize scanner
        scanner = TelegramScanner()
        
        # Connect to Telegram
        if await scanner.connect():
            # Example usage
            channel_id = config.channels.default_channel
            files = await scanner.scan_channel(channel_id)
            
            # Print results
            print(f"Found {len(files)} files in {channel_id}")
            
            # Close connection
            await scanner.close()
    
    except KeyboardInterrupt:
        print("\nScanner stopped by user.")
    except Exception as e:
        logger.error(f"Error in scanner: {e}")


if __name__ == '__main__':
    asyncio.run(main()) 