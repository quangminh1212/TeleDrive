#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Clear All Logs Script
Xóa tất cả các file log và làm sạch hệ thống
"""

import os
import glob
import shutil
from pathlib import Path

def clear_all_logs():
    """Xóa tất cả các file log"""
    print("🧹 Clearing all logs...")
    
    # Các thư mục chứa log
    log_directories = [
        'logs',
        'instance',
        'output'
    ]
    
    # Các pattern file log
    log_patterns = [
        '*.log',
        '*.log.*',
        '*.out',
        '*.err'
    ]
    
    total_deleted = 0
    
    # Xóa file log trong các thư mục
    for log_dir in log_directories:
        if os.path.exists(log_dir):
            print(f"   📁 Checking {log_dir}/")
            
            for pattern in log_patterns:
                files = glob.glob(os.path.join(log_dir, pattern))
                for file_path in files:
                    try:
                        os.remove(file_path)
                        print(f"   ✅ Deleted: {file_path}")
                        total_deleted += 1
                    except Exception as e:
                        print(f"   ❌ Error deleting {file_path}: {e}")
    
    # Xóa file log ở root directory
    print("   📁 Checking root directory...")
    for pattern in log_patterns:
        files = glob.glob(pattern)
        for file_path in files:
            try:
                os.remove(file_path)
                print(f"   ✅ Deleted: {file_path}")
                total_deleted += 1
            except Exception as e:
                print(f"   ❌ Error deleting {file_path}: {e}")
    
    # Tạo lại thư mục logs trống
    logs_dir = Path('logs')
    if logs_dir.exists():
        # Xóa toàn bộ thư mục logs
        shutil.rmtree(logs_dir)
        print("   ✅ Removed logs directory")
    
    # Tạo lại thư mục logs trống
    logs_dir.mkdir(exist_ok=True)
    print("   ✅ Created empty logs directory")
    
    # Tạo file .gitkeep để giữ thư mục trong git
    gitkeep_file = logs_dir / '.gitkeep'
    gitkeep_file.touch()
    print("   ✅ Created .gitkeep file")
    
    print(f"\n📊 Summary:")
    print(f"   🗑️  Total files deleted: {total_deleted}")
    print(f"   ✨ Logs directory cleaned")
    print(f"   🎯 System is now clean!")

def clear_cache():
    """Xóa cache files"""
    print("\n🗂️ Clearing cache files...")
    
    cache_patterns = [
        '__pycache__',
        '*.pyc',
        '*.pyo',
        '*.pyd',
        '.pytest_cache',
        '.mypy_cache',
        '.coverage',
        'htmlcov'
    ]
    
    total_deleted = 0
    
    # Tìm và xóa cache directories
    for root, dirs, files in os.walk('.'):
        # Skip venv directory
        if 'venv' in root or '.git' in root:
            continue
            
        for dir_name in dirs[:]:  # Use slice to avoid modification during iteration
            if dir_name == '__pycache__':
                cache_path = os.path.join(root, dir_name)
                try:
                    shutil.rmtree(cache_path)
                    print(f"   ✅ Deleted cache: {cache_path}")
                    total_deleted += 1
                    dirs.remove(dir_name)  # Don't recurse into deleted directory
                except Exception as e:
                    print(f"   ❌ Error deleting {cache_path}: {e}")
        
        # Delete cache files
        for file_name in files:
            if file_name.endswith(('.pyc', '.pyo', '.pyd')):
                file_path = os.path.join(root, file_name)
                try:
                    os.remove(file_path)
                    print(f"   ✅ Deleted cache file: {file_path}")
                    total_deleted += 1
                except Exception as e:
                    print(f"   ❌ Error deleting {file_path}: {e}")
    
    print(f"   🗑️  Total cache items deleted: {total_deleted}")

def main():
    """Main function"""
    print("🚀 TeleDrive Log Cleaner")
    print("=" * 40)
    
    clear_all_logs()
    clear_cache()
    
    print("\n" + "=" * 40)
    print("✅ All logs and cache cleared!")
    print("🎉 Your TeleDrive is now clean and ready to run silently!")
    print("\n💡 Use these commands to run without logs:")
    print("   python run_silent.py")
    print("   python clean.py")
    print("   python main.py")

if __name__ == '__main__':
    main()
