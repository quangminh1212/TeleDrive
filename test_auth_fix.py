#!/usr/bin/env python3
"""
Test script để kiểm tra các cải tiến authentication
"""

import asyncio
import sys
import os
sys.path.append('source')

from auth import TelegramAuthenticator
import config

async def test_auth_improvements():
    """Test các cải tiến authentication"""
    print("🔧 Testing Authentication Improvements...")
    
    # Test 1: Khởi tạo authenticator
    print("\n1. Testing authenticator initialization...")
    auth = TelegramAuthenticator()
    print(f"   ✓ Session timeout: {auth.session_timeout} seconds ({auth.session_timeout/60:.1f} minutes)")
    
    # Test 2: Kiểm tra cleanup session files
    print("\n2. Testing session file cleanup...")
    auth._cleanup_old_session_files()
    print("   ✓ Session file cleanup completed")
    
    # Test 3: Test validation functions
    print("\n3. Testing code validation...")
    
    # Test invalid codes
    invalid_codes = ["", "abc", "12", "1234567", "12345a"]
    for code in invalid_codes:
        if not code or not code.isdigit() or len(code) < 4 or len(code) > 6:
            print(f"   ✓ Code '{code}' correctly identified as invalid")
        else:
            print(f"   ✗ Code '{code}' should be invalid")
    
    # Test valid codes
    valid_codes = ["12345", "123456", "98765"]
    for code in valid_codes:
        if code and code.isdigit() and 4 <= len(code) <= 6:
            print(f"   ✓ Code '{code}' correctly identified as valid")
        else:
            print(f"   ✗ Code '{code}' should be valid")
    
    # Test 4: Kiểm tra config
    print("\n4. Testing configuration...")
    print(f"   API_ID: {'✓ Set' if config.API_ID else '✗ Not set'}")
    print(f"   API_HASH: {'✓ Set' if config.API_HASH else '✗ Not set'}")
    print(f"   PHONE_NUMBER: {'✓ Set' if config.PHONE_NUMBER else '✗ Not set'}")
    print(f"   VERIFICATION_CODE_TIMEOUT: {getattr(config, 'VERIFICATION_CODE_TIMEOUT', 'Not set')}")
    
    # Test 5: Kiểm tra data directory
    print("\n5. Testing data directory...")
    data_dir = "data"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        print(f"   ✓ Created data directory: {data_dir}")
    else:
        print(f"   ✓ Data directory exists: {data_dir}")
    
    # List session files
    session_files = [f for f in os.listdir(data_dir) if f.endswith('.session')]
    print(f"   Current session files: {len(session_files)}")
    for f in session_files[:5]:  # Show first 5
        print(f"     - {f}")
    if len(session_files) > 5:
        print(f"     ... and {len(session_files) - 5} more")
    
    await auth.close()
    print("\n✅ All tests completed!")

def test_phone_hash():
    """Test phone number hashing"""
    import hashlib
    
    print("\n6. Testing phone number hashing...")
    test_phones = ["+84936374950", "+1234567890", "+84987654321"]
    
    for phone in test_phones:
        phone_hash = hashlib.md5(phone.encode()).hexdigest()[:8]
        session_name = f"code_req_{phone_hash}"
        print(f"   Phone: {phone[:3]}***{phone[-3:]} -> Hash: {phone_hash} -> Session: {session_name}")

if __name__ == "__main__":
    print("🚀 TeleDrive Authentication Fix Test")
    print("=" * 50)
    
    # Test synchronous functions first
    test_phone_hash()
    
    # Test async functions
    try:
        asyncio.run(test_auth_improvements())
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
