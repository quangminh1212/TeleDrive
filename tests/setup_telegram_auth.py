#!/usr/bin/env python3
"""
Setup script for Telegram authentication
This script helps authenticate TeleDrive with Telegram for storage
"""

import sys
import os
import asyncio
sys.path.append('source')

def check_config():
    """Check if Telegram API is configured"""
    print("🔍 Checking Telegram Configuration")
    print("=" * 40)
    
    try:
        import config
        
        print(f"API_ID: {config.API_ID}")
        print(f"API_HASH: {config.API_HASH[:10]}..." if config.API_HASH else "Not set")
        print(f"PHONE_NUMBER: {config.PHONE_NUMBER}")
        
        if not config.API_ID or not config.API_HASH:
            print("\n❌ Telegram API credentials not configured!")
            print("Please configure the following in source/config.json:")
            print('  "telegram": {')
            print('    "api_id": "YOUR_API_ID",')
            print('    "api_hash": "YOUR_API_HASH",')
            print('    "phone_number": "YOUR_PHONE_NUMBER"')
            print('  }')
            print("\nTo get API credentials:")
            print("1. Go to https://my.telegram.org/apps")
            print("2. Create a new application")
            print("3. Copy API ID and API Hash")
            return False
        
        if not config.PHONE_NUMBER or config.PHONE_NUMBER == '+84xxxxxxxxx':
            print("\n❌ Phone number not configured!")
            print("Please set your phone number in source/config.json")
            return False
        
        print("\n✅ Telegram API credentials configured")
        return True
        
    except Exception as e:
        print(f"❌ Error checking config: {e}")
        return False

def check_session():
    """Check if session file exists"""
    print("\n🔍 Checking Telegram Session")
    print("=" * 40)
    
    try:
        import config
        session_file = f"source/{config.SESSION_NAME}.session"
        
        if os.path.exists(session_file):
            print(f"✅ Session file exists: {session_file}")
            return True
        else:
            print(f"❌ Session file not found: {session_file}")
            return False
    except Exception as e:
        print(f"❌ Error checking session: {e}")
        return False

async def test_connection():
    """Test Telegram connection"""
    print("\n🔍 Testing Telegram Connection")
    print("=" * 40)
    
    try:
        from telegram_auth import TelegramAuthenticator
        
        auth = TelegramAuthenticator()
        if await auth.test_connection():
            print("✅ Telegram connection successful!")
            return True
        else:
            print("❌ Telegram connection failed")
            return False
    except Exception as e:
        print(f"❌ Connection test error: {e}")
        return False

async def authenticate():
    """Run authentication process"""
    print("\n🔐 Starting Telegram Authentication")
    print("=" * 40)
    
    try:
        from telegram_auth import TelegramAuthenticator
        
        auth = TelegramAuthenticator()
        
        # Get phone number from user
        import config
        phone = config.PHONE_NUMBER
        
        print(f"📱 Using phone number from config: {phone}")
        confirm = input("Is this correct? (y/n): ").lower().strip()
        
        if confirm != 'y':
            phone = input("📱 Enter your phone number (with country code, e.g., +1234567890): ")
        
        print(f"\n📱 Authenticating with phone: {phone}")
        print("⚠️ You will receive a verification code on Telegram")
        
        if await auth.authenticate(phone):
            print("🎉 Authentication successful!")
            return True
        else:
            print("❌ Authentication failed")
            return False
            
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return False

def show_next_steps():
    """Show next steps after successful authentication"""
    print("\n🎯 Next Steps")
    print("=" * 40)
    print("1. ✅ Telegram authentication completed")
    print("2. 🚀 Start TeleDrive server: python source/app.py")
    print("3. 🧪 Test Telegram storage: python test_telegram_storage_integration.py")
    print("4. 🌐 Access web interface: http://127.0.0.1:3000")
    print("\n📋 Configuration:")
    print("   - Storage backend: Telegram")
    print("   - Fallback to local: Enabled")
    print("   - Files will be uploaded to your private Telegram channel")

async def main():
    """Main setup function"""
    print("🔧 TeleDrive Telegram Storage Setup")
    print("=" * 50)
    
    # Step 1: Check configuration
    if not check_config():
        return
    
    # Step 2: Check if already authenticated
    if check_session():
        print("\n📱 Session file exists, testing connection...")
        if await test_connection():
            print("\n✅ Already authenticated and working!")
            show_next_steps()
            return
        else:
            print("\n⚠️ Session exists but connection failed")
            print("Removing old session and re-authenticating...")
            try:
                import config
                session_file = f"source/{config.SESSION_NAME}.session"
                if os.path.exists(session_file):
                    os.remove(session_file)
                    print(f"🗑️ Removed old session: {session_file}")
            except Exception as e:
                print(f"⚠️ Could not remove old session: {e}")
    
    # Step 3: Authenticate
    print("\n🔐 Authentication required")
    if await authenticate():
        print("\n✅ Setup completed successfully!")
        show_next_steps()
    else:
        print("\n❌ Setup failed. Please check your configuration and try again.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️ Setup cancelled by user")
    except Exception as e:
        print(f"\n❌ Setup error: {e}")
