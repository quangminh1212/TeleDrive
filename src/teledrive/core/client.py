"""
Telegram Client Manager for TeleDrive
Handles Telegram client initialization, authentication, and connection management.
"""

import asyncio
import logging
from typing import Optional
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError

from ..config.settings import (
    API_ID, API_HASH, PHONE_NUMBER, SESSION_NAME,
    CONNECTION_TIMEOUT, REQUEST_TIMEOUT, RETRY_ATTEMPTS, RETRY_DELAY,
    FLOOD_SLEEP_THRESHOLD, DEVICE_MODEL, SYSTEM_VERSION, APP_VERSION,
    LANG_CODE, SYSTEM_LANG_CODE
)

try:
    from ..utils.logger import get_logger, log_step, log_api_call, log_error
    DETAILED_LOGGING_AVAILABLE = True
    logger = get_logger('client')
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False
    logger = logging.getLogger(__name__)

class TelegramClientManager:
    """Manages Telegram client connection and authentication"""
    
    def __init__(self):
        self.client: Optional[TelegramClient] = None
        self._is_initialized = False
    
    async def initialize(self) -> bool:
        """Initialize Telegram client with improved error handling"""
        if self._is_initialized and self.client:
            return True
            
        if DETAILED_LOGGING_AVAILABLE:
            log_step("CLIENT_INIT", "Starting Telegram client initialization")

        # Validate phone number
        if not PHONE_NUMBER or PHONE_NUMBER == '+84xxxxxxxxx':
            error_msg = "PHONE_NUMBER not configured in config"
            if DETAILED_LOGGING_AVAILABLE:
                log_step("VALIDATION_ERROR", error_msg, "ERROR")
            raise ValueError(error_msg)

        try:
            if DETAILED_LOGGING_AVAILABLE:
                log_step("CREATE_CLIENT", f"API_ID: {API_ID}, Session: {SESSION_NAME}")

            self.client = TelegramClient(
                SESSION_NAME,
                int(API_ID),
                API_HASH,
                connection_retries=RETRY_ATTEMPTS,
                retry_delay=RETRY_DELAY,
                timeout=CONNECTION_TIMEOUT,
                request_retries=RETRY_ATTEMPTS,
                flood_sleep_threshold=FLOOD_SLEEP_THRESHOLD,
                device_model=DEVICE_MODEL,
                system_version=SYSTEM_VERSION,
                app_version=APP_VERSION,
                lang_code=LANG_CODE,
                system_lang_code=SYSTEM_LANG_CODE
            )

            if DETAILED_LOGGING_AVAILABLE:
                log_step("LOGIN", f"Logging in with phone: {PHONE_NUMBER}")
                log_api_call("client.start", {"phone": PHONE_NUMBER})

            # Check if session already exists
            await self.client.connect()
            
            if await self.client.is_user_authorized():
                print("✅ Valid session found, no need to login again")
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("SESSION_EXISTS", "Using existing session")
            else:
                print("🔐 Login required...")
                await self._perform_login()

            print("✅ Successfully connected to Telegram!")
            if DETAILED_LOGGING_AVAILABLE:
                log_step("INIT_SUCCESS", "Successfully connected to Telegram")
            
            self._is_initialized = True
            return True

        except EOFError:
            error_msg = "Cannot input verification code. Please run script in interactive terminal."
            print(f"❌ {error_msg}")
            if DETAILED_LOGGING_AVAILABLE:
                log_step("INPUT_ERROR", error_msg, "ERROR")
            raise ValueError(error_msg)
            
        except ValueError as e:
            if "invalid literal for int()" in str(e):
                error_msg = "API_ID must be integer, not text"
                if DETAILED_LOGGING_AVAILABLE:
                    log_error(e, "API_ID validation")
                raise ValueError(error_msg)
            if DETAILED_LOGGING_AVAILABLE:
                log_error(e, "Client initialization")
            raise e
            
        except Exception as e:
            if DETAILED_LOGGING_AVAILABLE:
                log_error(e, "Client initialization - unexpected error")
            raise e

    async def _perform_login(self):
        """Perform login process"""
        try:
            await self.client.start(
                phone=PHONE_NUMBER,
                code_callback=self._get_verification_code,
                password_callback=self._get_2fa_password
            )
        except SessionPasswordNeededError:
            print("🔐 2FA password required...")
            password = self._get_2fa_password()
            await self.client.sign_in(password=password)

    def _get_verification_code(self) -> str:
        """Callback to input verification code with error handling"""
        try:
            return input("📱 Enter verification code from Telegram: ")
        except EOFError:
            print("❌ Cannot input verification code")
            raise

    def _get_2fa_password(self) -> str:
        """Callback to input 2FA password"""
        try:
            import getpass
            return getpass.getpass("🔐 Enter 2FA password (if any): ")
        except EOFError:
            print("❌ Cannot input 2FA password")
            raise

    async def get_channel_entity(self, channel_input: str):
        """Get channel entity from username or invite link"""
        if not self.client:
            raise RuntimeError("Client not initialized")
            
        try:
            # Handle invite link for private channel
            if 'joinchat' in channel_input or '+' in channel_input:
                print("🔐 Detected private channel invite link")
                entity = await self.client.get_entity(channel_input)
                return entity

            # Handle username or public link
            if channel_input.startswith('https://t.me/'):
                channel_input = channel_input.replace('https://t.me/', '')
                # Handle private channel link with +
                if channel_input.startswith('+'):
                    entity = await self.client.get_entity(channel_input)
                    return entity

            if channel_input.startswith('@'):
                channel_input = channel_input[1:]

            entity = await self.client.get_entity(channel_input)

            # Check access permissions
            try:
                # Try to get basic info to check permissions
                await self.client.get_messages(entity, limit=1)
                print(f"✅ Access granted to channel: {getattr(entity, 'title', 'Unknown')}")
            except Exception as access_error:
                print(f"⚠️ Access warning: {access_error}")
                print("💡 Make sure you are a member of this private channel")

            return entity

        except Exception as e:
            print(f"❌ Cannot access channel '{channel_input}': {e}")
            print("💡 Suggestions:")
            print("   - For public channel: @channelname or https://t.me/channelname")
            print("   - For private channel: https://t.me/joinchat/xxxxx or https://t.me/+xxxxx")
            print("   - Make sure you joined the private channel first")
            return None

    async def join_private_channel(self, invite_link: str) -> bool:
        """Join private channel from invite link"""
        if not self.client:
            raise RuntimeError("Client not initialized")
            
        try:
            print(f"🔗 Joining private channel from link: {invite_link}")

            # Extract hash from link
            if 'joinchat' in invite_link:
                hash_part = invite_link.split('joinchat/')[-1]
            elif '+' in invite_link:
                hash_part = invite_link.split('+')[-1]
            else:
                print("❌ Invalid link")
                return False

            # Import functions
            from telethon import functions

            # Join channel
            await self.client(functions.messages.ImportChatInviteRequest(
                hash=hash_part
            ))

            print("✅ Successfully joined private channel!")
            return True

        except Exception as e:
            print(f"❌ Cannot join private channel: {e}")
            print("💡 You might already be a member or the link has expired")
            return False

    async def check_channel_permissions(self, entity):
        """Check detailed channel access permissions"""
        if not self.client:
            raise RuntimeError("Client not initialized")
            
        try:
            # Get channel info
            full_channel = await self.client.get_entity(entity)
            print(f"📊 Channel: {getattr(full_channel, 'title', 'Unknown')}")
            
            # Check message reading permission
            await self.client.get_messages(entity, limit=1)
            print("✅ Message reading permission granted")
            
            # Check message count
            total = 0
            async for _ in self.client.iter_messages(entity, limit=10):
                total += 1
                
            if total > 0:
                print(f"✅ Can access messages (test: {total}/10)")
            else:
                print("⚠️ No messages found")
                
        except Exception as e:
            print(f"⚠️ Permission check error: {e}")

    async def close(self):
        """Close connection with improved error handling"""
        if self.client:
            try:
                if self.client.is_connected():
                    await self.client.disconnect()
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("CLOSE_CONNECTION", "Successfully closed Telegram connection")
                else:
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("CLOSE_CONNECTION", "Client was already closed")
            except Exception as e:
                # Ignore errors when closing connection
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("CLOSE_CONNECTION", f"Error closing connection (ignored): {e}", "WARNING")
                pass
            finally:
                self._is_initialized = False

    @property
    def is_connected(self) -> bool:
        """Check if client is connected"""
        return self.client and self.client.is_connected() if self.client else False

    @property
    def is_initialized(self) -> bool:
        """Check if client is initialized"""
        return self._is_initialized
