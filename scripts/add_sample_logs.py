#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Add Sample Logs Script
Thêm logs mẫu để test hệ thống logs viewer
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import random

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

def add_sample_logs():
    """Add sample logs to database"""
    try:
        # Import after adding to path
        from teledrive.app import app
        from teledrive.models.logs import LogManager, LogLevel, LogSource

        with app.app_context():
            print("🔄 Adding sample logs...")

            # Sample log messages
            sample_logs = [
                (LogLevel.INFO, LogSource.APP, "Application started successfully", "Server started on port 5000"),
                (LogLevel.INFO, LogSource.AUTH, "User login successful", "User: admin, IP: 192.168.1.100"),
                (LogLevel.WARNING, LogSource.TELEGRAM, "Rate limit approaching", "API calls: 95/100 per minute"),
                (LogLevel.ERROR, LogSource.DATABASE, "Connection timeout", "Failed to connect to database after 30 seconds"),
                (LogLevel.INFO, LogSource.SYSTEM, "Backup completed", "Database backup saved to /backups/db_20250723.sql"),
                (LogLevel.DEBUG, LogSource.APP, "Processing file upload", "File: document.pdf, Size: 2.5MB"),
                (LogLevel.WARNING, LogSource.SECURITY, "Multiple failed login attempts", "IP: 192.168.1.200, Attempts: 5"),
                (LogLevel.INFO, LogSource.TELEGRAM, "Scan session completed", "Found 150 files, Total size: 2.3GB"),
                (LogLevel.ERROR, LogSource.APP, "File processing failed", "Error: Invalid file format"),
                (LogLevel.INFO, LogSource.AUTH, "User logout", "User: admin, Session duration: 2h 15m"),
                (LogLevel.DEBUG, LogSource.DATABASE, "Query executed", "SELECT * FROM users WHERE active=1 (0.05s)"),
                (LogLevel.WARNING, LogSource.SYSTEM, "Disk space low", "Available: 2.1GB, Used: 87%"),
                (LogLevel.INFO, LogSource.TELEGRAM, "New files detected", "Channel: @example_channel, Files: 25"),
                (LogLevel.ERROR, LogSource.SECURITY, "Unauthorized access attempt", "Path: /admin/users, IP: 10.0.0.50"),
                (LogLevel.INFO, LogSource.APP, "Configuration updated", "Telegram API settings modified"),
            ]

            # Add logs with different timestamps
            for i, (level, source, message, details) in enumerate(sample_logs):
                # Create timestamps spread over the last 24 hours
                hours_ago = random.randint(0, 24)
                minutes_ago = random.randint(0, 59)
                timestamp = datetime.utcnow() - timedelta(hours=hours_ago, minutes=minutes_ago)

                # Add some user info for auth logs
                user_id = "admin" if source == LogSource.AUTH else None
                ip_address = f"192.168.1.{random.randint(100, 200)}" if random.choice([True, False]) else None

                log_entry = LogManager.add_log(
                    level=level,
                    source=source,
                    message=message,
                    details=details,
                    user_id=user_id,
                    ip_address=ip_address
                )

                if log_entry:
                    # Update timestamp manually since we want custom times
                    log_entry.timestamp = timestamp
                    from teledrive.database import db
                    db.session.commit()

                print(f"✅ Added log {i+1}: {level.value} - {message}")

            print(f"🎉 Successfully added {len(sample_logs)} sample logs!")

            # Show stats
            stats = LogManager.get_log_stats()
            print(f"📊 Total logs: {stats['total']}")
            print(f"⚠️  Errors: {stats['errors']}")
            print(f"🔶 Warnings: {stats['warnings']}")

    except Exception as e:
        print(f"❌ Error adding sample logs: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    add_sample_logs()