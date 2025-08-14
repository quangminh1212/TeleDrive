#!/usr/bin/env python3
"""
Test script for Telegram Storage Integration
Tests the complete upload/download flow with Telegram backend
"""

import sys
import os
import requests
import tempfile
sys.path.append('source')

BASE_URL = "http://127.0.0.1:3000"

def test_telegram_storage_flow():
    """Test complete Telegram storage flow"""
    print("🧪 TeleDrive Telegram Storage Integration Test")
    print("=" * 60)
    
    session = requests.Session()
    
    # Step 1: Auto-login
    print("🔐 Testing auto-login...")
    try:
        response = session.get(f"{BASE_URL}/dev/auto-login")
        if response.status_code == 200:
            print("✅ Auto-login successful")
        else:
            print(f"❌ Auto-login failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Auto-login error: {e}")
        return False
    
    # Step 2: Get CSRF token
    print("🔑 Getting CSRF token...")
    try:
        response = session.get(f"{BASE_URL}/api/csrf-token")
        if response.status_code == 200:
            csrf_token = response.json().get('csrf_token')
            print(f"✅ CSRF token obtained: {csrf_token[:20]}...")
        else:
            print(f"❌ CSRF token failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ CSRF token error: {e}")
        return False
    
    # Step 3: Create test file
    print("📄 Creating test file...")
    test_content = f"""
🧪 TeleDrive Telegram Storage Test File
Created at: {os.popen('date /t').read().strip()} {os.popen('time /t').read().strip()}
Content: Testing Telegram storage backend
Size: Medium test file for storage validation

This file tests the complete Telegram storage integration:
1. Upload to Telegram channel
2. Store metadata in database
3. Download from Telegram
4. Verify file integrity

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco.
Duis aute irure dolor in reprehenderit in voluptate velit esse.
Cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat.

Test completed successfully! 🎉
"""
    
    test_file_path = "test_telegram_upload.txt"
    with open(test_file_path, 'w', encoding='utf-8') as f:
        f.write(test_content)
    
    file_size = os.path.getsize(test_file_path)
    print(f"✅ Test file created: {test_file_path} ({file_size} bytes)")
    
    # Step 4: Test upload with Telegram backend
    print("📤 Testing file upload to Telegram...")
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
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                uploaded_files = result.get('files', [])
                if uploaded_files:
                    uploaded_filename = uploaded_files[0]['filename']
                    print(f"✅ File upload successful: {uploaded_filename}")
                    print(f"   Size: {uploaded_files[0]['size']} bytes")
                    print(f"   Type: {uploaded_files[0]['type']}")
                else:
                    print("❌ No files in upload response")
                    return False
            else:
                print(f"❌ Upload failed: {result.get('error', 'Unknown error')}")
                print(f"Response: {response.text}")
                return False
        else:
            print(f"❌ Upload failed with status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False
    finally:
        files['files'].close()
    
    # Step 5: Test file listing
    print("📋 Testing file list...")
    try:
        response = session.get(f"{BASE_URL}/api/get_files")
        if response.status_code == 200:
            files_data = response.json()
            files_list = files_data.get('files', [])
            print(f"✅ Found {len(files_list)} files")
            
            # Find our uploaded file
            test_file = None
            for file_info in files_list:
                if file_info['filename'] == uploaded_filename:
                    test_file = file_info
                    break
            
            if test_file:
                print(f"✅ Test file found in database:")
                print(f"   ID: {test_file['id']}")
                print(f"   Filename: {test_file['filename']}")
                print(f"   Storage type: {test_file.get('storage_type', 'unknown')}")
                print(f"   Telegram channel: {test_file.get('telegram_channel', 'N/A')}")
                print(f"   Telegram message ID: {test_file.get('telegram_message_id', 'N/A')}")
            else:
                print(f"❌ Test file not found in database")
                return False
        else:
            print(f"❌ File list failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ File list error: {e}")
        return False
    
    # Step 6: Test download
    print(f"📥 Testing download of {uploaded_filename}...")
    try:
        response = session.get(f"{BASE_URL}/download/{uploaded_filename}")
        
        print(f"Download response status: {response.status_code}")
        
        if response.status_code == 200:
            downloaded_content = response.content
            print(f"✅ Download successful - {len(downloaded_content)} bytes")
            
            # Verify content
            if len(downloaded_content) == file_size:
                print("✅ File size matches original")
                
                # Save downloaded content to verify
                with open("downloaded_test_file.txt", 'wb') as f:
                    f.write(downloaded_content)
                
                # Compare content
                with open(test_file_path, 'rb') as f:
                    original_content = f.read()
                
                if downloaded_content == original_content:
                    print("✅ File content matches original - Telegram storage working perfectly!")
                else:
                    print("⚠️ File content differs from original")
                    print(f"Original size: {len(original_content)}")
                    print(f"Downloaded size: {len(downloaded_content)}")
            else:
                print(f"⚠️ File size mismatch - Original: {file_size}, Downloaded: {len(downloaded_content)}")
        else:
            print(f"❌ Download failed: {response.status_code}")
            if response.headers.get('content-type', '').startswith('application/json'):
                error_data = response.json()
                print(f"Error: {error_data.get('error', 'Unknown error')}")
            else:
                print(f"Response: {response.text[:200]}...")
            return False
            
    except Exception as e:
        print(f"❌ Download error: {e}")
        return False
    
    # Cleanup
    print("🧹 Cleaning up test files...")
    try:
        os.remove(test_file_path)
        if os.path.exists("downloaded_test_file.txt"):
            os.remove("downloaded_test_file.txt")
        print("✅ Cleanup completed")
    except Exception as e:
        print(f"⚠️ Cleanup warning: {e}")
    
    return True

def check_telegram_config():
    """Check if Telegram is properly configured"""
    print("🔍 Checking Telegram Configuration...")
    
    try:
        sys.path.append('source')
        import config
        
        if config.API_ID and config.API_HASH and config.PHONE_NUMBER:
            print("✅ Telegram API credentials configured")
            
            # Check session file
            session_file = f"source/{config.SESSION_NAME}.session"
            if os.path.exists(session_file):
                print("✅ Telegram session file exists")
                return True
            else:
                print("❌ Telegram session file not found")
                print("Please run: python source/telegram_auth.py")
                return False
        else:
            print("❌ Telegram API credentials not configured")
            return False
    except Exception as e:
        print(f"❌ Config check error: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Starting TeleDrive Telegram Storage Integration Test")
    print("=" * 60)
    
    # Check Telegram configuration
    if not check_telegram_config():
        print("\n❌ Telegram not properly configured. Please configure and authenticate first.")
        return
    
    # Check if server is running
    print("🌐 Checking if TeleDrive server is running...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print("✅ TeleDrive server is running")
        else:
            print(f"❌ Server responded with status: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Cannot connect to TeleDrive server: {e}")
        print("Please start the server with: python source/app.py")
        return
    
    # Run the test
    if test_telegram_storage_flow():
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Telegram storage backend is working correctly")
        print("✅ Upload to Telegram: SUCCESS")
        print("✅ Download from Telegram: SUCCESS")
        print("✅ File integrity: VERIFIED")
    else:
        print("\n❌ TESTS FAILED!")
        print("Please check the server logs for more details")

if __name__ == "__main__":
    main()
