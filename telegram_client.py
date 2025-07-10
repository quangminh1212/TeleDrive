"""
Telegram Client module for TeleDrive
Handles connection and authentication with Telegram API
"""

import asyncio
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from telethon import TelegramClient as TelethonClient, events
from telethon.tl.types import Message, DocumentAttributeFilename
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
from config import Config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramClient:
    """Telegram client wrapper for TeleDrive operations"""
    
    def __init__(self):
        """Initialize Telegram client"""
        Config.validate_config()
        
        self.client = TelethonClient(
            Config.SESSION_NAME,
            Config.API_ID,
            Config.API_HASH
        )
        self.is_connected = False
        
    async def connect(self):
        """Connect and authenticate with Telegram"""
        try:
            await self.client.start(phone=Config.PHONE_NUMBER)
            self.is_connected = True
            logger.info("Successfully connected to Telegram")
            
            # Get current user info
            me = await self.client.get_me()
            logger.info(f"Logged in as: {me.first_name} {me.last_name or ''} (@{me.username or 'no username'})")
            
        except SessionPasswordNeededError:
            logger.error("Two-factor authentication is enabled. Please disable it or implement 2FA support.")
            raise
        except PhoneCodeInvalidError:
            logger.error("Invalid phone code entered")
            raise
        except Exception as e:
            logger.error(f"Failed to connect to Telegram: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from Telegram"""
        if self.is_connected:
            await self.client.disconnect()
            self.is_connected = False
            logger.info("Disconnected from Telegram")
    
    async def get_channel_entity(self, channel_identifier: str):
        """Get channel entity by username or ID"""
        try:
            entity = await self.client.get_entity(channel_identifier)
            return entity
        except Exception as e:
            logger.error(f"Failed to get channel entity for {channel_identifier}: {e}")
            raise
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.disconnect()
