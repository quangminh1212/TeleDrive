#!/usr/bin/env python3
"""
Test script for file operations functionality
"""

import sys
import os
import tempfile
import requests
from pathlib import Path
import json
import time

def create_test_files():
    """Create test files for upload testing"""
    test_files = []
    temp_dir = Path(tempfile.gettempdir()) / "teledrive_test"
    temp_dir.mkdir(exist_ok=True)
    
    # Create different types of test files
    files_to_create = [
        ("test_document.txt", "This is a test document for TeleDrive upload testing.\nLine 2\nLine 3"),
        ("test_data.json", '{"test": "data", "number": 123, "array": [1, 2, 3]}'),
        ("test_config.csv", "name,value,type\ntest1,123,number\ntest2,hello,string"),
    ]
    
    for filename, content in files_to_create:
        file_path = temp_dir / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        test_files.append(file_path)
        print(f"✅ Created test file: {file_path}")
    
    return test_files, temp_dir

def test_server_connection(base_url="http://localhost:3000"):
    """Test if the server is running and accessible"""
    print(f"🌐 Testing server connection to {base_url}")
    try:
        response = requests.get(f"{base_url}/test", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running and accessible")
            return True
        else:
            print(f"⚠️  Server responded with status: {response.status_code}")
            return True  # Server is running but might not have /test endpoint
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running or not accessible")
        return False
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
        return False

def test_file_upload(base_url="http://localhost:3000"):
    """Test file upload functionality"""
    print("\n📤 Testing File Upload Functionality")
    print("=" * 40)
    
    # Create test files
    test_files, temp_dir = create_test_files()
    
    # Test upload endpoint
    upload_url = f"{base_url}/api/upload"
    
    for test_file in test_files:
        print(f"\n📁 Testing upload of: {test_file.name}")
        
        try:
            # Prepare file for upload
            with open(test_file, 'rb') as f:
                files = {'files': (test_file.name, f, 'text/plain')}
                
                # Note: In a real test, we'd need CSRF token and authentication
                # For now, we'll test the endpoint availability
                response = requests.post(upload_url, files=files, timeout=10)
                
                print(f"   Status Code: {response.status_code}")
                
                if response.status_code == 400:
                    print("   ⚠️  Expected: Missing CSRF token or authentication")
                elif response.status_code == 405:
                    print("   ⚠️  Method not allowed - endpoint might be disabled")
                elif response.status_code == 404:
                    print("   ❌ Upload endpoint not found")
                elif response.status_code in [200, 201]:
                    print("   ✅ Upload successful!")
                else:
                    print(f"   ⚠️  Unexpected response: {response.status_code}")
                    
                # Try to get response content
                try:
                    response_data = response.json()
                    print(f"   Response: {response_data}")
                except:
                    print(f"   Response text: {response.text[:100]}...")
                    
        except Exception as e:
            print(f"   ❌ Error uploading {test_file.name}: {e}")
    
    # Cleanup
    for test_file in test_files:
        try:
            test_file.unlink()
        except:
            pass
    try:
        temp_dir.rmdir()
    except:
        pass

def test_file_download(base_url="http://localhost:3000"):
    """Test file download functionality"""
    print("\n📥 Testing File Download Functionality")
    print("=" * 40)
    
    # Test different download endpoints
    download_endpoints = [
        "/download/test.json",  # Static file download
        "/api/files",           # Files list API
        "/api/download/1",      # File download by ID
    ]
    
    for endpoint in download_endpoints:
        print(f"\n🔗 Testing endpoint: {endpoint}")
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Endpoint accessible")
                content_type = response.headers.get('content-type', 'unknown')
                print(f"   Content-Type: {content_type}")
            elif response.status_code == 404:
                print("   ⚠️  Endpoint not found (expected for test)")
            elif response.status_code == 403:
                print("   ⚠️  Access forbidden (authentication required)")
            else:
                print(f"   ⚠️  Response: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error testing {endpoint}: {e}")

def test_file_management_api(base_url="http://localhost:3000"):
    """Test file management API endpoints"""
    print("\n🗂️  Testing File Management API")
    print("=" * 40)
    
    # Test various file management endpoints
    api_endpoints = [
        ("/api/files", "GET", "Files list"),
        ("/api/folders", "GET", "Folders list"),
        ("/api/status", "GET", "API status"),
        ("/api/files/1/rename", "POST", "File rename"),
        ("/api/files/1", "DELETE", "File delete"),
    ]
    
    for endpoint, method, description in api_endpoints:
        print(f"\n🔧 Testing {description}: {method} {endpoint}")
        try:
            if method == "GET":
                response = requests.get(f"{base_url}{endpoint}", timeout=5)
            elif method == "POST":
                response = requests.post(f"{base_url}{endpoint}", 
                                       json={"name": "test"}, timeout=5)
            elif method == "DELETE":
                response = requests.delete(f"{base_url}{endpoint}", timeout=5)
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code in [200, 201]:
                print("   ✅ Endpoint working")
            elif response.status_code == 404:
                print("   ⚠️  Endpoint not found")
            elif response.status_code in [401, 403]:
                print("   ⚠️  Authentication/authorization required")
            elif response.status_code == 400:
                print("   ⚠️  Bad request (expected for test data)")
            else:
                print(f"   ⚠️  Unexpected response: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error testing {endpoint}: {e}")

def main():
    """Main test function"""
    print("🧪 TeleDrive File Operations Test Suite")
    print("=" * 50)
    
    base_url = "http://localhost:3000"
    
    # Test 1: Server connection
    if not test_server_connection(base_url):
        print("\n❌ Cannot proceed with tests - server is not running")
        print("💡 Please start the TeleDrive server first:")
        print("   cd TeleDrive && python run.bat")
        return False
    
    # Test 2: File upload
    test_file_upload(base_url)
    
    # Test 3: File download
    test_file_download(base_url)
    
    # Test 4: File management API
    test_file_management_api(base_url)
    
    print("\n🎉 File Operations Test Complete!")
    print("📋 Summary:")
    print("   - Server connectivity tested")
    print("   - File upload endpoints tested")
    print("   - File download endpoints tested")
    print("   - File management API tested")
    print("\n⚠️  Note: Full testing requires authentication and CSRF tokens")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
