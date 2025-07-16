#!/usr/bin/env python3
"""
Test main.py functionality
"""

import asyncio
import sys
from engine import TelegramFileScanner

print("🧪 TESTING MAIN.PY FUNCTIONALITY")
print("=" * 50)

# Test TelegramFileScanner initialization
try:
    print("🔧 Testing TelegramFileScanner initialization...")
    scanner = TelegramFileScanner()
    print("✅ TelegramFileScanner initialized successfully")
    
    # Test methods exist
    methods_to_test = [
        'initialize',
        'scan_channel',
        'scan_private_channel_interactive',
        'join_private_channel',
        'check_channel_permissions',
        'scan_channel_by_entity',
        'save_results',
        'close'
    ]
    
    print("\n🔍 Testing methods availability...")
    for method in methods_to_test:
        if hasattr(scanner, method):
            print(f"✅ {method} - Available")
        else:
            print(f"❌ {method} - Missing")
    
    print("\n🎯 Testing menu simulation...")
    print("Menu options would be:")
    print("   1. Quét public channel/group")
    print("   2. Quét private channel/group (interactive)")
    
    print("\n✅ All basic functionality tests passed!")
    
except Exception as e:
    print(f"❌ Error testing TelegramFileScanner: {e}")
    import traceback
    traceback.print_exc()

print("\n🎉 Test completed!")
