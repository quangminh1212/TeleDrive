#!/usr/bin/env python3
"""
Test script for TeleDrive login functionality
"""

import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from telethon import TelegramClient
    from config import CONFIG
    print("✅ Telegram modules loaded successfully")
    MODULES_AVAILABLE = True
except ImportError as e:
    print(f"❌ Failed to import modules: {e}")
    MODULES_AVAILABLE = False

async def test_telegram_connection():
    """Test basic Telegram connection"""
    if not MODULES_AVAILABLE:
        print("❌ Cannot test - modules not available")
        return False
    
    try:
        client = TelegramClient(
            CONFIG['telegram']['session_name'],
            CONFIG['telegram']['api_id'],
            CONFIG['telegram']['api_hash']
        )
        
        print("🔗 Connecting to Telegram...")
        await client.connect()
        
        if await client.is_user_authorized():
            me = await client.get_me()
            print(f"✅ Already logged in as: {me.first_name} ({me.phone})")
            await client.disconnect()
            return True
        else:
            print("⚠️ Not logged in - login required")
            await client.disconnect()
            return False
            
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

async def test_send_code(phone_number):
    """Test sending verification code"""
    if not MODULES_AVAILABLE:
        print("❌ Cannot test - modules not available")
        return None
    
    try:
        client = TelegramClient(
            CONFIG['telegram']['session_name'],
            CONFIG['telegram']['api_id'],
            CONFIG['telegram']['api_hash']
        )
        
        await client.connect()
        
        print(f"📱 Sending code to {phone_number}...")
        sent_code = await client.send_code_request(phone_number)
        
        print(f"✅ Code sent! Hash: {sent_code.phone_code_hash[:10]}...")
        
        await client.disconnect()
        return sent_code.phone_code_hash
        
    except Exception as e:
        print(f"❌ Send code failed: {e}")
        return None

def main():
    """Main test function"""
    print("🧪 TeleDrive Login Test")
    print("=" * 40)
    
    # Test 1: Check configuration
    print("\n1. Checking configuration...")
    if not MODULES_AVAILABLE:
        print("❌ Telegram modules not available")
        return
    
    try:
        api_id = CONFIG['telegram']['api_id']
        api_hash = CONFIG['telegram']['api_hash']
        phone = CONFIG['telegram']['phone_number']
        
        print(f"✅ API ID: {api_id}")
        print(f"✅ API Hash: {api_hash[:10]}...")
        print(f"✅ Phone: {phone}")
    except Exception as e:
        print(f"❌ Config error: {e}")
        return
    
    # Test 2: Test connection
    print("\n2. Testing Telegram connection...")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    is_connected = loop.run_until_complete(test_telegram_connection())
    
    if not is_connected:
        print("\n3. Testing code sending...")
        phone_number = CONFIG['telegram']['phone_number']
        
        # Ask user if they want to test sending code
        response = input(f"\nDo you want to test sending code to {phone_number}? (y/N): ")
        
        if response.lower() == 'y':
            code_hash = loop.run_until_complete(test_send_code(phone_number))
            
            if code_hash:
                print("\n✅ Code sending test successful!")
                print("💡 You can now test the login UI")
            else:
                print("\n❌ Code sending test failed")
        else:
            print("\n⏭️ Skipping code sending test")
    
    loop.close()
    
    print("\n" + "=" * 40)
    print("🎯 Test Summary:")
    print("- Configuration: ✅" if MODULES_AVAILABLE else "- Configuration: ❌")
    print("- Connection: ✅" if is_connected else "- Connection: ⚠️")
    print("\n💡 Next steps:")
    print("1. Run: python ui_server.py")
    print("2. Open: http://localhost:5000")
    print("3. Test the login flow")

if __name__ == "__main__":
    main()
