#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple Log Cleaner
Xóa log files một cách an toàn
"""

import os
import glob

def clear_logs_safe():
    """Xóa log files một cách an toàn"""
    print("🧹 Clearing logs safely...")
    
    log_files = [
        'logs/api.log',
        'logs/config.log', 
        'logs/errors.log',
        'logs/files.log',
        'logs/scanner.log',
        'logs/teledrive.log'
    ]
    
    deleted_count = 0
    
    for log_file in log_files:
        if os.path.exists(log_file):
            try:
                # Thử xóa file
                os.remove(log_file)
                print(f"   ✅ Deleted: {log_file}")
                deleted_count += 1
            except PermissionError:
                # Nếu không xóa được, tạo file trống
                try:
                    with open(log_file, 'w') as f:
                        f.write('')
                    print(f"   🔄 Cleared content: {log_file}")
                    deleted_count += 1
                except Exception as e:
                    print(f"   ❌ Cannot clear {log_file}: {e}")
            except Exception as e:
                print(f"   ❌ Error with {log_file}: {e}")
    
    print(f"\n📊 Processed {deleted_count} log files")
    print("✅ Logs cleared!")

if __name__ == '__main__':
    clear_logs_safe()
