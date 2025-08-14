#!/usr/bin/env python3
"""
Test script to check if TeleDrive actually uses Telegram as storage backend
"""

import sys
import os
sys.path.append('source')

from scanner import TelegramFileScanner
from db import db, File, User
from app import app
import config
import asyncio

def check_telegram_config():
    """Check if Telegram API is configured"""
    print("🔍 Checking Telegram Configuration")
    print("=" * 40)
    
    print(f"API_ID: {config.API_ID}")
    print(f"API_HASH: {config.API_HASH[:10]}..." if config.API_HASH else "Not set")
    print(f"PHONE_NUMBER: {config.PHONE_NUMBER}")
    
    if not config.API_ID or not config.API_HASH or not config.PHONE_NUMBER:
        print("❌ Telegram API not configured properly")
        return False
    
    print("✅ Telegram API configured")
    return True

def check_session_file():
    """Check if Telegram session exists"""
    print("\n🔍 Checking Telegram Session")
    print("=" * 40)
    
    session_file = f"{config.SESSION_NAME}.session"
    if os.path.exists(session_file):
        print(f"✅ Session file exists: {session_file}")
        return True
    else:
        print(f"❌ Session file not found: {session_file}")
        return False

def check_database_for_telegram_files():
    """Check database for files from Telegram"""
    print("\n🔍 Checking Database for Telegram Files")
    print("=" * 40)
    
    with app.app_context():
        # Count total files
        total_files = File.query.count()
        print(f"Total files in database: {total_files}")
        
        # Count files from Telegram (have telegram_channel or telegram_message_id)
        telegram_files = File.query.filter(
            (File.telegram_channel.isnot(None)) | 
            (File.telegram_message_id.isnot(None))
        ).all()
        
        print(f"Files from Telegram: {len(telegram_files)}")
        
        # Count uploaded files (no telegram info)
        uploaded_files = File.query.filter(
            (File.telegram_channel.is_(None)) & 
            (File.telegram_message_id.is_(None))
        ).all()
        
        print(f"Files uploaded via web: {len(uploaded_files)}")
        
        if telegram_files:
            print("\n📋 Telegram Files Details:")
            for file in telegram_files[:5]:  # Show first 5
                print(f"  - {file.filename}")
                print(f"    Channel: {file.telegram_channel}")
                print(f"    Message ID: {file.telegram_message_id}")
                print(f"    Date: {file.telegram_date}")
        
        return len(telegram_files) > 0

async def test_telegram_scanner():
    """Test if Telegram scanner can connect"""
    print("\n🔍 Testing Telegram Scanner Connection")
    print("=" * 40)
    
    try:
        scanner = TelegramFileScanner()
        await scanner.initialize()
        
        if scanner.client and scanner.client.is_connected():
            print("✅ Telegram scanner connected successfully")
            
            # Try to get user info
            me = await scanner.client.get_me()
            print(f"✅ Logged in as: {me.first_name} {me.last_name or ''} (@{me.username or 'no_username'})")
            
            await scanner.close()
            return True
        else:
            print("❌ Telegram scanner failed to connect")
            return False
            
    except Exception as e:
        print(f"❌ Telegram scanner error: {e}")
        return False

def check_file_storage_location():
    """Check where files are actually stored"""
    print("\n🔍 Checking File Storage Location")
    print("=" * 40)
    
    # Check local upload directory
    upload_dir = "source/data/uploads"
    if os.path.exists(upload_dir):
        files = os.listdir(upload_dir)
        print(f"Files in local upload directory: {len(files)}")
        if files:
            print("📁 Local files:")
            for file in files[:5]:  # Show first 5
                file_path = os.path.join(upload_dir, file)
                size = os.path.getsize(file_path)
                print(f"  - {file} ({size} bytes)")
    else:
        print("❌ Upload directory not found")
    
    # Check if any files have telegram_channel info but no local file_path
    with app.app_context():
        telegram_only_files = File.query.filter(
            (File.telegram_channel.isnot(None)) & 
            ((File.file_path.is_(None)) | (File.file_path == ''))
        ).all()
        
        if telegram_only_files:
            print(f"\n📡 Files stored only on Telegram: {len(telegram_only_files)}")
            for file in telegram_only_files[:3]:
                print(f"  - {file.filename} (Channel: {file.telegram_channel})")
        else:
            print("\n📡 No files found that are stored only on Telegram")

def analyze_storage_architecture():
    """Analyze the storage architecture"""
    print("\n🔍 Storage Architecture Analysis")
    print("=" * 40)
    
    print("📋 Based on code analysis:")
    print("1. Upload Function:")
    print("   - Files uploaded via web are saved to local filesystem")
    print("   - Path: source/data/uploads/")
    print("   - Database stores local file_path")
    
    print("\n2. Telegram Scanner:")
    print("   - Scans Telegram channels for file metadata")
    print("   - Stores file info in database with telegram_channel/message_id")
    print("   - Does NOT download files to local storage")
    print("   - Creates download links to Telegram")
    
    print("\n3. Download Function:")
    print("   - For uploaded files: serves from local filesystem")
    print("   - For Telegram files: would need to download from Telegram first")
    
    print("\n4. Conclusion:")
    print("   - TeleDrive is NOT using Telegram as primary storage")
    print("   - It's a file manager that can INDEX Telegram channels")
    print("   - Actual file storage is local filesystem")
    print("   - Telegram integration is for SCANNING/INDEXING only")

async def main():
    """Main test function"""
    print("🧪 TeleDrive Storage Backend Analysis")
    print("=" * 50)
    
    # Check configuration
    telegram_configured = check_telegram_config()
    
    # Check session
    session_exists = check_session_file()
    
    # Check database
    has_telegram_files = check_database_for_telegram_files()
    
    # Test scanner if configured
    if telegram_configured and session_exists:
        scanner_works = await test_telegram_scanner()
    else:
        print("\n⚠️ Skipping scanner test - Telegram not properly configured")
        scanner_works = False
    
    # Check file storage
    check_file_storage_location()
    
    # Analyze architecture
    analyze_storage_architecture()
    
    # Final summary
    print("\n" + "=" * 50)
    print("📊 FINAL SUMMARY")
    print("=" * 50)
    
    if has_telegram_files:
        print("✅ TeleDrive HAS Telegram integration (found Telegram files in DB)")
    else:
        print("❌ TeleDrive does NOT have active Telegram integration")
    
    if scanner_works:
        print("✅ Telegram scanner is functional")
    else:
        print("❌ Telegram scanner is not working")
    
    print("\n🎯 CONCLUSION:")
    print("TeleDrive is primarily a LOCAL file storage system")
    print("with optional Telegram channel INDEXING capabilities.")
    print("It does NOT use Telegram as the primary storage backend.")

if __name__ == "__main__":
    asyncio.run(main())
