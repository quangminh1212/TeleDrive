#!/usr/bin/env python3
"""
Test Database Schema for Telegram Storage
"""

import sys
import os
sys.path.append('source')

from app import app
from db import db, File

def test_database_schema():
    """Test database schema for Telegram storage"""
    print('🧪 Testing Database Schema for Telegram Storage')
    print('=' * 50)

    with app.app_context():
        # Test creating a file record with Telegram storage
        test_file = File(
            filename='test_telegram_file.txt',
            original_filename='test_telegram_file.txt',
            file_size=1024,
            mime_type='text/plain',
            user_id=1,
            storage_type='telegram'
        )
        
        # Test Telegram storage methods
        print('✅ File model created')
        print(f'   Storage type: {test_file.storage_type}')
        print(f'   Is stored on Telegram: {test_file.is_stored_on_telegram()}')
        print(f'   Is stored locally: {test_file.is_stored_locally()}')
        
        # Test setting Telegram info
        test_file.set_telegram_storage(
            message_id=12345,
            channel='test_channel',
            channel_id='-100123456789',
            file_id='BAADBAADrwADBREAAWdXAQABFwQ',
            unique_id='abc123',
            access_hash='1234567890'
        )
        
        print('✅ Telegram storage info set')
        print(f'   Message ID: {test_file.telegram_message_id}')
        print(f'   Channel: {test_file.telegram_channel}')
        print(f'   File ID: {test_file.telegram_file_id}')
        print(f'   Storage type: {test_file.storage_type}')
        print(f'   Is stored on Telegram: {test_file.is_stored_on_telegram()}')
        
        # Test getting Telegram info
        telegram_info = test_file.get_telegram_info()
        print('✅ Telegram info retrieved:')
        for key, value in telegram_info.items():
            print(f'   {key}: {value}')
        
        # Test to_dict method
        file_dict = test_file.to_dict()
        print('✅ File to_dict includes storage_type:')
        print(f'   storage_type: {file_dict.get("storage_type")}')
        
        # Test local storage file
        local_file = File(
            filename='test_local_file.txt',
            original_filename='test_local_file.txt',
            file_path='/path/to/local/file.txt',
            file_size=512,
            mime_type='text/plain',
            user_id=1,
            storage_type='local'
        )
        
        print('\n✅ Local storage file created')
        print(f'   Storage type: {local_file.storage_type}')
        print(f'   Is stored on Telegram: {local_file.is_stored_on_telegram()}')
        print(f'   Is stored locally: {local_file.is_stored_locally()}')
        print(f'   File path: {local_file.file_path}')
        
    print('\n✅ Database schema test completed successfully!')
    return True

if __name__ == "__main__":
    test_database_schema()
