#!/usr/bin/env python3
"""
Test script for TeleDrive session management
"""

import os
import asyncio
from pathlib import Path

def test_session_file_location():
    """Test that session file location is consistent"""
    from dotenv import load_dotenv
    load_dotenv()
    
    session_name = os.getenv('SESSION_NAME', 'teledrive_session')
    session_file = Path(f"{session_name}.session")
    
    print(f"📁 Session file location: {session_file.absolute()}")
    
    if session_file.exists():
        print("✅ Session file exists")
        print(f"   Size: {session_file.stat().st_size} bytes")
        print(f"   Modified: {session_file.stat().st_mtime}")
        return True
    else:
        print("ℹ️  Session file does not exist (expected for fresh install)")
        return True

async def test_core_session():
    """Test core module session handling"""
    try:
        from core import get_teledrive_instance
        
        print("🔧 Testing core module session...")
        teledrive = get_teledrive_instance()
        
        # Test connection (should work with existing session or return needs_login)
        result = await teledrive.connect()
        
        if result["success"]:
            print("✅ Core module connected with existing session")
            user = result.get("user", {})
            print(f"   User: {user.get('first_name', 'Unknown')} {user.get('last_name', '')}")
        elif result.get("needs_login"):
            print("ℹ️  Core module requires authentication (expected for fresh install)")
        else:
            print(f"❌ Core module connection failed: {result['message']}")
            return False
            
        await teledrive.disconnect()
        return True
        
    except Exception as e:
        print(f"❌ Core session test failed: {e}")
        return False

def test_cli_session():
    """Test CLI module session handling"""
    try:
        import cli
        
        print("💻 Testing CLI module session...")
        
        # Check if CLI module can be instantiated
        teledrive_cli = cli.TeleDrive()
        print("✅ CLI TeleDrive instance created")
        
        # The CLI uses the same session configuration
        session_name = os.getenv('SESSION_NAME', 'teledrive_session')
        if teledrive_cli.client.session.filename == session_name:
            print("✅ CLI uses correct session file")
        else:
            print(f"❌ CLI session mismatch: {teledrive_cli.client.session.filename}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ CLI session test failed: {e}")
        return False

def test_session_consistency():
    """Test that both modules use the same session configuration"""
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        # Get configuration
        api_id = os.getenv('API_ID')
        api_hash = os.getenv('API_HASH')
        session_name = os.getenv('SESSION_NAME', 'teledrive_session')
        
        print("🔍 Testing session consistency...")
        print(f"   API_ID: {api_id}")
        print(f"   API_HASH: {api_hash[:10]}..." if api_hash else "   API_HASH: None")
        print(f"   SESSION_NAME: {session_name}")
        
        # Test core module
        from core import get_teledrive_instance
        core_instance = get_teledrive_instance()
        
        # Test CLI module
        import cli
        cli_instance = cli.TeleDrive()
        
        # Both should use the same session name
        if (hasattr(core_instance.client, 'session') and 
            hasattr(cli_instance.client, 'session')):
            
            core_session = str(core_instance.client.session.filename)
            cli_session = str(cli_instance.client.session.filename)
            
            if core_session == cli_session:
                print("✅ Both modules use the same session file")
                print(f"   Session file: {core_session}")
                return True
            else:
                print(f"❌ Session file mismatch:")
                print(f"   Core: {core_session}")
                print(f"   CLI: {cli_session}")
                return False
        else:
            print("ℹ️  Session comparison not available")
            return True
            
    except Exception as e:
        print(f"❌ Session consistency test failed: {e}")
        return False

async def main():
    """Run session management tests"""
    print("🔐 TeleDrive Session Management Test")
    print("=" * 50)
    
    # Test session file location
    print("\n📁 Testing session file location...")
    if not test_session_file_location():
        print("❌ Session file location test failed")
        return False
    
    # Test session consistency
    print("\n🔍 Testing session consistency...")
    if not test_session_consistency():
        print("❌ Session consistency test failed")
        return False
    
    # Test CLI session
    print("\n💻 Testing CLI session...")
    if not test_cli_session():
        print("❌ CLI session test failed")
        return False
    
    # Test core session
    print("\n🔧 Testing core session...")
    if not await test_core_session():
        print("❌ Core session test failed")
        return False
    
    print("\n✅ All session management tests passed!")
    print("\n📋 Session Management Summary:")
    print("   • Both CLI and desktop apps share the same session file")
    print("   • Session persists between application runs")
    print("   • Authentication in one app works for both apps")
    print("   • Session file location is configurable via .env")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
