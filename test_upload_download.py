#!/usr/bin/env python3
"""
Test script for TeleDrive upload and download functionality
"""

import requests
import os
import json

BASE_URL = "http://127.0.0.1:3000"

def test_auto_login():
    """Test development auto-login"""
    print("🔐 Testing auto-login...")
    
    session = requests.Session()
    response = session.get(f"{BASE_URL}/dev/auto-login", allow_redirects=True)
    
    if response.status_code == 200:
        print("✅ Auto-login successful")
        return session
    else:
        print(f"❌ Auto-login failed: {response.status_code}")
        return None

def get_csrf_token(session):
    """Get CSRF token for uploads"""
    print("🔑 Getting CSRF token...")
    
    response = session.get(f"{BASE_URL}/api/csrf-token")
    if response.status_code == 200:
        data = response.json()
        token = data.get('csrf_token')
        print(f"✅ CSRF token obtained: {token[:20]}...")
        return token
    else:
        print(f"❌ Failed to get CSRF token: {response.status_code}")
        return None

def test_upload(session, csrf_token):
    """Test file upload"""
    print("📤 Testing file upload...")
    
    # Create test file
    test_file_path = "test_upload.txt"
    if not os.path.exists(test_file_path):
        print(f"❌ Test file {test_file_path} not found")
        return False
    
    # Prepare upload
    files = {'files': open(test_file_path, 'rb')}
    data = {'csrf_token': csrf_token}
    headers = {'X-CSRFToken': csrf_token}
    
    try:
        response = session.post(
            f"{BASE_URL}/api/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        print(f"Upload response status: {response.status_code}")
        print(f"Upload response: {response.text[:200]}...")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ File upload successful")
                return True
            else:
                print(f"❌ Upload failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Upload failed with status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False
    finally:
        files['files'].close()

def test_get_files(session):
    """Test getting file list"""
    print("📋 Testing file list...")
    
    response = session.get(f"{BASE_URL}/api/get_files")
    print(f"Get files response status: {response.status_code}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            files = data.get('files', [])
            print(f"✅ Found {len(files)} files")
            
            for file_info in files[:3]:  # Show first 3 files
                print(f"  - {file_info.get('name')} ({file_info.get('size')} bytes)")
            
            return files
        except:
            print("❌ Failed to parse file list response")
            return []
    else:
        print(f"❌ Failed to get file list: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        return []

def test_download(session, filename):
    """Test file download"""
    print(f"📥 Testing download of {filename}...")
    
    response = session.get(f"{BASE_URL}/download/{filename}")
    print(f"Download response status: {response.status_code}")
    
    if response.status_code == 200:
        print(f"✅ Download successful - {len(response.content)} bytes")
        return True
    else:
        print(f"❌ Download failed: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        return False

def main():
    """Main test function"""
    print("🧪 TeleDrive Upload/Download Test")
    print("=" * 40)
    
    # Test auto-login
    session = test_auto_login()
    if not session:
        return
    
    # Get CSRF token
    csrf_token = get_csrf_token(session)
    if not csrf_token:
        return
    
    # Test upload
    upload_success = test_upload(session, csrf_token)
    
    # Test file listing
    files = test_get_files(session)
    
    # Test download
    if files:
        # Try to download the first file
        first_file = files[0].get('name')
        if first_file:
            test_download(session, first_file)
    
    print("\n🏁 Test completed!")

if __name__ == "__main__":
    main()
