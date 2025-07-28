#!/usr/bin/env python3
"""
Test script to verify TeleDrive configuration
"""

import os
import json
from config_manager import ConfigManager

def test_configuration():
    """Test all configuration aspects"""
    print("🔍 KIỂM TRA CẤU HÌNH TELEDRIVE")
    print("="*50)
    
    # Test 1: Check config.json exists and is valid
    print("\n1. Kiểm tra config.json...")
    if os.path.exists('config.json'):
        try:
            with open('config.json', 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            api_id = config.get('telegram', {}).get('api_id', '')
            api_hash = config.get('telegram', {}).get('api_hash', '')
            phone = config.get('telegram', {}).get('phone_number', '')
            
            print(f"   ✅ config.json tồn tại và hợp lệ")
            print(f"   📱 API ID: {api_id}")
            print(f"   🔑 API Hash: {api_hash[:10]}..." if api_hash else "   🔑 API Hash: (trống)")
            print(f"   📞 Phone: {phone}")
            
            config_valid = bool(api_id and api_hash and phone and phone != '+84xxxxxxxxx')
            print(f"   {'✅' if config_valid else '❌'} Cấu hình config.json: {'Hợp lệ' if config_valid else 'Không hợp lệ'}")
            
        except Exception as e:
            print(f"   ❌ Lỗi đọc config.json: {e}")
            config_valid = False
    else:
        print("   ❌ config.json không tồn tại")
        config_valid = False
    
    # Test 2: Check .env file
    print("\n2. Kiểm tra .env...")
    if os.path.exists('.env'):
        try:
            from dotenv import load_dotenv
            load_dotenv()
            
            api_id_env = os.getenv('TELEGRAM_API_ID', '')
            api_hash_env = os.getenv('TELEGRAM_API_HASH', '')
            phone_env = os.getenv('TELEGRAM_PHONE', '')
            
            print(f"   ✅ .env tồn tại")
            print(f"   📱 API ID: {api_id_env}")
            print(f"   🔑 API Hash: {api_hash_env[:10]}..." if api_hash_env else "   🔑 API Hash: (trống)")
            print(f"   📞 Phone: {phone_env}")
            
            env_valid = bool(api_id_env and api_hash_env and phone_env and phone_env != '+84xxxxxxxxx')
            print(f"   {'✅' if env_valid else '❌'} Cấu hình .env: {'Hợp lệ' if env_valid else 'Không hợp lệ'}")
            
        except Exception as e:
            print(f"   ❌ Lỗi đọc .env: {e}")
            env_valid = False
    else:
        print("   ❌ .env không tồn tại")
        env_valid = False
    
    # Test 3: Test config.py module loading
    print("\n3. Kiểm tra config.py module...")
    try:
        import config
        api_id_module = getattr(config, 'API_ID', '')
        api_hash_module = getattr(config, 'API_HASH', '')
        phone_module = getattr(config, 'PHONE_NUMBER', '')
        
        print(f"   ✅ config.py module loaded")
        print(f"   📱 API ID: {api_id_module}")
        print(f"   🔑 API Hash: {api_hash_module[:10]}..." if api_hash_module else "   🔑 API Hash: (trống)")
        print(f"   📞 Phone: {phone_module}")
        
        module_valid = bool(api_id_module and api_hash_module and phone_module and phone_module != '+84xxxxxxxxx')
        print(f"   {'✅' if module_valid else '❌'} Cấu hình module: {'Hợp lệ' if module_valid else 'Không hợp lệ'}")
        
    except Exception as e:
        print(f"   ❌ Lỗi load config.py: {e}")
        module_valid = False
    
    # Test 4: Test ConfigManager validation
    print("\n4. Kiểm tra ConfigManager...")
    try:
        cm = ConfigManager()
        manager_valid = cm.validate_configuration()
        print(f"   {'✅' if manager_valid else '❌'} ConfigManager validation: {'Hợp lệ' if manager_valid else 'Không hợp lệ'}")
    except Exception as e:
        print(f"   ❌ Lỗi ConfigManager: {e}")
        manager_valid = False
    
    # Summary
    print("\n" + "="*50)
    print("📊 TÓM TẮT KẾT QUẢ:")
    print(f"   config.json: {'✅ Hợp lệ' if config_valid else '❌ Không hợp lệ'}")
    print(f"   .env file: {'✅ Hợp lệ' if env_valid else '❌ Không hợp lệ'}")
    print(f"   config.py module: {'✅ Hợp lệ' if module_valid else '❌ Không hợp lệ'}")
    print(f"   ConfigManager: {'✅ Hợp lệ' if manager_valid else '❌ Không hợp lệ'}")
    
    overall_valid = config_valid and env_valid and module_valid and manager_valid
    print(f"\n🎯 KẾT LUẬN: {'✅ TẤT CẢ CẤU HÌNH HỢP LỆ!' if overall_valid else '❌ CÓ VẤN ĐỀ VỚI CẤU HÌNH!'}")
    
    if overall_valid:
        print("\n💡 Bạn có thể chạy run.bat mà không cần cấu hình thêm!")
    else:
        print("\n🔧 Vui lòng kiểm tra và sửa các vấn đề trên trước khi chạy run.bat")
    
    return overall_valid

if __name__ == "__main__":
    test_configuration()
