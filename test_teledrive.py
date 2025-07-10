#!/usr/bin/env python3
"""
Test script for TeleDrive functionality
"""

import asyncio
import sys
from pathlib import Path

# Test imports
def test_imports():
    """Test if all required modules can be imported"""
    try:
        import customtkinter
        print("✅ CustomTkinter imported successfully")
    except ImportError as e:
        print(f"❌ CustomTkinter import failed: {e}")
        return False
    
    try:
        import telethon
        print("✅ Telethon imported successfully")
    except ImportError as e:
        print(f"❌ Telethon import failed: {e}")
        return False
    
    try:
        from dotenv import load_dotenv
        print("✅ Python-dotenv imported successfully")
    except ImportError as e:
        print(f"❌ Python-dotenv import failed: {e}")
        return False
    
    try:
        from core import get_teledrive_instance
        print("✅ Core module imported successfully")
    except ImportError as e:
        print(f"❌ Core module import failed: {e}")
        return False
    
    return True

def test_configuration():
    """Test configuration loading"""
    try:
        from dotenv import load_dotenv
        import os
        
        load_dotenv()
        
        api_id = os.getenv('API_ID')
        api_hash = os.getenv('API_HASH')
        phone = os.getenv('PHONE_NUMBER')
        
        if api_id and api_hash and phone:
            print("✅ Configuration loaded successfully")
            print(f"   API_ID: {api_id}")
            print(f"   API_HASH: {api_hash[:10]}...")
            print(f"   PHONE: {phone}")
            return True
        else:
            print("❌ Missing configuration values")
            return False
            
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

async def test_core_instance():
    """Test core TeleDrive instance creation"""
    try:
        from core import get_teledrive_instance

        teledrive = get_teledrive_instance()
        print("✅ TeleDrive core instance created successfully")

        # Test connection attempt (should return needs_login for fresh install)
        result = await teledrive.connect()
        print(f"✅ Connection test result: {result}")

        # Test that the instance has all required methods
        required_methods = [
            'connect', 'disconnect', 'send_code', 'verify_code', 'verify_password',
            'list_files', 'search_files', 'download_file', 'upload_file', 'get_file_info'
        ]

        for method in required_methods:
            if hasattr(teledrive, method):
                print(f"✅ Method '{method}' available")
            else:
                print(f"❌ Method '{method}' missing")
                return False

        return True

    except Exception as e:
        print(f"❌ Core instance test failed: {e}")
        return False

def test_desktop_module():
    """Test desktop module structure"""
    try:
        import desktop

        # Check if main classes exist
        if hasattr(desktop, 'TeleDriveApp'):
            print("✅ TeleDriveApp class found")
        else:
            print("❌ TeleDriveApp class missing")
            return False

        if hasattr(desktop, 'LoginDialog'):
            print("✅ LoginDialog class found")
        else:
            print("❌ LoginDialog class missing")
            return False

        # Check if main function exists
        if hasattr(desktop, 'main'):
            print("✅ Desktop main function found")
        else:
            print("❌ Desktop main function missing")
            return False

        return True

    except Exception as e:
        print(f"❌ Desktop module test failed: {e}")
        return False

def test_cli_module():
    """Test CLI module structure"""
    try:
        import cli

        # Check if main classes exist
        if hasattr(cli, 'TeleDrive'):
            print("✅ CLI TeleDrive class found")
        else:
            print("❌ CLI TeleDrive class missing")
            return False

        # Check if main function exists
        if hasattr(cli, 'main'):
            print("✅ CLI main function found")
        else:
            print("❌ CLI main function missing")
            return False

        return True

    except Exception as e:
        print(f"❌ CLI module test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 TeleDrive Test Suite")
    print("=" * 50)

    # Test imports
    print("\n📦 Testing imports...")
    if not test_imports():
        print("❌ Import tests failed")
        return False

    # Test configuration
    print("\n⚙️  Testing configuration...")
    if not test_configuration():
        print("❌ Configuration tests failed")
        return False

    # Test desktop module
    print("\n🖥️  Testing desktop module...")
    if not test_desktop_module():
        print("❌ Desktop module tests failed")
        return False

    # Test CLI module
    print("\n💻 Testing CLI module...")
    if not test_cli_module():
        print("❌ CLI module tests failed")
        return False

    # Test core functionality
    print("\n🔧 Testing core functionality...")
    try:
        result = asyncio.run(test_core_instance())
        if not result:
            print("❌ Core functionality tests failed")
            return False
    except Exception as e:
        print(f"❌ Core functionality test error: {e}")
        return False

    print("\n✅ All tests passed!")
    print("🎉 TeleDrive is ready to use!")
    print("\n📋 Next steps:")
    print("   1. Run 'python desktop.py' to start the desktop application")
    print("   2. Or use 'python cli.py list @channel' for command-line usage")
    print("   3. The application will prompt for authentication on first use")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
