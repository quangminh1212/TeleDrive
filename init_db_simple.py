#!/usr/bin/env python3
import os
import sqlite3
from pathlib import Path

# Ensure data directory exists
data_dir = Path('data')
data_dir.mkdir(exist_ok=True)

# Create database file
db_path = data_dir / 'teledrive.db'
print(f"Creating database at: {db_path.absolute()}")

try:
    # Create database connection
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Create basic tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(80) UNIQUE NOT NULL,
            email VARCHAR(120) UNIQUE NOT NULL,
            password_hash VARCHAR(128),
            role VARCHAR(20) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename VARCHAR(255) NOT NULL,
            file_size INTEGER,
            file_type VARCHAR(50),
            telegram_message_id INTEGER,
            telegram_channel VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Insert default admin user
    cursor.execute('''
        INSERT OR IGNORE INTO users (username, email, password_hash, role)
        VALUES ('admin', 'admin@teledrive.local', 'pbkdf2:sha256:600000$dummy$hash', 'admin')
    ''')
    
    conn.commit()
    conn.close()
    
    print("✅ Database created successfully!")
    print(f"📍 Database location: {db_path.absolute()}")
    
except Exception as e:
    print(f"❌ Database creation failed: {e}")
    
