#!/usr/bin/env python3
"""
Check database schema and integrity
"""

import sys
import os
sys.path.append('source')

from app import app
from db import db, File, User, Folder
import sqlite3

def check_database_schema():
    """Check database schema and tables"""
    print('[CHECK] CHECKING DATABASE SCHEMA')
    print('=' * 50)
    
    with app.app_context():
        try:
            # Check if database file exists
            db_path = 'data/teledrive.db'
            if os.path.exists(db_path):
                print(f'[PASS] Database file exists: {db_path}')
                
                # Get file size
                size = os.path.getsize(db_path)
                print(f'   Size: {size} bytes')
            else:
                print(f'[FAIL] Database file not found: {db_path}')
                return False
            
            # Check tables
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f'[PASS] Found {len(tables)} tables: {tables}')
            
            # Check specific tables
            required_tables = ['users', 'files', 'folders', 'scan_sessions']
            for table in required_tables:
                if table in tables:
                    print(f'[PASS] Table {table} exists')
                    
                    # Get columns
                    columns = inspector.get_columns(table)
                    print(f'   Columns: {[col["name"] for col in columns]}')
                else:
                    print(f'[FAIL] Table {table} missing')
            
            # Check File table specifically for Telegram fields
            if 'files' in tables:
                columns = [col['name'] for col in inspector.get_columns('files')]
                telegram_fields = [
                    'telegram_message_id', 'telegram_channel', 'telegram_channel_id',
                    'telegram_file_id', 'telegram_unique_id', 'telegram_access_hash',
                    'telegram_file_reference', 'storage_type'
                ]
                
                print(f'\\n[CHECK] Checking Telegram storage fields in files table:')
                for field in telegram_fields:
                    if field in columns:
                        print(f'[PASS] {field}')
                    else:
                        print(f'[FAIL] {field} - MISSING')
            
            return True
            
        except Exception as e:
            print(f'[FAIL] Database check error: {e}')
            import traceback
            traceback.print_exc()
            return False

def check_database_data():
    """Check database data integrity"""
    print('\\n[CHECK] CHECKING DATABASE DATA')
    print('=' * 50)
    
    with app.app_context():
        try:
            # Count records
            user_count = User.query.count()
            file_count = File.query.count()
            folder_count = Folder.query.count()
            
            print(f'[PASS] Users: {user_count}')
            print(f'[PASS] Files: {file_count}')
            print(f'[PASS] Folders: {folder_count}')
            
            # Check file storage types
            if file_count > 0:
                local_files = File.query.filter_by(storage_type='local').count()
                telegram_files = File.query.filter_by(storage_type='telegram').count()
                unknown_files = File.query.filter(File.storage_type.is_(None)).count()
                
                print(f'\\n[FILE] File storage breakdown:')
                print(f'   Local storage: {local_files}')
                print(f'   Telegram storage: {telegram_files}')
                print(f'   Unknown/NULL storage: {unknown_files}')
                
                # Check for files with Telegram data
                telegram_data_files = File.query.filter(
                    File.telegram_message_id.isnot(None)
                ).count()
                print(f'   Files with Telegram data: {telegram_data_files}')
            
            # Test File model methods
            print(f'\\n[CHECK] Testing File model methods:')
            test_file = File()
            test_file.storage_type = 'telegram'
            test_file.telegram_message_id = 123
            
            print(f'[PASS] is_stored_on_telegram(): {test_file.is_stored_on_telegram()}')
            
            test_file.storage_type = 'local'
            test_file.file_path = '/test/path'
            print(f'[PASS] is_stored_locally(): {test_file.is_stored_locally()}')
            
            return True
            
        except Exception as e:
            print(f'[FAIL] Database data check error: {e}')
            import traceback
            traceback.print_exc()
            return False

def check_database_integrity():
    """Check database integrity using SQLite PRAGMA"""
    print('\\n[CHECK] CHECKING DATABASE INTEGRITY')
    print('=' * 50)
    
    try:
        db_path = 'data/teledrive.db'
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check integrity
        cursor.execute('PRAGMA integrity_check')
        result = cursor.fetchone()
        
        if result[0] == 'ok':
            print('[PASS] Database integrity check passed')
        else:
            print(f'[FAIL] Database integrity issues: {result[0]}')
        
        # Check foreign key constraints
        cursor.execute('PRAGMA foreign_key_check')
        fk_errors = cursor.fetchall()
        
        if not fk_errors:
            print('[PASS] Foreign key constraints OK')
        else:
            print(f'[FAIL] Foreign key constraint errors: {fk_errors}')
        
        conn.close()
        return True
        
    except Exception as e:
        print(f'[FAIL] Database integrity check error: {e}')
        return False

if __name__ == "__main__":
    print('[TEST] TELEDRIVE DATABASE CHECK')
    print('=' * 60)
    
    schema_ok = check_database_schema()
    data_ok = check_database_data()
    integrity_ok = check_database_integrity()
    
    print('\\n' + '=' * 60)
    print('[REPORT] SUMMARY')
    print('=' * 60)
    
    if schema_ok and data_ok and integrity_ok:
        print('[PASS] Database check PASSED - All systems OK')
    else:
        print('[FAIL] Database check FAILED - Issues found')
        if not schema_ok:
            print('   - Schema issues detected')
        if not data_ok:
            print('   - Data issues detected')
        if not integrity_ok:
            print('   - Integrity issues detected')
