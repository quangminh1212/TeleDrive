#!/usr/bin/env python3
"""
Test SQLite database trực tiếp
"""

import os
import sqlite3
from pathlib import Path

def main():
    print("=== SQLite Database Test ===")
    
    # Kiểm tra thư mục hiện tại
    cwd = os.getcwd()
    print(f"Current directory: {cwd}")
    
    # Tạo thư mục instance
    instance_dir = Path('instance')
    instance_dir.mkdir(exist_ok=True)
    print(f"Instance directory: {instance_dir.absolute()}")
    
    # Tạo database path
    db_path = instance_dir / 'test.db'
    print(f"Database path: {db_path.absolute()}")
    
    try:
        # Tạo connection
        print("Creating connection...")
        conn = sqlite3.connect(str(db_path))
        
        # Tạo cursor
        cursor = conn.cursor()
        
        # Tạo table
        print("Creating table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS test (
                id INTEGER PRIMARY KEY,
                name TEXT
            )
        ''')
        
        # Insert data
        print("Inserting data...")
        cursor.execute("INSERT INTO test (name) VALUES (?)", ("Test User",))
        
        # Commit
        conn.commit()
        
        # Query
        print("Querying data...")
        cursor.execute("SELECT * FROM test")
        rows = cursor.fetchall()
        print(f"Rows: {rows}")
        
        # Close
        conn.close()
        print("Connection closed")
        
        print("=== Test PASSED ===")
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("=== Test FAILED ===")
        return False

if __name__ == "__main__":
    main()
