#!/usr/bin/env python3
"""
Script to check current file count and generate test data
"""

import json
import os
import random
from datetime import datetime, timedelta

def check_current_files():
    """Check current scan files"""
    output_dir = "output"
    if not os.path.exists(output_dir):
        print("Output directory not found!")
        return
    
    files = [f for f in os.listdir(output_dir) if f.endswith('_telegram_files.json')]
    
    for file in files:
        filepath = os.path.join(output_dir, file)
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"\n📁 {file}")
        print(f"   Số file: {len(data)}")

        if data and isinstance(data, list):
            print("   Các file:")
            for i, item in enumerate(data[:5]):  # Show first 5
                name = item.get('file_name', 'Unknown')
                ftype = item.get('file_type', 'Unknown')
                size = item.get('file_size', 0)
                print(f"   {i+1}. {name} ({ftype}) - {size} bytes")

            if len(data) > 5:
                print(f"   ... và {len(data) - 5} file khác")
        elif data:
            print(f"   Data type: {type(data)}")
            print(f"   Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")

def generate_test_data():
    """Generate test data with more files"""
    
    # Sample file types and names
    file_types = {
        'document': [
            'Report_2024.pdf', 'Presentation.pptx', 'Spreadsheet.xlsx', 
            'Document.docx', 'Manual.pdf', 'Invoice.pdf', 'Contract.pdf'
        ],
        'image': [
            'photo_001.jpg', 'screenshot.png', 'diagram.png', 'chart.jpg',
            'logo.png', 'banner.jpg', 'profile.jpg', 'thumbnail.png'
        ],
        'video': [
            'meeting_recording.mp4', 'tutorial.avi', 'presentation.mov',
            'demo.mp4', 'webinar.mkv', 'training.mp4'
        ],
        'audio': [
            'podcast.mp3', 'music.wav', 'recording.m4a', 'interview.mp3',
            'audiobook.mp3', 'sound_effect.wav'
        ],
        'archive': [
            'backup.zip', 'project.rar', 'files.7z', 'data.tar.gz',
            'source_code.zip', 'assets.rar'
        ],
        'code': [
            'main.py', 'script.js', 'style.css', 'index.html',
            'config.json', 'README.md', 'app.py'
        ]
    }
    
    # Generate random files
    test_files = []
    total_files = random.randint(800, 1200)  # Random between 800-1200 files
    
    for i in range(total_files):
        file_type = random.choice(list(file_types.keys()))
        file_name = random.choice(file_types[file_type])
        
        # Add random suffix to make unique
        if '.' in file_name:
            name, ext = file_name.rsplit('.', 1)
            file_name = f"{name}_{random.randint(1, 999)}.{ext}"
        
        # Random file size
        if file_type == 'video':
            file_size = random.randint(10_000_000, 500_000_000)  # 10MB - 500MB
        elif file_type == 'audio':
            file_size = random.randint(1_000_000, 50_000_000)    # 1MB - 50MB
        elif file_type == 'image':
            file_size = random.randint(100_000, 10_000_000)      # 100KB - 10MB
        elif file_type == 'archive':
            file_size = random.randint(5_000_000, 100_000_000)   # 5MB - 100MB
        else:
            file_size = random.randint(10_000, 5_000_000)        # 10KB - 5MB
        
        # Random date within last 30 days
        days_ago = random.randint(0, 30)
        date = datetime.now() - timedelta(days=days_ago)
        
        test_file = {
            "message_id": 1000 + i,
            "date": date.isoformat(),
            "file_name": file_name,
            "file_size": file_size,
            "file_type": file_type,
            "mime_type": get_mime_type(file_type),
            "file_id": f"test_file_id_{i}",
            "file_unique_id": f"test_unique_id_{i}",
            "chat_id": -1001234567890,
            "chat_title": "Test Channel",
            "sender_id": 123456789,
            "sender_username": "testuser",
            "caption": f"Test file {i+1}" if random.random() > 0.7 else None,
            "has_media_spoiler": False,
            "is_forwarded": random.random() > 0.8,
            "reply_to_message_id": None,
            "views": random.randint(0, 1000) if random.random() > 0.5 else None
        }
        
        test_files.append(test_file)
    
    return test_files, total_files

def get_mime_type(file_type):
    """Get MIME type for file type"""
    mime_types = {
        'document': 'application/pdf',
        'image': 'image/jpeg',
        'video': 'video/mp4',
        'audio': 'audio/mpeg',
        'archive': 'application/zip',
        'code': 'text/plain'
    }
    return mime_types.get(file_type, 'application/octet-stream')

def create_test_session():
    """Create a new test session with more files"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"output/{timestamp}_telegram_files.json"
    
    test_files, count = generate_test_data()
    
    # Save to file
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(test_files, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Đã tạo session test: {filename}")
    print(f"   Số file: {count}")
    print(f"   Các loại file:")
    
    # Count by type
    type_counts = {}
    for file in test_files:
        ftype = file['file_type']
        type_counts[ftype] = type_counts.get(ftype, 0) + 1
    
    for ftype, count in sorted(type_counts.items()):
        print(f"   - {ftype}: {count} files")

if __name__ == "__main__":
    print("🔍 KIỂM TRA SỐ FILE HIỆN TẠI")
    print("=" * 50)
    check_current_files()
    
    print("\n" + "=" * 50)
    response = input("\nTạo session test với nhiều file hơn? (y/n): ")
    
    if response.lower() in ['y', 'yes']:
        print("\n🚀 TẠO SESSION TEST")
        print("=" * 50)
        create_test_session()
        
        print("\n🔍 KIỂM TRA LẠI SAU KHI TẠO")
        print("=" * 50)
        check_current_files()
