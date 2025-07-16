#!/usr/bin/env python3
"""
Test import để tìm lỗi
"""

print("Testing imports...")

try:
    print("1. Testing logger...")
    import logger
    print("✅ Logger OK")
except Exception as e:
    print(f"❌ Logger error: {e}")

try:
    print("2. Testing config...")
    import config
    print("✅ Config OK")
except Exception as e:
    print(f"❌ Config error: {e}")

try:
    print("3. Testing engine...")
    import engine
    print("✅ Engine OK")
except Exception as e:
    print(f"❌ Engine error: {e}")

try:
    print("4. Testing main...")
    import main
    print("✅ Main OK")
except Exception as e:
    print(f"❌ Main error: {e}")

print("Test completed!")
