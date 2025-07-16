#!/usr/bin/env python3
"""
Manual test để simulate run.bat
"""

print("🚀 MANUAL RUN.BAT SIMULATION")
print("=" * 50)

# Simulate run.bat steps
print("\n[BUOC 1/6] Kiem tra file cau hinh .env...")
import os
if os.path.exists('.env'):
    print("✅ File .env da duoc cau hinh hop le")
else:
    print("❌ Khong tim thay file .env")

print("\n[BUOC 2/6] Kiem tra Python...")
import sys
print(f"✅ Python {sys.version.split()[0]} da san sang")

print("\n[BUOC 3/6] Dong bo va kiem tra cau hinh chi tiet...")
try:
    from config import config_manager
    config_manager.update_from_env()
    print("✅ Dong bo thanh cong")
    
    result = config_manager.validate_configuration()
    print('✅ Cau hinh hop le' if result else '❌ Cau hinh khong hop le')
except Exception as e:
    print(f"❌ Loi: {e}")

print("\n[BUOC 4/6] Kiem tra dependencies...")
try:
    import telethon, pandas, tqdm, aiofiles
    print('✅ Tat ca dependencies da san sang')
except Exception as e:
    print(f"❌ Thieu dependencies: {e}")

print("\n[BUOC 5/6] Khoi tao he thong logging...")
try:
    from logger import setup_detailed_logging
    import json
    config = json.load(open('config.json', 'r', encoding='utf-8'))
    setup_detailed_logging(config.get('logging', {}))
    print('✅ He thong logging da san sang')
except Exception as e:
    print(f"⚠️ Khong the khoi tao logging: {e}")

print("\n[BUOC 6/6] Khoi dong Telegram File Scanner...")
print("=" * 50)
print("🚀 DANG KHOI DONG SCANNER...")
print("=" * 50)

print("\n📋 Ho tro cac format channel:")
print("   • https://t.me/joinchat/xxxxx  (invite link cu)")
print("   • https://t.me/+xxxxx          (invite link moi)")
print("   • @privatechannel              (neu da join)")

print("\n📁 Ket qua se duoc luu trong thu muc 'output/'")
print("📊 Log chi tiet se duoc luu trong thu muc 'logs/'")

print("\n🎯 Ready to run main.py!")
print("📝 You can now run: py main.py")

# Test main.py import
try:
    import main
    print("✅ main.py imported successfully - ready to run!")
except Exception as e:
    print(f"❌ Error importing main.py: {e}")

print("\n🎉 SIMULATION COMPLETE!")
print("=" * 50)
