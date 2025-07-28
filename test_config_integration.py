#!/usr/bin/env python3
"""
Test script to verify configuration integration
Tests that all configuration values are properly loaded and accessible
"""

import os
import sys
from pathlib import Path

def test_config_loading():
    """Test that configuration loads correctly"""
    print("🧪 Testing configuration loading...")
    
    try:
        from flask_config import flask_config
        print("✅ Flask config module imported successfully")
        
        # Test basic config loading
        config = flask_config._config
        if config:
            print("✅ Configuration loaded successfully")
            print(f"   Schema version: {config.get('_schema_version', 'N/A')}")
            print(f"   Description: {config.get('_description', 'N/A')}")
        else:
            print("❌ Configuration is empty")
            return False
            
        # Test Flask configuration
        flask_config_dict = flask_config.get_flask_config()
        print("✅ Flask configuration extracted:")
        for key, value in flask_config_dict.items():
            if 'SECRET' in key or 'PASSWORD' in key:
                print(f"   {key}: [HIDDEN]")
            else:
                print(f"   {key}: {value}")
        
        # Test server configuration
        server_config = flask_config.get_server_config()
        print("✅ Server configuration:")
        for key, value in server_config.items():
            print(f"   {key}: {value}")
        
        # Test upload configuration
        upload_config = flask_config.get_upload_config()
        print("✅ Upload configuration:")
        print(f"   Max file size: {upload_config['max_file_size']} bytes")
        print(f"   Upload directory: {upload_config['upload_directory']}")
        print(f"   Allowed extensions: {len(upload_config['allowed_extensions'])} types")
        
        # Test admin configuration
        admin_config = flask_config.get_admin_config()
        print("✅ Admin configuration:")
        print(f"   Username: {admin_config['username']}")
        print(f"   Email: {admin_config['email']}")
        print(f"   Auto-create: {admin_config['auto_create']}")
        
        # Test directories configuration
        directories = flask_config.get_directories()
        print("✅ Directories configuration:")
        for name, path in directories.items():
            exists = "✅" if Path(path).exists() else "⚠️"
            print(f"   {name}: {path} {exists}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing configuration: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_directory_creation():
    """Test that directories can be created"""
    print("\n🧪 Testing directory creation...")
    
    try:
        from flask_config import flask_config
        
        # Test directory creation
        flask_config.create_directories()
        
        # Verify directories exist
        directories = flask_config.get_directories()
        all_exist = True
        
        for name, path in directories.items():
            if Path(path).exists():
                print(f"✅ Directory exists: {path}")
            else:
                print(f"❌ Directory missing: {path}")
                all_exist = False
        
        return all_exist
        
    except Exception as e:
        print(f"❌ Error testing directory creation: {e}")
        return False

def test_config_values():
    """Test specific configuration values"""
    print("\n🧪 Testing specific configuration values...")
    
    try:
        from flask_config import flask_config
        
        # Test dot notation access
        test_cases = [
            ('flask.host', '0.0.0.0'),
            ('flask.port', 3000),
            ('flask.debug', False),
            ('database.url', 'sqlite:///data/teledrive.db'),
            ('upload.max_file_size', 104857600),
            ('admin.username', 'admin'),
            ('directories.output', 'output')
        ]
        
        all_passed = True
        for key, expected in test_cases:
            actual = flask_config.get(key)
            if actual == expected:
                print(f"✅ {key}: {actual}")
            else:
                print(f"❌ {key}: expected {expected}, got {actual}")
                all_passed = False
        
        return all_passed
        
    except Exception as e:
        print(f"❌ Error testing configuration values: {e}")
        return False

def main():
    """Run all configuration tests"""
    print("🔧 TeleDrive Configuration Integration Test")
    print("=" * 50)
    
    tests = [
        ("Configuration Loading", test_config_loading),
        ("Directory Creation", test_directory_creation),
        ("Configuration Values", test_config_values)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        print("-" * 30)
        
        if test_func():
            print(f"✅ {test_name} PASSED")
            passed += 1
        else:
            print(f"❌ {test_name} FAILED")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All configuration tests passed!")
        print("✅ The application should be able to run without manual configuration")
        return True
    else:
        print("⚠️ Some configuration tests failed")
        print("❌ Manual configuration may be required")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
