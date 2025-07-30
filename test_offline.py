#!/usr/bin/env python3
"""
Test script cho offline mode
"""

import sys
import asyncio
from pathlib import Path

# Add source to path
sys.path.append('source')

from engine import TelegramFileScanner

async def test_offline_mode():
    """Test offline mode"""
    print("🧪 Testing offline mode...")
    
    try:
        # Test offline mode
        scanner = TelegramFileScanner(offline_mode=True)
        await scanner.initialize()
        print("✅ Offline mode initialized successfully!")
        
        # Test file operations
        print("📁 Testing file management features...")
        
        # Test directory creation
        test_dir = Path("test_output")
        test_dir.mkdir(exist_ok=True)
        print(f"✅ Created test directory: {test_dir}")
        
        # Test file operations
        test_file = test_dir / "test.txt"
        test_file.write_text("Test content")
        print(f"✅ Created test file: {test_file}")
        
        # Test file reading
        content = test_file.read_text()
        print(f"✅ Read file content: {content}")
        
        # Cleanup
        test_file.unlink()
        test_dir.rmdir()
        print("✅ Cleanup completed")
        
        return True
        
    except Exception as e:
        print(f"❌ Offline mode test failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_offline_mode())
    if success:
        print("🎉 Offline mode tests passed!")
    else:
        print("💥 Offline mode tests failed!") 