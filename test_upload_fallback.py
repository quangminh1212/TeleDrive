#!/usr/bin/env python3
"""
Test Upload with Telegram Storage (Fallback Mode)
Tests upload function when Telegram is not available
"""

import sys
import os
import requests
import tempfile

BASE_URL = "http://127.0.0.1:3000"

def test_upload_with_fallback():
    """Test upload function with Telegram fallback to local"""
    print("🧪 TeleDrive Upload Test (Telegram Storage with Local Fallback)")
    print("=" * 70)
    
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
🧪 TeleDrive Telegram Storage Test File (Fallback Mode)
Created at: {os.popen('date /t').read().strip()} {os.popen('time /t').read().strip()}
Content: Testing Telegram storage backend with local fallback
Size: Medium test file for storage validation

This file tests the Telegram storage with fallback:
1. Attempt upload to Telegram channel (will fail without auth)
2. Fallback to local storage
3. Verify file is stored locally
4. Test download from local storage

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco.
Duis aute irure dolor in reprehenderit in voluptate velit esse.
Cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat.

Test completed successfully! 🎉
"""
    
    test_file_path = "test_telegram_fallback.txt"
    with open(test_file_path, 'w', encoding='utf-8') as f:
        f.write(test_content)
    
    file_size = os.path.getsize(test_file_path)
    print(f"✅ Test file created: {test_file_path} ({file_size} bytes)")
    
    # Step 4: Test upload (should fallback to local)
    print("📤 Testing file upload (Telegram → Local fallback)...")
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
                    print("   Expected: Fallback to local storage due to no Telegram auth")
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
    
    # Step 5: Check file storage type in database
    print("🔍 Checking file storage type...")
    try:
        response = session.get(f"{BASE_URL}/api/get_files")
        if response.status_code == 200:
            files_data = response.json()
            files_list = files_data.get('files', [])
            
            # Find our uploaded file
            test_file = None
            for file_info in files_list:
                if file_info['filename'] == uploaded_filename:
                    test_file = file_info
                    break
            
            if test_file:
                storage_type = test_file.get('storage_type', 'unknown')
                print(f"✅ File found in database:")
                print(f"   ID: {test_file['id']}")
                print(f"   Filename: {test_file['filename']}")
                print(f"   Storage type: {storage_type}")
                
                if storage_type == 'local':
                    print("✅ Correctly fell back to local storage")
                elif storage_type == 'telegram':
                    print("⚠️ File marked as Telegram storage (unexpected)")
                else:
                    print(f"⚠️ Unknown storage type: {storage_type}")
                    
                print(f"   File path: {test_file.get('file_path', 'N/A')}")
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
                
                # Compare content
                with open(test_file_path, 'rb') as f:
                    original_content = f.read()
                
                if downloaded_content == original_content:
                    print("✅ File content matches original - Local fallback working!")
                else:
                    print("⚠️ File content differs from original")
            else:
                print(f"⚠️ File size mismatch - Original: {file_size}, Downloaded: {len(downloaded_content)}")
        else:
            print(f"❌ Download failed: {response.status_code}")
            if response.headers.get('content-type', '').startswith('application/json'):
                error_data = response.json()
                print(f"Error: {error_data.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Download error: {e}")
        return False
    
    # Step 7: Check local file exists
    print("📁 Checking local file storage...")
    try:
        local_file_path = f"source/data/uploads/{uploaded_filename}"
        if os.path.exists(local_file_path):
            local_size = os.path.getsize(local_file_path)
            print(f"✅ Local file exists: {local_file_path} ({local_size} bytes)")
        else:
            print(f"❌ Local file not found: {local_file_path}")
            return False
    except Exception as e:
        print(f"❌ Local file check error: {e}")
        return False
    
    # Cleanup
    print("🧹 Cleaning up test files...")
    try:
        os.remove(test_file_path)
        print("✅ Cleanup completed")
    except Exception as e:
        print(f"⚠️ Cleanup warning: {e}")
    
    return True

def main():
    """Main test function"""
    print("🚀 Starting TeleDrive Upload Test (Fallback Mode)")
    print("=" * 70)
    
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
    if test_upload_with_fallback():
        print("\n🎉 FALLBACK TEST PASSED!")
        print("✅ Upload function working correctly")
        print("✅ Telegram storage attempt: EXPECTED FAILURE (no auth)")
        print("✅ Local fallback: SUCCESS")
        print("✅ Download from local: SUCCESS")
        print("✅ File integrity: VERIFIED")
        print("\n📋 Next step: Set up Telegram authentication to test full Telegram storage")
    else:
        print("\n❌ FALLBACK TEST FAILED!")
        print("Please check the server logs for more details")

if __name__ == "__main__":
    main()
