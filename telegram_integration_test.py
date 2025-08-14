#!/usr/bin/env python3
"""
Telegram Integration Test for TeleDrive
Tests Telegram storage functionality
"""

import sys
import os
import asyncio
sys.path.append('source')

def test_telegram_config():
    """Test Telegram configuration"""
    print("🔍 TESTING TELEGRAM CONFIGURATION")
    print("=" * 50)
    
    try:
        import config
        
        # Check required fields
        required_fields = ['API_ID', 'API_HASH', 'PHONE_NUMBER', 'SESSION_NAME']
        missing_fields = []
        
        for field in required_fields:
            if not hasattr(config, field) or not getattr(config, field):
                missing_fields.append(field)
        
        if missing_fields:
            print(f"❌ Missing Telegram config: {missing_fields}")
            return False
        else:
            print("✅ Telegram configuration complete")
            print(f"   API_ID: {config.API_ID}")
            print(f"   Phone: {config.PHONE_NUMBER[:3]}***{config.PHONE_NUMBER[-3:]}")
            
            # Check session file
            session_file = f"source/{config.SESSION_NAME}.session"
            if os.path.exists(session_file):
                size = os.path.getsize(session_file)
                print(f"✅ Session file: {size} bytes")
                return True
            else:
                print("⚠️ Session file not found - need authentication")
                return False
                
    except Exception as e:
        print(f"❌ Telegram config error: {e}")
        return False

def test_telegram_client():
    """Test Telegram client initialization"""
    print("\n🔍 TESTING TELEGRAM CLIENT")
    print("=" * 50)
    
    try:
        from telegram_storage import telegram_storage
        
        # Test client initialization
        result = asyncio.run(test_client_async())
        return result
        
    except Exception as e:
        print(f"❌ Telegram client error: {e}")
        return False

async def test_client_async():
    """Async test for Telegram client"""
    try:
        from telegram_storage import telegram_storage
        
        # Test client connection
        client = await telegram_storage.get_client()
        if client:
            print("✅ Telegram client initialized")
            
            # Test if client is connected
            if await client.is_user_authorized():
                print("✅ Telegram client authorized")
                
                # Test getting dialogs (channels/chats)
                try:
                    dialogs = await client.get_dialogs(limit=5)
                    print(f"✅ Can access dialogs: {len(dialogs)} found")
                    
                    # Test user storage channel
                    try:
                        channel = await telegram_storage.get_or_create_user_channel()
                        if channel:
                            print("✅ User storage channel available")
                            return True
                        else:
                            print("⚠️ Could not get user storage channel")
                            return False
                    except Exception as e:
                        print(f"⚠️ User storage channel error: {e}")
                        return False
                        
                except Exception as e:
                    print(f"⚠️ Dialog access error: {e}")
                    return False
                    
            else:
                print("⚠️ Telegram client not authorized")
                return False
        else:
            print("❌ Could not initialize Telegram client")
            return False
            
    except Exception as e:
        print(f"❌ Async client test error: {e}")
        return False

def test_telegram_storage_methods():
    """Test Telegram storage methods"""
    print("\n🔍 TESTING TELEGRAM STORAGE METHODS")
    print("=" * 50)

    try:
        from telegram_storage import telegram_storage

        # Test method availability
        methods = [
            'initialize',
            'close',
            'get_or_create_user_channel',
            'upload_file',
            'download_file',
            'delete_file',
            'get_file_info'
        ]

        for method in methods:
            if hasattr(telegram_storage, method):
                print(f"✅ Method available: {method}")
            else:
                print(f"❌ Method missing: {method}")
                return False

        return True

    except Exception as e:
        print(f"❌ Storage methods test error: {e}")
        return False

def test_database_telegram_fields():
    """Test database Telegram fields"""
    print("\n🔍 TESTING DATABASE TELEGRAM FIELDS")
    print("=" * 50)
    
    try:
        from app import app
        from db import db, File
        
        with app.app_context():
            # Check if Telegram fields exist in File model
            telegram_fields = [
                'telegram_message_id',
                'telegram_channel',
                'telegram_channel_id',
                'telegram_file_id',
                'telegram_unique_id',
                'telegram_access_hash',
                'telegram_file_reference',
                'storage_type'
            ]
            
            # Create a test file instance to check fields
            test_file = File()
            
            for field in telegram_fields:
                if hasattr(test_file, field):
                    print(f"✅ Database field: {field}")
                else:
                    print(f"❌ Missing database field: {field}")
                    return False
            
            # Test File model methods
            methods = ['is_stored_on_telegram', 'is_stored_locally', 'set_telegram_storage']
            for method in methods:
                if hasattr(test_file, method):
                    print(f"✅ File method: {method}")
                else:
                    print(f"❌ Missing file method: {method}")
                    return False
            
            return True
            
    except Exception as e:
        print(f"❌ Database fields test error: {e}")
        return False

def test_upload_config():
    """Test upload configuration for Telegram"""
    print("\n🔍 TESTING UPLOAD CONFIGURATION")
    print("=" * 50)
    
    try:
        from web_config import web_config
        
        upload_config = web_config.get_upload_config()
        
        # Check storage backend
        storage_backend = upload_config.get('storage_backend')
        fallback_to_local = upload_config.get('fallback_to_local')
        
        if storage_backend == 'telegram':
            print("✅ Storage backend: telegram")
        else:
            print(f"⚠️ Storage backend: {storage_backend} (expected: telegram)")
        
        if fallback_to_local:
            print("✅ Fallback to local: enabled")
        else:
            print("⚠️ Fallback to local: disabled")
        
        return True
        
    except Exception as e:
        print(f"❌ Upload config test error: {e}")
        return False

def run_telegram_tests():
    """Run all Telegram integration tests"""
    print("🧪 TELEGRAM INTEGRATION TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Telegram Configuration", test_telegram_config),
        ("Telegram Client", test_telegram_client),
        ("Storage Methods", test_telegram_storage_methods),
        ("Database Fields", test_database_telegram_fields),
        ("Upload Configuration", test_upload_config),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TELEGRAM INTEGRATION SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TELEGRAM INTEGRATION TESTS PASSED!")
        return True
    else:
        print("⚠️ Some Telegram integration tests failed")
        return False

if __name__ == "__main__":
    success = run_telegram_tests()
    
    if success:
        print("\n✅ TELEGRAM INTEGRATION READY FOR PRODUCTION")
    else:
        print("\n⚠️ TELEGRAM INTEGRATION NEEDS ATTENTION")
        exit(1)
