"""
Migration script to add unique_id column and populate it for existing files.
Run this once to add the unique_id field for existing records.
"""
import time
import sys
import os
import sqlite3

def migrate_unique_ids():
    """Add unique_id column and populate it for existing files"""
    
    # Find database file
    db_paths = [
        'data/teledrive.db',
        '../data/teledrive.db',
        'teledrive.db',
        'instance/teledrive.db'
    ]
    
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        print("❌ Database file not found!")
        return
    
    print(f"📂 Using database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if unique_id column exists
        cursor.execute("PRAGMA table_info(files)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'unique_id' not in columns:
            print("Adding unique_id column to files table...")
            cursor.execute("ALTER TABLE files ADD COLUMN unique_id TEXT")
            conn.commit()
            print("✅ Added unique_id column")
        else:
            print("✅ unique_id column already exists")
        
        # Get files without unique_id
        cursor.execute("SELECT id FROM files WHERE unique_id IS NULL OR unique_id = ''")
        files = cursor.fetchall()
        
        print(f"Found {len(files)} files without unique_id")
        
        updated_count = 0
        for (file_id,) in files:
            # Generate unique_id based on epoch timestamp + file id
            unique_id = f"{int(time.time() * 1000000)}_{file_id}"
            cursor.execute("UPDATE files SET unique_id = ? WHERE id = ?", (unique_id, file_id))
            updated_count += 1
            
            if updated_count % 100 == 0:
                print(f"Updated {updated_count} files...")
        
        if updated_count > 0:
            conn.commit()
            print(f"✅ Successfully updated {updated_count} files with unique_id")
        else:
            print("✅ All files already have unique_id")
        
        # Create index if not exists
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_files_unique_id ON files(unique_id)")
            conn.commit()
            print("✅ Index created on unique_id")
        except Exception as e:
            print(f"⚠️ Could not create index: {e}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_unique_ids()
