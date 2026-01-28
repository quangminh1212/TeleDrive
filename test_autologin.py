#!/usr/bin/env python3
"""
Test auto-login functionality
"""

import sys
import os

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from auth import TelegramAuthenticator
import asyncio

async def test_auto_login():
    """Test auto-login"""
    print("=== Testing Auto-Login ===\n")
    
    # Create authenticator
    auth = TelegramAuthenticator()
    
    # Test auto-login
    print("Attempting auto-login from Telegram Desktop...")
    result = await auth.try_auto_login_from_desktop()
    
    print("\n=== Result ===")
    print(f"Success: {result.get('success')}")
    print(f"Message: {result.get('message')}")
    if result.get('hint'):
        print(f"Hint: {result.get('hint')}")
    
    if result.get('success'):
        user = result.get('user', {})
        print(f"\nUser Info:")
        print(f"  - Name: {user.get('first_name')} {user.get('last_name', '')}")
        print(f"  - Phone: {user.get('phone')}")
        print(f"  - Telegram ID: {user.get('telegram_id')}")
    
    return result

if __name__ == '__main__':
    result = asyncio.run(test_auto_login())
    sys.exit(0 if result.get('success') else 1)
