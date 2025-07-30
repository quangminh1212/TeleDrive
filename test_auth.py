#!/usr/bin/env python3
"""
Test script cho authentication
"""

import sys
import asyncio
from pathlib import Path

# Add source to path
sys.path.append('source')

from engine import TelegramFileScanner

async def test_auth():
    """Test authentication"""
    print("🧪 Testing Telegram authentication...")
    
    try:
        scanner = TelegramFileScanner()
        await scanner.initialize()
        print("✅ Authentication successful!")
        
        # Test basic connection
        me = await scanner.client.get_me()
        print(f"👤 Logged in as: {me.first_name} (@{me.username})")
        
        await scanner.close()
        return True
        
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_auth())
    if success:
        print("🎉 All tests passed!")
    else:
        print("💥 Tests failed!") 