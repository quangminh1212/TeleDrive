#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Create Logs Table Script
Tạo bảng logs trong database
"""

import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

def create_logs_table():
    """Create logs table in database"""
    try:
        # Import after adding to path
        from teledrive.app import app
        from teledrive.database import db
        from teledrive.models.logs import LogEntry

        with app.app_context():
            print("🔄 Creating logs table...")

            # Create all tables
            db.create_all()

            print("✅ Logs table created successfully!")

            # Check if table exists
            from sqlalchemy import text
            result = db.session.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='log_entries'")).fetchone()

            if result:
                print("✅ log_entries table confirmed in database")
            else:
                print("❌ log_entries table not found")

    except Exception as e:
        print(f"❌ Error creating logs table: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    create_logs_table()