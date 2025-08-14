#!/usr/bin/env python3
"""
Check core functionality - upload/download/web interface
"""

import sys
import os
import requests
import tempfile
import time
sys.path.append('source')

BASE_URL = "http://127.0.0.1:3000"

def check_server_status():
    """Check if server is running"""
    print('🔍 CHECKING SERVER STATUS')
    print('=' * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print('✅ Server is running and responding')
            print(f'   Status code: {response.status_code}')
            print(f'   Response size: {len(response.content)} bytes')
            return True
        else:
            print(f'❌ Server responded with status: {response.status_code}')
            return False
    except requests.exceptions.ConnectionError:
        print('❌ Cannot connect to server - server not running')
        return False
    except Exception as e:
        print(f'❌ Server check error: {e}')
        return False

def check_authentication():
    """Check authentication system"""
    print('\n🔍 CHECKING AUTHENTICATION')
    print('=' * 50)
    
    session = requests.Session()
    
    try:
        # Test auto-login
        response = session.get(f"{BASE_URL}/dev/auto-login")
        if response.status_code in [200, 302]:
            print('✅ Auto-login endpoint working')
        else:
            print(f'❌ Auto-login failed: {response.status_code}')
            return False
        
        # Test CSRF token
        response = session.get(f"{BASE_URL}/api/csrf-token")
        if response.status_code == 200:
            csrf_data = response.json()
            if 'csrf_token' in csrf_data:
                print('✅ CSRF token generation working')
                print(f'   Token length: {len(csrf_data["csrf_token"])}')
            else:
                print('❌ CSRF token not in response')
                return False
        else:
            print(f'❌ CSRF token endpoint failed: {response.status_code}')
            return False
        
        return True
        
    except Exception as e:
        print(f'❌ Authentication check error: {e}')
        return False

def check_upload_functionality():
    """Check file upload functionality"""
    print('\n🔍 CHECKING UPLOAD FUNCTIONALITY')
    print('=' * 50)
    
    session = requests.Session()
    
    try:
        # Auto-login
        session.get(f"{BASE_URL}/dev/auto-login")
        
        # Get CSRF token
        response = session.get(f"{BASE_URL}/api/csrf-token")
        csrf_token = response.json()['csrf_token']
        
        # Create test file
        test_content = f"Test file for functionality check\\nTimestamp: {time.time()}\\nContent: Lorem ipsum dolor sit amet"
        test_file_path = "test_functionality_check.txt"
        
        with open(test_file_path, 'w', encoding='utf-8') as f:
            f.write(test_content)
        
        file_size = os.path.getsize(test_file_path)
        print(f'✅ Test file created: {file_size} bytes')
        
        # Upload file
        files = {'files': open(test_file_path, 'rb')}
        data = {'csrf_token': csrf_token}
        headers = {'X-CSRFToken': csrf_token}
        
        response = session.post(
            f"{BASE_URL}/api/upload",
            files=files,
            data=data,
            headers=headers
        )
        
        files['files'].close()
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                uploaded_files = result.get('files', [])
                if uploaded_files:
                    uploaded_filename = uploaded_files[0]['filename']
                    print(f'✅ File upload successful: {uploaded_filename}')
                    print(f'   Size: {uploaded_files[0]["size"]} bytes')
                    print(f'   Type: {uploaded_files[0]["type"]}')
                    
                    # Cleanup
                    os.remove(test_file_path)
                    
                    return uploaded_filename
                else:
                    print('❌ No files in upload response')
            else:
                print(f'❌ Upload failed: {result.get("error", "Unknown error")}')
        else:
            print(f'❌ Upload failed with status: {response.status_code}')
            print(f'Response: {response.text[:200]}')
        
        # Cleanup
        if os.path.exists(test_file_path):
            os.remove(test_file_path)
        
        return None
        
    except Exception as e:
        print(f'❌ Upload check error: {e}')
        return None

def check_download_functionality(filename):
    """Check file download functionality"""
    print('\n🔍 CHECKING DOWNLOAD FUNCTIONALITY')
    print('=' * 50)
    
    if not filename:
        print('❌ No filename provided for download test')
        return False
    
    session = requests.Session()
    
    try:
        # Auto-login
        session.get(f"{BASE_URL}/dev/auto-login")
        
        # Download file
        response = session.get(f"{BASE_URL}/download/{filename}")
        
        if response.status_code == 200:
            content = response.content
            print(f'✅ Download successful: {len(content)} bytes')
            
            # Verify content
            if b'Test file for functionality check' in content:
                print('✅ File content verified')
                return True
            else:
                print('⚠️ File content unexpected')
                return False
        else:
            print(f'❌ Download failed: {response.status_code}')
            if response.headers.get('content-type', '').startswith('application/json'):
                error_data = response.json()
                print(f'Error: {error_data.get("error", "Unknown error")}')
            return False
        
    except Exception as e:
        print(f'❌ Download check error: {e}')
        return False

def check_file_listing():
    """Check file listing functionality"""
    print('\n🔍 CHECKING FILE LISTING')
    print('=' * 50)
    
    session = requests.Session()
    
    try:
        # Auto-login
        session.get(f"{BASE_URL}/dev/auto-login")
        
        # Get file list
        response = session.get(f"{BASE_URL}/api/get_files")
        
        if response.status_code == 200:
            files_data = response.json()
            files_list = files_data.get('files', [])
            print(f'✅ File listing successful: {len(files_list)} files')
            
            if files_list:
                # Check first file structure
                first_file = files_list[0]
                required_fields = ['id', 'filename', 'file_size', 'storage_type']
                
                missing_fields = []
                for field in required_fields:
                    if field not in first_file:
                        missing_fields.append(field)
                
                if not missing_fields:
                    print('✅ File metadata structure correct')
                    print(f'   Sample file: {first_file["filename"]}')
                    print(f'   Storage type: {first_file.get("storage_type", "unknown")}')
                else:
                    print(f'⚠️ Missing fields in file metadata: {missing_fields}')
            
            return True
        else:
            print(f'❌ File listing failed: {response.status_code}')
            return False
        
    except Exception as e:
        print(f'❌ File listing check error: {e}')
        return False

def check_web_interface():
    """Check web interface pages"""
    print('\n🔍 CHECKING WEB INTERFACE')
    print('=' * 50)
    
    session = requests.Session()
    
    try:
        # Auto-login
        session.get(f"{BASE_URL}/dev/auto-login")
        
        # Check main pages
        pages = [
            ('/', 'Main page'),
            ('/settings', 'Settings page'),
            ('/scan', 'Scan page'),
            ('/search', 'Search page')
        ]
        
        for url, name in pages:
            response = session.get(f"{BASE_URL}{url}")
            if response.status_code == 200:
                print(f'✅ {name}: OK ({len(response.content)} bytes)')
            else:
                print(f'❌ {name}: Failed ({response.status_code})')
        
        return True
        
    except Exception as e:
        print(f'❌ Web interface check error: {e}')
        return False

if __name__ == "__main__":
    print('🧪 TELEDRIVE CORE FUNCTIONALITY CHECK')
    print('=' * 60)
    
    # Check if server is running
    server_ok = check_server_status()
    if not server_ok:
        print('\\n❌ Server not running. Please start with: python source/app.py')
        exit(1)
    
    # Run functionality checks
    auth_ok = check_authentication()
    uploaded_filename = check_upload_functionality()
    download_ok = check_download_functionality(uploaded_filename)
    listing_ok = check_file_listing()
    web_ok = check_web_interface()
    
    print('\\n' + '=' * 60)
    print('📊 FUNCTIONALITY SUMMARY')
    print('=' * 60)
    
    if auth_ok and uploaded_filename and download_ok and listing_ok and web_ok:
        print('✅ Core functionality check PASSED - All systems working')
    else:
        print('❌ Core functionality check FAILED - Issues found')
        if not auth_ok:
            print('   - Authentication issues')
        if not uploaded_filename:
            print('   - Upload functionality issues')
        if not download_ok:
            print('   - Download functionality issues')
        if not listing_ok:
            print('   - File listing issues')
        if not web_ok:
            print('   - Web interface issues')
