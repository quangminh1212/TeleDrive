#!/usr/bin/env python3
"""
Database migration script to add Telegram storage fields
"""

import sys
import os
sys.path.append('.')

from app import app
from db import db

def migrate_database():
    """Add new columns for Telegram storage"""
    print("🔄 Migrating database for Telegram storage...")
    
    with app.app_context():
        try:
            # Check if columns already exist
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('files')]
            
            migrations = []
            
            # Add new columns if they don't exist
            if 'telegram_file_id' not in columns:
                migrations.append("ALTER TABLE files ADD COLUMN telegram_file_id VARCHAR(255)")
            
            if 'telegram_unique_id' not in columns:
                migrations.append("ALTER TABLE files ADD COLUMN telegram_unique_id VARCHAR(255)")
            
            if 'telegram_access_hash' not in columns:
                migrations.append("ALTER TABLE files ADD COLUMN telegram_access_hash VARCHAR(255)")
            
            if 'telegram_file_reference' not in columns:
                migrations.append("ALTER TABLE files ADD COLUMN telegram_file_reference BLOB")
            
            if 'storage_type' not in columns:
                migrations.append("ALTER TABLE files ADD COLUMN storage_type VARCHAR(20) DEFAULT 'local'")
            
            # Execute migrations
            if migrations:
                print(f"📝 Executing {len(migrations)} migrations...")
                for migration in migrations:
                    print(f"   - {migration}")
                    db.engine.execute(migration)
                
                # Update existing files to have storage_type = 'local'
                db.engine.execute("UPDATE files SET storage_type = 'local' WHERE storage_type IS NULL")
                
                print("✅ Database migration completed successfully")
            else:
                print("✅ Database already up to date")
                
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            return False
    
    return True

if __name__ == "__main__":
    migrate_database()
