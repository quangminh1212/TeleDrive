"""
Debug authentication issues with Telegram
This script helps diagnose and fix authentication problems
"""

import asyncio
import logging
import os
from pathlib import Path
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, AuthKeyUnregisteredError
from config import Config

# Setup detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def debug_authentication():
    """Debug authentication issues"""
    print("🔍 TeleDrive Authentication Debugger")
    print("=" * 50)
    
    # Check configuration
    print("\n📋 Configuration Check:")
    print(f"API_ID: {Config.API_ID}")
    print(f"API_HASH: {Config.API_HASH[:10]}..." if Config.API_HASH else "Not set")
    print(f"PHONE_NUMBER: {Config.PHONE_NUMBER}")
    print(f"SESSION_NAME: {Config.SESSION_NAME}")
    
    # Check session file
    session_file = Path(f"{Config.SESSION_NAME}.session")
    print(f"\n📁 Session File Check:")
    print(f"Session file exists: {session_file.exists()}")
    if session_file.exists():
        print(f"Session file size: {session_file.stat().st_size} bytes")
        print(f"Session file path: {session_file.absolute()}")
    
    # Try to connect
    print(f"\n🔗 Connection Test:")
    client = TelegramClient(Config.SESSION_NAME, Config.API_ID, Config.API_HASH)
    
    try:
        print("Attempting to connect...")
        await client.connect()
        print("✅ Connected to Telegram servers")
        
        # Check if we're authorized
        if await client.is_user_authorized():
            print("✅ User is authorized")
            
            # Get user info
            try:
                me = await client.get_me()
                print(f"✅ Logged in as: {me.first_name} {me.last_name or ''}")
                print(f"   Username: @{me.username or 'no username'}")
                print(f"   Phone: {me.phone}")
                print(f"   User ID: {me.id}")
            except Exception as e:
                print(f"❌ Failed to get user info: {e}")
        else:
            print("❌ User is NOT authorized")
            print("🔄 Need to re-authenticate...")
            
            # Try to start authentication
            try:
                print(f"📱 Sending code to {Config.PHONE_NUMBER}...")
                await client.start(phone=Config.PHONE_NUMBER)
                
                # If we get here, authentication was successful
                me = await client.get_me()
                print(f"✅ Authentication successful!")
                print(f"   Logged in as: {me.first_name} {me.last_name or ''}")
                print(f"   Username: @{me.username or 'no username'}")
                print(f"   Phone: {me.phone}")
                
            except SessionPasswordNeededError:
                print("❌ Two-factor authentication is enabled")
                print("   Please disable 2FA temporarily or implement 2FA support")
            except PhoneCodeInvalidError:
                print("❌ Invalid phone code entered")
            except Exception as e:
                print(f"❌ Authentication failed: {e}")
                
    except AuthKeyUnregisteredError:
        print("❌ Session is invalid/expired")
        print("🗑️  Deleting old session file...")
        if session_file.exists():
            session_file.unlink()
            print("✅ Old session deleted")
        
        print("🔄 Please run the script again to create a new session")
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        logger.exception("Detailed error:")
        
    finally:
        await client.disconnect()
        print("\n🔌 Disconnected from Telegram")

def reset_session():
    """Reset session by deleting session file"""
    session_file = Path(f"{Config.SESSION_NAME}.session")
    if session_file.exists():
        session_file.unlink()
        print(f"✅ Deleted session file: {session_file}")
    else:
        print("ℹ️  No session file to delete")

async def main():
    """Main function"""
    print("Choose an option:")
    print("1. Debug authentication")
    print("2. Reset session (delete session file)")
    print("3. Both (reset then debug)")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == "2":
        reset_session()
    elif choice == "3":
        reset_session()
        print("\n" + "="*50)
        await debug_authentication()
    else:
        await debug_authentication()

if __name__ == "__main__":
    asyncio.run(main())
