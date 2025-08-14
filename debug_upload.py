#!/usr/bin/env python3
"""
Debug upload functionality
"""

import requests
import os

BASE_URL = "http://127.0.0.1:3000"

def debug_upload():
    """Debug upload step by step"""
    print("🔍 Debug Upload Process")
    print("=" * 30)
    
    # Step 1: Auto-login
    session = requests.Session()
    response = session.get(f"{BASE_URL}/dev/auto-login", allow_redirects=True)
    print(f"1. Auto-login: {response.status_code}")
    
    # Step 2: Get CSRF token
    response = session.get(f"{BASE_URL}/api/csrf-token")
    csrf_token = response.json().get('csrf_token')
    print(f"2. CSRF token: {csrf_token[:20]}...")
    
    # Step 3: Check upload config
    response = session.get(f"{BASE_URL}/api/config")
    if response.status_code == 200:
        config = response.json()
        print(f"3. Upload config: {config.get('upload', 'Not found')}")
    else:
        print(f"3. Config endpoint: {response.status_code}")
    
    # Step 4: Test upload with detailed logging
    test_file_path = "test_upload.txt"
    if not os.path.exists(test_file_path):
        with open(test_file_path, 'w') as f:
            f.write("Test file content for debugging upload")
    
    files = {'files': open(test_file_path, 'rb')}
    data = {'csrf_token': csrf_token}
    headers = {'X-CSRFToken': csrf_token}
    
    print(f"4. Uploading file: {test_file_path}")
    print(f"   File size: {os.path.getsize(test_file_path)} bytes")
    
    try:
        response = session.post(
            f"{BASE_URL}/api/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        print(f"   Upload status: {response.status_code}")
        print(f"   Response headers: {dict(response.headers)}")
        print(f"   Response body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            uploaded_files = result.get('files', [])
            if uploaded_files:
                filename = uploaded_files[0]['filename']
                print(f"   Uploaded filename: {filename}")
                
                # Step 5: Check if file exists in filesystem
                upload_dir = "data/uploads"
                file_path = os.path.join(upload_dir, filename)
                print(f"   Expected path: {file_path}")
                print(f"   File exists: {os.path.exists(file_path)}")
                
                if os.path.exists(upload_dir):
                    files_in_dir = os.listdir(upload_dir)
                    print(f"   Files in upload dir: {files_in_dir}")
                else:
                    print(f"   Upload directory doesn't exist: {upload_dir}")
                
                # Step 6: Test download
                print(f"5. Testing download...")
                download_response = session.get(f"{BASE_URL}/download/{filename}")
                print(f"   Download status: {download_response.status_code}")
                print(f"   Download response: {download_response.text[:200]}...")
        
    except Exception as e:
        print(f"   Upload error: {e}")
    finally:
        files['files'].close()

if __name__ == "__main__":
    debug_upload()
