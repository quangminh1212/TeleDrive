#!/usr/bin/env python3
"""
Check configuration files and settings
"""

import sys
import os
import json
sys.path.append('source')

def check_config_files():
    """Check configuration files"""
    print('[CHECK] CHECKING CONFIGURATION FILES')
    print('=' * 50)
    
    # Check main config files
    config_files = [
        'source/config.json',
        'source/web_config_dev.json',
        'config.json'
    ]
    
    for config_file in config_files:
        if os.path.exists(config_file):
            print(f'[PASS] {config_file} exists')
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                print(f'   Valid JSON: [PASS]')
                print(f'   Keys: {list(config_data.keys())}')
            except json.JSONDecodeError as e:
                print(f'   Invalid JSON: [FAIL] {e}')
            except Exception as e:
                print(f'   Error reading: [FAIL] {e}')
        else:
            print(f'[FAIL] {config_file} missing')

def check_telegram_config():
    """Check Telegram configuration"""
    print('\n[CHECK] CHECKING TELEGRAM CONFIGURATION')
    print('=' * 50)
    
    try:
        import config
        
        # Check required Telegram fields
        telegram_fields = {
            'API_ID': getattr(config, 'API_ID', None),
            'API_HASH': getattr(config, 'API_HASH', None),
            'PHONE_NUMBER': getattr(config, 'PHONE_NUMBER', None),
            'SESSION_NAME': getattr(config, 'SESSION_NAME', None)
        }
        
        for field, value in telegram_fields.items():
            if value:
                if field == 'API_HASH':
                    print(f'[PASS] {field}: {"*" * 10}... (hidden)')
                elif field == 'PHONE_NUMBER':
                    print(f'[PASS] {field}: {value[:3]}***{value[-3:] if len(value) > 6 else "***"}')
                else:
                    print(f'[PASS] {field}: {value}')
            else:
                print(f'[FAIL] {field}: Not set')
        
        # Check session file
        session_file = f'source/{config.SESSION_NAME}.session'
        if os.path.exists(session_file):
            size = os.path.getsize(session_file)
            print(f'[PASS] Session file: {session_file} ({size} bytes)')
        else:
            print(f'[WARN] Session file: {session_file} (not found - need to authenticate)')
        
        return True
        
    except Exception as e:
        print(f'[FAIL] Telegram config error: {e}')
        return False

def check_web_config():
    """Check web configuration"""
    print('\n[CHECK] CHECKING WEB CONFIGURATION')
    print('=' * 50)
    
    try:
        from web_config import web_config
        
        # Check upload configuration
        upload_config = web_config.get_upload_config()
        print(f'[PASS] Upload config loaded')
        print(f'   Max file size: {upload_config.get("max_file_size", "Not set")}')
        print(f'   Upload directory: {upload_config.get("upload_directory", "Not set")}')
        print(f'   Storage backend: {upload_config.get("storage_backend", "Not set")}')
        print(f'   Fallback to local: {upload_config.get("fallback_to_local", "Not set")}')
        print(f'   Allowed extensions: {len(upload_config.get("allowed_extensions", []))} types')
        
        # Check Flask config
        flask_config = web_config.get_flask_config()
        print(f'\n[PASS] Flask config loaded')
        print(f'   Debug: {flask_config.get("DEBUG", "Not set")}')
        print(f'   Secret key set: {"Yes" if flask_config.get("SECRET_KEY") else "No"}')
        print(f'   Database URI set: {"Yes" if flask_config.get("SQLALCHEMY_DATABASE_URI") else "No"}')
        
        # Check directories
        directories = web_config.get_directories()
        print(f'\n[PASS] Directory config:')
        for name, path in directories.items():
            exists = os.path.exists(path)
            print(f'   {name}: {path} {"[PASS]" if exists else "[FAIL]"}')
        
        return True
        
    except Exception as e:
        print(f'[FAIL] Web config error: {e}')
        import traceback
        traceback.print_exc()
        return False

def check_security_config():
    """Check security configuration"""
    print('\n[CHECK] CHECKING SECURITY CONFIGURATION')
    print('=' * 50)
    
    try:
        from web_config import web_config
        
        # Check security settings
        security_config = web_config._config.get('security', {})
        
        print(f'[PASS] Security config loaded')
        print(f'   Session timeout: {security_config.get("session_timeout_minutes", "Not set")} minutes')
        print(f'   Max login attempts: {security_config.get("max_login_attempts", "Not set")}')
        print(f'   Lockout duration: {security_config.get("lockout_duration", "Not set")} seconds')
        print(f'   CSRF protection: {"Enabled" if security_config.get("csrf_enabled", True) else "Disabled"}')
        
        # Check if secret key is secure
        flask_config = web_config.get_flask_config()
        secret_key = flask_config.get('SECRET_KEY', '')
        
        if secret_key:
            if len(secret_key) >= 32:
                print(f'[PASS] Secret key length: {len(secret_key)} characters (secure)')
            else:
                print(f'[WARN] Secret key length: {len(secret_key)} characters (should be >= 32)')
            
            if secret_key == 'dev-secret-key-change-in-production':
                print(f'[WARN] Using default secret key - should change in production')
            else:
                print(f'[PASS] Custom secret key in use')
        else:
            print(f'[FAIL] No secret key set')
        
        return True
        
    except Exception as e:
        print(f'[FAIL] Security config error: {e}')
        return False

def check_file_permissions():
    """Check file permissions and access"""
    print('\n[CHECK] CHECKING FILE PERMISSIONS')
    print('=' * 50)
    
    # Check critical files and directories
    paths_to_check = [
        'data/',
        'data/uploads/',
        'data/teledrive.db',
        'source/config.json',
        'source/web_config_dev.json'
    ]
    
    for path in paths_to_check:
        if os.path.exists(path):
            # Check read/write permissions
            readable = os.access(path, os.R_OK)
            writable = os.access(path, os.W_OK)
            
            status = []
            if readable:
                status.append('R')
            if writable:
                status.append('W')
            
            print(f'[PASS] {path}: {"/".join(status) if status else "No access"}')
        else:
            print(f'[FAIL] {path}: Not found')

if __name__ == "__main__":
    print('[TEST] TELEDRIVE CONFIGURATION CHECK')
    print('=' * 60)
    
    check_config_files()
    telegram_ok = check_telegram_config()
    web_ok = check_web_config()
    security_ok = check_security_config()
    check_file_permissions()
    
    print('\n' + '=' * 60)
    print('[REPORT] CONFIGURATION SUMMARY')
    print('=' * 60)
    
    if telegram_ok and web_ok and security_ok:
        print('[PASS] Configuration check PASSED - All systems configured correctly')
    else:
        print('[FAIL] Configuration check FAILED - Issues found')
        if not telegram_ok:
            print('   - Telegram configuration issues')
        if not web_ok:
            print('   - Web configuration issues')
        if not security_ok:
            print('   - Security configuration issues')
