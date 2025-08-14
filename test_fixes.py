#!/usr/bin/env python3
"""
Test fixes for file listing API and settings page
"""

import sys
import requests
sys.path.append('source')

def test_file_listing_api():
    """Test file listing API fixes"""
    print('🔍 Testing file listing API...')
    
    session = requests.Session()
    session.get('http://127.0.0.1:3000/dev/auto-login')
    
    response = session.get('http://127.0.0.1:3000/api/get_files')
    if response.status_code == 200:
        files_data = response.json()
        files_list = files_data.get('files', [])
        if files_list:
            first_file = files_list[0]
            required_fields = ['filename', 'file_size', 'storage_type']
            missing_fields = []
            for field in required_fields:
                if field not in first_file:
                    missing_fields.append(field)
            
            if not missing_fields:
                print('✅ File listing API fixed - all required fields present')
                print(f'   filename: {first_file["filename"]}')
                print(f'   file_size: {first_file["file_size"]}')
                print(f'   storage_type: {first_file["storage_type"]}')
                return True
            else:
                print(f'❌ Still missing fields: {missing_fields}')
                return False
        else:
            print('No files found')
            return True
    else:
        print(f'❌ API error: {response.status_code}')
        return False

def test_settings_page():
    """Test settings page fixes"""
    print('\n🔍 Testing settings page...')
    
    session = requests.Session()
    session.get('http://127.0.0.1:3000/dev/auto-login')
    
    response = session.get('http://127.0.0.1:3000/settings')
    if response.status_code == 200:
        print('✅ Settings page fixed - no more 500 error')
        print(f'   Response size: {len(response.content)} bytes')
        return True
    else:
        print(f'❌ Settings page still has error: {response.status_code}')
        if response.status_code == 500:
            print('   Error details:')
            print(response.text[:300])
        return False

if __name__ == "__main__":
    print('🧪 TESTING FIXES')
    print('=' * 40)
    
    api_ok = test_file_listing_api()
    settings_ok = test_settings_page()
    
    print('\n' + '=' * 40)
    print('📊 FIXES SUMMARY')
    print('=' * 40)
    
    if api_ok and settings_ok:
        print('✅ All fixes working correctly')
    else:
        print('❌ Some fixes still need work')
        if not api_ok:
            print('   - File listing API issues')
        if not settings_ok:
            print('   - Settings page issues')
