#!/usr/bin/env python3
"""
Database Migration Script for TeleDrive
Updates existing database schema to match current models
"""

import sqlite3
import os
from pathlib import Path

# Database path
PROJECT_ROOT = Path(__file__).parent.parent
DATABASE_FILE = PROJECT_ROOT / 'data' / 'teledrive.db'

def get_table_columns(cursor, table_name):
    """Get existing columns for a table"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return [row[1] for row in cursor.fetchall()]

def migrate_users_table(cursor):
    """Migrate users table to add missing columns"""
    print("🔄 Migrating users table...")
    
    existing_columns = get_table_columns(cursor, 'users')
    print(f"   Existing columns: {existing_columns}")
    
    # Define all expected columns with their SQL definitions
    expected_columns = {
        'reset_token': 'VARCHAR(64)',
        'reset_token_expires': 'DATETIME',
        'failed_login_attempts': 'INTEGER DEFAULT 0',
        'locked_until': 'DATETIME',
        'last_login_attempt': 'DATETIME',
        'email_verified': 'BOOLEAN DEFAULT 0',
        'email_verification_token': 'VARCHAR(64)',
        'is_active': 'BOOLEAN DEFAULT 1',
        'updated_at': 'DATETIME DEFAULT CURRENT_TIMESTAMP',
        'telegram_id': 'VARCHAR(50)',
        'phone_number': 'VARCHAR(20)',
        'first_name': 'VARCHAR(100)',
        'last_name': 'VARCHAR(100)',
        'auth_method': 'VARCHAR(20) DEFAULT "password"'
    }
    
    # Add missing columns
    for column, definition in expected_columns.items():
        if column not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {column} {definition}")
                print(f"   ✅ Added column: {column}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"   ⚠️ Failed to add column {column}: {e}")

def migrate_files_table(cursor):
    """Migrate files table to add missing columns"""
    print("🔄 Migrating files table...")
    
    existing_columns = get_table_columns(cursor, 'files')
    print(f"   Existing columns: {existing_columns}")
    
    # Define expected columns
    expected_columns = {
        'original_filename': 'VARCHAR(255)',
        'file_path': 'VARCHAR(500)',
        'mime_type': 'VARCHAR(100)',
        'folder_id': 'INTEGER',
        'telegram_channel_id': 'VARCHAR(100)',
        'tags': 'TEXT',
        'file_metadata': 'TEXT',
        'description': 'TEXT',
        'is_deleted': 'BOOLEAN DEFAULT 0',
        'is_favorite': 'BOOLEAN DEFAULT 0',
        'download_count': 'INTEGER DEFAULT 0',
        'current_version': 'INTEGER DEFAULT 1',
        'version_count': 'INTEGER DEFAULT 1',
        'updated_at': 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    }
    
    # Add missing columns
    for column, definition in expected_columns.items():
        if column not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE files ADD COLUMN {column} {definition}")
                print(f"   ✅ Added column: {column}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e):
                    print(f"   ⚠️ Failed to add column {column}: {e}")

def create_missing_tables(cursor):
    """Create any missing tables"""
    print("🔄 Creating missing tables...")
    
    # Check if folders table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='folders'")
    if not cursor.fetchone():
        print("   Creating folders table...")
        cursor.execute('''
            CREATE TABLE folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                parent_id INTEGER,
                user_id INTEGER NOT NULL,
                is_deleted BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES folders (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        print("   ✅ Created folders table")
    
    # Check if scan_sessions table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='scan_sessions'")
    if not cursor.fetchone():
        print("   Creating scan_sessions table...")
        cursor.execute('''
            CREATE TABLE scan_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_name VARCHAR(255) NOT NULL,
                channel_id VARCHAR(100),
                user_id INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                files_found INTEGER DEFAULT 0,
                messages_scanned INTEGER DEFAULT 0,
                total_messages INTEGER DEFAULT 0,
                error_message TEXT,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        print("   ✅ Created scan_sessions table")
    
    # Check if activity_logs table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs'")
    if not cursor.fetchone():
        print("   Creating activity_logs table...")
        cursor.execute('''
            CREATE TABLE activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                file_id INTEGER,
                action VARCHAR(50) NOT NULL,
                description TEXT,
                activity_metadata TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                session_id VARCHAR(64),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (file_id) REFERENCES files (id)
            )
        ''')
        print("   ✅ Created activity_logs table")

def main():
    """Main migration function"""
    print("🚀 Starting database migration...")
    print(f"📍 Database file: {DATABASE_FILE}")
    
    if not DATABASE_FILE.exists():
        print("❌ Database file does not exist!")
        return
    
    try:
        # Connect to database
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        # Run migrations
        migrate_users_table(cursor)
        migrate_files_table(cursor)
        create_missing_tables(cursor)
        
        # Commit changes
        conn.commit()
        print("✅ Database migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
