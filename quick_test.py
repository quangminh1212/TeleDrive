#!/usr/bin/env python3
"""
Quick test để kiểm tra main.py có lỗi gì không
"""

print("Testing main.py functionality...")

try:
    # Import main module
    import main
    print("✅ Main module imported successfully")
    
    # Test TelegramFileScanner import
    from engine import TelegramFileScanner
    scanner = TelegramFileScanner()
    print("✅ TelegramFileScanner created successfully")
    
    # Test config
    import config
    print("✅ Config loaded successfully")
    
    # Test logger
    import logger
    print("✅ Logger loaded successfully")
    
    print("\n🎉 All imports and basic initialization successful!")
    print("📝 Main.py should work correctly when run interactively")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
