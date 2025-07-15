"""
Telegram Client wrapper with enhanced error handling and logging
"""

import asyncio
from typing import Optional, Union
from pathlib import Path

from telethon import TelegramClient as TelethonClient
from telethon.errors import (
    SessionPasswordNeededError, PhoneCodeInvalidError,
    PhoneNumberInvalidError, FloodWaitError
)

from ..config.manager import get_config
from ..utils.logger import get_logger


class TelegramClient:
    """Enhanced Telegram client with better error handling"""
    
    def __init__(self, config_manager=None):
        """
        Initialize Telegram client
        
        Args:
            config_manager: Configuration manager instance
        """
        self.config = get_config() if config_manager is None else config_manager.get_config()
        self.client: Optional[TelethonClient] = None
        self.logger = get_logger('telegram_client')
        self._connected = False
        
    async def initialize(self) -> bool:
        """
        Initialize and connect Telegram client
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            self.logger.info("Initializing Telegram client...")
            
            # Validate configuration
            if not self._validate_config():
                return False
                
            # Create client
            self.client = TelethonClient(
                session=self.config.telegram.session_name,
                api_id=int(self.config.telegram.api_id),
                api_hash=self.config.telegram.api_hash,
                device_model=self.config.telegram.device_model,
                system_version=self.config.telegram.system_version,
                app_version=self.config.telegram.app_version,
                lang_code=self.config.telegram.lang_code,
                system_lang_code=self.config.telegram.system_lang_code,
                connection_retries=self.config.telegram.retry_attempts,
                retry_delay=self.config.telegram.retry_delay,
                timeout=self.config.telegram.connection_timeout,
                request_retries=self.config.telegram.retry_attempts,
                flood_sleep_threshold=self.config.telegram.flood_sleep_threshold
            )
            
            # Connect
            await self.client.connect()
            
            # Authenticate if needed
            if not await self.client.is_user_authorized():
                await self._authenticate()
                
            self._connected = True
            self.logger.info("Telegram client initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Telegram client: {e}")
            return False
            
    async def _authenticate(self) -> None:
        """Handle Telegram authentication"""
        try:
            self.logger.info("Starting authentication process...")
            
            # Send code request
            await self.client.send_code_request(self.config.telegram.phone_number)
            
            # Get code from user
            code = input("Enter the code you received: ").strip()
            
            try:
                await self.client.sign_in(self.config.telegram.phone_number, code)
                self.logger.info("Authentication successful")
                
            except SessionPasswordNeededError:
                self.logger.info("Two-factor authentication required")
                password = input("Enter your 2FA password: ").strip()
                await self.client.sign_in(password=password)
                self.logger.info("2FA authentication successful")
                
        except PhoneCodeInvalidError:
            raise ValueError("Invalid phone code entered")
        except PhoneNumberInvalidError:
            raise ValueError("Invalid phone number in configuration")
        except Exception as e:
            self.logger.error(f"Authentication failed: {e}")
            raise
            
    def _validate_config(self) -> bool:
        """
        Validate Telegram configuration
        
        Returns:
            bool: True if valid, False otherwise
        """
        telegram_config = self.config.telegram
        
        # Check API credentials
        if not telegram_config.api_id or telegram_config.api_id == "YOUR_API_ID":
            self.logger.error("API ID not configured")
            return False
            
        if not telegram_config.api_hash or telegram_config.api_hash == "YOUR_API_HASH":
            self.logger.error("API Hash not configured")
            return False
            
        # Check phone number
        if not telegram_config.phone_number or not telegram_config.phone_number.startswith('+'):
            self.logger.error("Invalid phone number configuration")
            return False
            
        return True
        
    async def get_entity(self, entity_input: Union[str, int]):
        """
        Get Telegram entity (channel, user, etc.)
        
        Args:
            entity_input: Entity identifier (username, ID, or invite link)
            
        Returns:
            Entity object or None if not found
        """
        if not self._connected:
            raise RuntimeError("Client not connected. Call initialize() first.")
            
        try:
            self.logger.debug(f"Getting entity for: {entity_input}")
            
            # Handle invite links
            if isinstance(entity_input, str) and ('joinchat' in entity_input or '+' in entity_input):
                return await self._handle_invite_link(entity_input)
                
            # Regular entity resolution
            entity = await self.client.get_entity(entity_input)
            self.logger.debug(f"Entity resolved: {getattr(entity, 'title', getattr(entity, 'username', 'Unknown'))}")
            return entity
            
        except Exception as e:
            self.logger.error(f"Failed to get entity {entity_input}: {e}")
            return None
            
    async def _handle_invite_link(self, invite_link: str):
        """
        Handle invite link processing
        
        Args:
            invite_link: Telegram invite link
            
        Returns:
            Entity object or None
        """
        try:
            # Extract hash from invite link
            if 'joinchat' in invite_link:
                hash_part = invite_link.split('joinchat/')[-1]
            elif '+' in invite_link:
                hash_part = invite_link.split('+')[-1]
            else:
                self.logger.error("Invalid invite link format")
                return None
                
            # Import and join
            from telethon import functions
            result = await self.client(functions.messages.ImportChatInviteRequest(hash=hash_part))
            
            # Get the channel from result
            if hasattr(result, 'chats') and result.chats:
                return result.chats[0]
                
            self.logger.error("No channel found in invite result")
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to handle invite link: {e}")
            return None
            
    async def iter_messages(self, entity, **kwargs):
        """
        Iterate over messages with rate limiting
        
        Args:
            entity: Telegram entity
            **kwargs: Additional arguments for iter_messages
            
        Yields:
            Message objects
        """
        if not self._connected:
            raise RuntimeError("Client not connected. Call initialize() first.")
            
        try:
            rate_config = self.config.advanced.rate_limiting
            
            if rate_config.enabled:
                # Implement basic rate limiting
                message_count = 0
                async for message in self.client.iter_messages(entity, **kwargs):
                    yield message
                    message_count += 1
                    
                    # Simple rate limiting
                    if message_count % rate_config.requests_per_second == 0:
                        await asyncio.sleep(1)
            else:
                async for message in self.client.iter_messages(entity, **kwargs):
                    yield message
                    
        except FloodWaitError as e:
            self.logger.warning(f"Rate limited, waiting {e.seconds} seconds")
            await asyncio.sleep(e.seconds)
            # Retry after flood wait
            async for message in self.iter_messages(entity, **kwargs):
                yield message
                
    async def get_messages(self, entity, **kwargs):
        """
        Get messages with error handling
        
        Args:
            entity: Telegram entity
            **kwargs: Additional arguments for get_messages
            
        Returns:
            Messages list
        """
        if not self._connected:
            raise RuntimeError("Client not connected. Call initialize() first.")
            
        try:
            return await self.client.get_messages(entity, **kwargs)
        except Exception as e:
            self.logger.error(f"Failed to get messages: {e}")
            return []
            
    async def close(self) -> None:
        """Close the Telegram client connection"""
        if self.client and self._connected:
            try:
                await self.client.disconnect()
                self._connected = False
                self.logger.info("Telegram client disconnected")
            except Exception as e:
                self.logger.error(f"Error closing client: {e}")
                
    @property
    def is_connected(self) -> bool:
        """Check if client is connected"""
        return self._connected and self.client is not None
        
    def __str__(self) -> str:
        """String representation"""
        return f"TelegramClient(connected={self._connected})"
        
    def __repr__(self) -> str:
        """Detailed string representation"""
        return f"TelegramClient(connected={self._connected}, phone={self.config.telegram.phone_number})"
