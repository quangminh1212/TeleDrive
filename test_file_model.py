#!/usr/bin/env python3
"""
Test File Model Methods
"""

import sys
sys.path.append('source')

try:
    from db import File
    print('✅ File model imported successfully')
    
    # Test creating instance
    f = File()
    print('✅ File instance created')
    
    # Check if methods exist
    print('Methods check:')
    print(f'  is_stored_on_telegram: {hasattr(f, "is_stored_on_telegram")}')
    print(f'  is_stored_locally: {hasattr(f, "is_stored_locally")}')
    print(f'  set_telegram_storage: {hasattr(f, "set_telegram_storage")}')
    print(f'  get_telegram_info: {hasattr(f, "get_telegram_info")}')
    
    # Test methods if they exist
    if hasattr(f, "is_stored_on_telegram"):
        f.storage_type = 'telegram'
        f.telegram_message_id = 123
        print(f'✅ is_stored_on_telegram(): {f.is_stored_on_telegram()}')
    
    if hasattr(f, "is_stored_locally"):
        f.storage_type = 'local'
        f.file_path = '/test/path'
        print(f'✅ is_stored_locally(): {f.is_stored_locally()}')
    
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
