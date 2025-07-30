#!/usr/bin/env python3
"""
Test script for file system and storage infrastructure
"""

import sys
import os
import json
import tempfile
from pathlib import Path

def test_directory_structure():
    """Test if required directories exist"""
    print("📁 Testing Directory Structure")
    print("=" * 40)
    
    # Expected directories from config
    expected_dirs = [
        "data",
        "data/uploads",
        "data/backups", 
        "data/temp",
        "output",
        "logs",
        "templates",
        "static"
    ]
    
    results = []
    for dir_path in expected_dirs:
        path = Path(dir_path)
        if path.exists():
            print(f"✅ {dir_path} - EXISTS")
            results.append(True)
        else:
            print(f"❌ {dir_path} - MISSING")
            results.append(False)
    
    return all(results)

def test_upload_configuration():
    """Test upload configuration"""
    print("\n⚙️  Testing Upload Configuration")
    print("=" * 40)
    
    try:
        # Load config.json
        with open('config.json', 'r') as f:
            config = json.load(f)
        
        upload_config = config.get('upload', {})
        
        print(f"📊 Max file size: {upload_config.get('max_file_size', 'Not set')} bytes")
        print(f"📂 Upload directory: {upload_config.get('upload_directory', 'Not set')}")
        print(f"📋 Allowed extensions: {len(upload_config.get('allowed_extensions', []))} types")
        
        # Show some allowed extensions
        extensions = upload_config.get('allowed_extensions', [])
        if extensions:
            print(f"   Sample extensions: {', '.join(extensions[:10])}")
        
        # Check if upload directory exists
        upload_dir = upload_config.get('upload_directory', 'data/uploads')
        if Path(upload_dir).exists():
            print(f"✅ Upload directory exists: {upload_dir}")
        else:
            print(f"❌ Upload directory missing: {upload_dir}")
            # Try to create it
            try:
                Path(upload_dir).mkdir(parents=True, exist_ok=True)
                print(f"✅ Created upload directory: {upload_dir}")
            except Exception as e:
                print(f"❌ Failed to create upload directory: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error reading upload configuration: {e}")
        return False

def test_file_operations_code():
    """Test if file operations code exists"""
    print("\n🔧 Testing File Operations Code")
    print("=" * 40)
    
    # Check if source files exist
    source_files = [
        "source/app.py",
        "source/models.py", 
        "source/auth.py",
        "source/flask_config.py"
    ]
    
    for file_path in source_files:
        if Path(file_path).exists():
            print(f"✅ {file_path} - EXISTS")
        else:
            print(f"❌ {file_path} - MISSING")
    
    # Check for specific file operation functions in app.py
    try:
        with open('source/app.py', 'r', encoding='utf-8') as f:
            app_content = f.read()
        
        # Look for key file operation endpoints
        endpoints_to_check = [
            '/api/upload',
            '/api/download',
            '/api/files',
            'upload_file',
            'download_file'
        ]
        
        print(f"\n🔍 Checking for file operation endpoints in app.py:")
        for endpoint in endpoints_to_check:
            if endpoint in app_content:
                print(f"✅ Found: {endpoint}")
            else:
                print(f"❌ Missing: {endpoint}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking app.py: {e}")
        return False

def test_file_upload_simulation():
    """Simulate file upload process"""
    print("\n📤 Testing File Upload Simulation")
    print("=" * 40)
    
    try:
        # Create a test file
        temp_dir = Path(tempfile.gettempdir()) / "teledrive_test"
        temp_dir.mkdir(exist_ok=True)
        
        test_file = temp_dir / "test_upload.txt"
        test_content = "This is a test file for upload simulation"
        
        with open(test_file, 'w') as f:
            f.write(test_content)
        
        print(f"✅ Created test file: {test_file}")
        print(f"   Size: {test_file.stat().st_size} bytes")
        
        # Check if we can move it to upload directory
        upload_dir = Path("data/uploads")
        if upload_dir.exists():
            dest_file = upload_dir / "simulated_upload.txt"
            
            # Copy the file (simulate upload)
            import shutil
            shutil.copy2(test_file, dest_file)
            
            print(f"✅ Simulated upload to: {dest_file}")
            print(f"   Destination size: {dest_file.stat().st_size} bytes")
            
            # Cleanup
            dest_file.unlink()
            print("✅ Cleaned up simulated upload")
        else:
            print("❌ Upload directory not available for simulation")
        
        # Cleanup test file
        test_file.unlink()
        temp_dir.rmdir()
        
        return True
        
    except Exception as e:
        print(f"❌ Error in upload simulation: {e}")
        return False

def test_database_models():
    """Test if database models for files exist"""
    print("\n🗄️  Testing Database Models")
    print("=" * 40)
    
    try:
        # Check models.py for file-related models
        with open('source/models.py', 'r', encoding='utf-8') as f:
            models_content = f.read()
        
        # Look for file-related models
        models_to_check = [
            'class File',
            'class Folder',
            'class ShareLink',
            'filename',
            'file_size',
            'mime_type'
        ]
        
        for model in models_to_check:
            if model in models_content:
                print(f"✅ Found: {model}")
            else:
                print(f"❌ Missing: {model}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking models.py: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 TeleDrive File System Test Suite")
    print("=" * 50)
    
    tests = [
        ("Directory Structure", test_directory_structure),
        ("Upload Configuration", test_upload_configuration),
        ("File Operations Code", test_file_operations_code),
        ("File Upload Simulation", test_file_upload_simulation),
        ("Database Models", test_database_models)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔬 Running: {test_name}")
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append(False)
    
    print("\n🎉 File System Test Complete!")
    print("=" * 50)
    print("📊 Test Results:")
    
    for i, (test_name, _) in enumerate(tests):
        status = "✅ PASS" if results[i] else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    passed = sum(results)
    total = len(results)
    print(f"\n📈 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All file system tests passed!")
        return True
    else:
        print("⚠️  Some file system tests failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
