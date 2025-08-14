#!/usr/bin/env python3
"""
Check syntax and imports for TeleDrive project
"""

import sys
import os
sys.path.append('source')

print('🔍 CHECKING SYNTAX AND IMPORTS')
print('=' * 50)

# Check syntax of main files
main_files = [
    'source/app.py',
    'source/db.py',
    'source/config.py',
    'source/telegram_storage.py',
    'source/scanner.py',
    'source/auth.py',
    'source/web_config.py'
]

import py_compile
import traceback

for file_path in main_files:
    try:
        py_compile.compile(file_path, doraise=True)
        print(f'✅ {file_path} - Syntax OK')
    except Exception as e:
        print(f'❌ {file_path} - Syntax Error: {e}')

print('\n🔍 CHECKING IMPORTS')
print('=' * 50)

# Test imports
try:
    import config
    print('✅ config.py imported')
    print(f'   API_ID: {getattr(config, "API_ID", "Not set")}')
    print(f'   API_HASH: {"Set" if getattr(config, "API_HASH", None) else "Not set"}')
    print(f'   PHONE: {getattr(config, "PHONE_NUMBER", "Not set")}')
except Exception as e:
    print(f'❌ config.py import error: {e}')

try:
    from db import db, File, User, Folder
    print('✅ Database models imported')
    
    # Test File model methods
    f = File()
    print(f'   File.is_stored_on_telegram: {hasattr(f, "is_stored_on_telegram")}')
    print(f'   File.is_stored_locally: {hasattr(f, "is_stored_locally")}')
    print(f'   File.set_telegram_storage: {hasattr(f, "set_telegram_storage")}')
    
except Exception as e:
    print(f'❌ Database models import error: {e}')
    traceback.print_exc()

try:
    from telegram_storage import telegram_storage
    print('✅ Telegram storage imported')
except Exception as e:
    print(f'❌ Telegram storage import error: {e}')
    traceback.print_exc()

try:
    from web_config import web_config
    print('✅ Web config imported')
except Exception as e:
    print(f'❌ Web config import error: {e}')
    traceback.print_exc()

try:
    from scanner import TelegramFileScanner
    print('✅ Scanner imported')
except Exception as e:
    print(f'❌ Scanner import error: {e}')

try:
    from auth import auth_bp
    print('✅ Auth blueprint imported')
except Exception as e:
    print(f'❌ Auth blueprint import error: {e}')

print('\n🔍 CHECKING APP INITIALIZATION')
print('=' * 50)

try:
    from app import app
    print('✅ Flask app imported')
    print(f'   Debug mode: {app.debug}')
    print(f'   Secret key set: {"Yes" if app.secret_key else "No"}')
except Exception as e:
    print(f'❌ Flask app import error: {e}')
    traceback.print_exc()
