#!/usr/bin/env python3
"""
Test các bước trong run.bat
"""

print("🧪 TESTING RUN.BAT STEPS")
print("=" * 50)

# Test 1: Config sync
print("\n1. Testing config sync...")
try:
    from config import config_manager
    config_manager.update_from_env()
    print("✅ Dong bo thanh cong")
except Exception as e:
    print(f"❌ Loi dong bo cau hinh: {e}")

# Test 2: Config validation
print("\n2. Testing config validation...")
try:
    from config import config_manager
    result = config_manager.validate_configuration()
    print('✅ Cau hinh hop le' if result else '❌ Cau hinh khong hop le')
except Exception as e:
    print(f"❌ Loi validation: {e}")

# Test 3: Dependencies check
print("\n3. Testing dependencies...")
try:
    import telethon, pandas, tqdm, aiofiles
    print('✅ Tat ca dependencies da san sang')
except Exception as e:
    print(f"❌ Thieu dependencies: {e}")

# Test 4: Logging setup
print("\n4. Testing logging setup...")
try:
    from logger import setup_detailed_logging
    import json
    config = json.load(open('config.json', 'r', encoding='utf-8'))
    setup_detailed_logging(config.get('logging', {}))
    print('✅ He thong logging da san sang')
except Exception as e:
    print(f"❌ Loi logging: {e}")

# Test 5: Main.py import
print("\n5. Testing main.py...")
try:
    import main
    print('✅ Main.py ready to run')
except Exception as e:
    print(f"❌ Loi main.py: {e}")

print("\n🎉 All run.bat steps tested!")
print("📝 run.bat should work correctly now")
