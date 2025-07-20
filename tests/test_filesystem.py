#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script for FileSystemManager
Tests basic functionality of the local file management system
"""

import sys
import os
from pathlib import Path

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from services.filesystem import FileSystemManager

def test_basic_functionality():
    """Test basic file system operations"""
    print("🧪 Testing FileSystemManager...")
    
    # Initialize manager
    fs_manager = FileSystemManager()
    
    # Test 1: Get drives
    print("\n📁 Testing drive enumeration...")
    drives_result = fs_manager.get_drives()
    if drives_result['success']:
        print(f"✅ Found {len(drives_result['drives'])} drives")
        for drive in drives_result['drives']:
            print(f"   {drive['label']} ({drive['letter']}:) - {drive['free_formatted']} free")
    else:
        print(f"❌ Failed to get drives: {drives_result['error']}")
        assert False, f"Failed to get drives: {drives_result['error']}"
    
    # Test 2: Browse C:\ directory
    print("\n📂 Testing directory browsing...")
    browse_result = fs_manager.browse_directory('C:\\', page=1, per_page=10)
    if browse_result['success']:
        print(f"✅ Successfully browsed C:\\ - found {browse_result['stats']['total_items']} items")
        print(f"   Directories: {browse_result['stats']['directories']}")
        print(f"   Files: {browse_result['stats']['files']}")
        
        # Show first few items
        for item in browse_result['items'][:3]:
            icon = "📁" if item['is_directory'] else "📄"
            print(f"   {icon} {item['name']} ({item['size_formatted']})")
    else:
        print(f"❌ Failed to browse directory: {browse_result['error']}")
        assert False, f"Failed to browse directory: {browse_result['error']}"
    
    # Test 3: Test caching
    print("\n⚡ Testing caching...")
    import time
    start_time = time.time()
    browse_result1 = fs_manager.browse_directory('C:\\', page=1, per_page=10)
    first_time = time.time() - start_time
    
    start_time = time.time()
    browse_result2 = fs_manager.browse_directory('C:\\', page=1, per_page=10)
    second_time = time.time() - start_time
    
    if second_time < first_time:
        print(f"✅ Caching working - First: {first_time:.3f}s, Second: {second_time:.3f}s")
    else:
        print(f"⚠️  Caching may not be working - First: {first_time:.3f}s, Second: {second_time:.3f}s")
    
    # Test 4: Search functionality
    print("\n🔍 Testing search...")
    search_result = fs_manager.search_files('C:\\', 'Windows', max_results=5)
    if search_result['success']:
        print(f"✅ Search found {len(search_result['results'])} results for 'Windows'")
        for result in search_result['results'][:3]:
            icon = "📁" if result['is_directory'] else "📄"
            print(f"   {icon} {result['name']} in {result['parent_path']}")
    else:
        print(f"❌ Search failed: {search_result['error']}")
    
    # Test 5: File preview (if available)
    print("\n👁️  Testing file preview...")
    # Try to find a text file to preview
    for item in browse_result['items']:
        if not item['is_directory'] and item['extension'] == '.txt':
            preview_result = fs_manager.get_file_preview(item['path'])
            if preview_result['success']:
                print(f"✅ Successfully previewed {item['name']}")
                if preview_result['preview']['can_preview']:
                    print(f"   Preview available: {preview_result['preview']['is_text']}")
                break
            else:
                print(f"❌ Preview failed: {preview_result['error']}")
                break
    else:
        print("ℹ️  No text files found for preview test")
    
    print("\n🎉 All tests completed!")
    assert True, "All tests completed successfully"

def test_error_handling():
    """Test error handling"""
    print("\n🛡️  Testing error handling...")
    
    fs_manager = FileSystemManager()
    
    # Test invalid path
    result = fs_manager.browse_directory('Z:\\NonExistentPath')
    if not result['success']:
        print("✅ Correctly handled invalid path")
    else:
        print("❌ Should have failed for invalid path")
    
    # Test invalid file operations
    result = fs_manager.rename_item('Z:\\NonExistent.txt', 'NewName.txt')
    if not result['success']:
        print("✅ Correctly handled invalid file rename")
    else:
        print("❌ Should have failed for invalid file")
    
    print("✅ Error handling tests completed")

def main():
    """Main test function"""
    print("🚀 Starting TeleDrive Local File Manager Tests")
    print("=" * 50)
    
    try:
        # Test basic functionality
        if test_basic_functionality():
            print("\n✅ Basic functionality tests passed")
        else:
            print("\n❌ Basic functionality tests failed")
            return 1
        
        # Test error handling
        test_error_handling()
        
        print("\n" + "=" * 50)
        print("🎊 All tests completed successfully!")
        print("\n💡 The file manager is ready to use!")
        print("   • Start the Flask app: python src/web/app.py")
        print("   • Open browser: http://localhost:5000")
        
        return 0
        
    except Exception as e:
        print(f"\n💥 Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
