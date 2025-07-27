#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Cleanup Script
Script tự động dọn dẹp các file dư thừa trong dự án
"""

import os
import shutil
import glob
from pathlib import Path
from datetime import datetime, timedelta

def cleanup_pycache():
    """Xóa tất cả thư mục __pycache__"""
    print("🧹 Dọn dẹp __pycache__ directories...")
    count = 0
    for root, dirs, files in os.walk('.'):
        if '__pycache__' in dirs:
            pycache_path = os.path.join(root, '__pycache__')
            try:
                shutil.rmtree(pycache_path)
                print(f"   ✅ Đã xóa: {pycache_path}")
                count += 1
            except Exception as e:
                print(f"   ❌ Lỗi xóa {pycache_path}: {e}")
    print(f"   📊 Đã xóa {count} thư mục __pycache__")

def cleanup_logs():
    """Dọn dẹp log files cũ"""
    print("📝 Dọn dẹp log files...")
    logs_dir = Path("logs")
    if logs_dir.exists():
        for log_file in logs_dir.glob("*.log"):
            try:
                # Chỉ xóa nội dung, giữ lại file
                with open(log_file, 'w') as f:
                    f.write("")
                print(f"   ✅ Đã làm trống: {log_file}")
            except Exception as e:
                print(f"   ❌ Lỗi làm trống {log_file}: {e}")

def cleanup_old_outputs(days=7):
    """Xóa các file output cũ hơn X ngày"""
    print(f"📁 Dọn dẹp output files cũ hơn {days} ngày...")
    output_dir = Path("output")
    if output_dir.exists():
        cutoff_date = datetime.now() - timedelta(days=days)
        count = 0

        for file in output_dir.glob("*"):
            if file.is_file() and file.name != '.gitkeep':
                try:
                    file_time = datetime.fromtimestamp(file.stat().st_mtime)
                    if file_time < cutoff_date:
                        file.unlink()
                        print(f"   ✅ Đã xóa: {file}")
                        count += 1
                except Exception as e:
                    print(f"   ❌ Lỗi xóa {file}: {e}")

        print(f"   📊 Đã xóa {count} file output cũ")

def cleanup_temp_files():
    """Xóa các file tạm thời"""
    print("🗑️ Dọn dẹp temp files...")
    patterns = ['*.tmp', '*.bak', '*.old', '*~', '*.swp', '*.swo']
    count = 0

    for pattern in patterns:
        for file in glob.glob(pattern, recursive=True):
            try:
                os.remove(file)
                print(f"   ✅ Đã xóa: {file}")
                count += 1
            except Exception as e:
                print(f"   ❌ Lỗi xóa {file}: {e}")

    print(f"   📊 Đã xóa {count} temp files")

def cleanup_old_backups(keep_latest=2):
    """Giữ lại chỉ N backup database mới nhất"""
    print(f"💾 Dọn dẹp database backups (giữ {keep_latest} file mới nhất)...")
    instance_dir = Path("instance")
    if instance_dir.exists():
        backup_files = list(instance_dir.glob("*_backup_*.db"))
        backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

        files_to_remove = backup_files[keep_latest:]
        for file in files_to_remove:
            try:
                file.unlink()
                print(f"   ✅ Đã xóa backup cũ: {file}")
            except Exception as e:
                print(f"   ❌ Lỗi xóa {file}: {e}")

        print(f"   📊 Đã xóa {len(files_to_remove)} backup files cũ")

def main():
    """Main cleanup function"""
    print("🚀 Bắt đầu dọn dẹp dự án TeleDrive...")
    print("=" * 50)

    cleanup_pycache()
    print()

    cleanup_logs()
    print()

    cleanup_old_outputs(days=7)
    print()

    cleanup_temp_files()
    print()

    cleanup_old_backups(keep_latest=2)
    print()

    print("=" * 50)
    print("✅ Hoàn thành dọn dẹp dự án!")

if __name__ == '__main__':
    main()
