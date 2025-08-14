#!/usr/bin/env python3
"""
Telegram Authentication Helper
Handles Telegram client authentication for storage
"""

import asyncio
import os
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
import config

class TelegramAuthenticator:
    """Handles Telegram authentication"""
    
    def __init__(self):
        self.client = None
    
    async def authenticate(self, phone_number: str = None) -> bool:
        """Authenticate with Telegram"""
        try:
            # Use phone from config if not provided
            if not phone_number:
                phone_number = config.PHONE_NUMBER
            
            if not phone_number:
                print("❌ Phone number not provided")
                return False
            
            # Initialize client
            self.client = TelegramClient(
                config.SESSION_NAME,
                int(config.API_ID),
                config.API_HASH
            )
            
            await self.client.connect()
            
            # Check if already authorized
            if await self.client.is_user_authorized():
                print("✅ Already authenticated with Telegram")
                me = await self.client.get_me()
                print(f"✅ Logged in as: {me.first_name} {me.last_name or ''} (@{me.username or 'no_username'})")
                return True
            
            # Send code request
            print(f"📱 Sending authentication code to {phone_number}")
            sent_code = await self.client.send_code_request(phone_number)
            
            # Get code from user
            code = input("🔑 Enter the authentication code: ")
            
            try:
                # Sign in with code
                await self.client.sign_in(phone_number, code)
                print("✅ Successfully authenticated with Telegram")
                
                me = await self.client.get_me()
                print(f"✅ Logged in as: {me.first_name} {me.last_name or ''} (@{me.username or 'no_username'})")
                
                return True
                
            except SessionPasswordNeededError:
                # 2FA is enabled
                password = input("🔐 Enter your 2FA password: ")
                await self.client.sign_in(password=password)
                
                print("✅ Successfully authenticated with 2FA")
                me = await self.client.get_me()
                print(f"✅ Logged in as: {me.first_name} {me.last_name or ''} (@{me.username or 'no_username'})")
                
                return True
                
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            return False
        finally:
            if self.client:
                await self.client.disconnect()
    
    def is_authenticated(self) -> bool:
        """Check if session file exists"""
        session_file = f"{config.SESSION_NAME}.session"
        return os.path.exists(session_file)
    
    async def test_connection(self) -> bool:
        """Test if we can connect to Telegram"""
        try:
            client = TelegramClient(
                config.SESSION_NAME,
                int(config.API_ID),
                config.API_HASH
            )
            
            await client.connect()
            
            if await client.is_user_authorized():
                me = await client.get_me()
                print(f"✅ Connection test successful: {me.first_name} {me.last_name or ''}")
                await client.disconnect()
                return True
            else:
                print("❌ Not authorized")
                await client.disconnect()
                return False
                
        except Exception as e:
            print(f"❌ Connection test failed: {e}")
            return False

async def main():
    """Main function for standalone authentication"""
    print("🔐 TeleDrive Telegram Authentication")
    print("=" * 40)
    
    # Check config
    if not config.API_ID or not config.API_HASH:
        print("❌ Telegram API credentials not configured")
        print("Please set API_ID and API_HASH in config.py")
        return
    
    auth = TelegramAuthenticator()
    
    # Check if already authenticated
    if auth.is_authenticated():
        print("📱 Session file exists, testing connection...")
        if await auth.test_connection():
            print("✅ Already authenticated and working")
            return
        else:
            print("⚠️ Session file exists but connection failed")
            print("Removing old session and re-authenticating...")
            session_file = f"{config.SESSION_NAME}.session"
            if os.path.exists(session_file):
                os.remove(session_file)
    
    # Authenticate
    phone = input("📱 Enter your phone number (with country code, e.g., +1234567890): ")
    if await auth.authenticate(phone):
        print("🎉 Authentication completed successfully!")
        print("You can now use TeleDrive with Telegram storage.")
    else:
        print("❌ Authentication failed. Please try again.")

if __name__ == "__main__":
    asyncio.run(main())
