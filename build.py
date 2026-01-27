#!/usr/bin/env python3
"""
Build script for TeleDrive Desktop Application
Creates standalone executable using PyInstaller
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def clean_build():
    """Clean previous build artifacts"""
    print("Cleaning previous build artifacts...")
    dirs_to_clean = ['build', 'dist', '__pycache__']
    for dir_name in dirs_to_clean:
        if os.path.exists(dir_name):
            shutil.rmtree(dir_name)
            print(f"  Removed {dir_name}/")
    
    # Remove spec file if exists
    if os.path.exists('TeleDrive.spec'):
        os.remove('TeleDrive.spec')
        print("  Removed TeleDrive.spec")

def create_spec_file():
    """Create PyInstaller spec file"""
    spec_content = """# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('app/templates', 'app/templates'),
        ('app/static', 'app/static'),
        ('.env.example', '.'),
    ],
    hiddenimports=[
        'flask',
        'flask_sqlalchemy',
        'flask_login',
        'flask_wtf',
        'flask_socketio',
        'eventlet',
        'telethon',
        'sqlalchemy',
        'bcrypt',
        'wtforms',
        'email_validator',
        'openpyxl',
        'pandas',
        'tqdm',
        'aiofiles',
        'requests',
        'webview',
        'pystray',
        'PIL',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='TeleDrive',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # No console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='icon.ico' if os.path.exists('icon.ico') else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='TeleDrive',
)
"""
    
    with open('TeleDrive.spec', 'w', encoding='utf-8') as f:
        f.write(spec_content)
    print("Created TeleDrive.spec")

def build_executable():
    """Build the executable using PyInstaller"""
    print("\nBuilding executable...")
    print("This may take several minutes...\n")
    
    try:
        subprocess.run(
            ['pyinstaller', 'TeleDrive.spec', '--clean'],
            check=True
        )
        print("\n✅ Build successful!")
        print(f"Executable location: {os.path.abspath('dist/TeleDrive/TeleDrive.exe')}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Build failed: {e}")
        return False
    except FileNotFoundError:
        print("\n❌ PyInstaller not found. Install it with: pip install pyinstaller")
        return False

def create_readme():
    """Create README for distribution"""
    readme_content = """# TeleDrive Desktop Application

## Hướng dẫn sử dụng

1. Chạy TeleDrive.exe
2. Ứng dụng sẽ tự động mở trong cửa sổ desktop
3. Đăng nhập bằng Telegram của bạn
4. Bắt đầu quản lý files!

## Yêu cầu hệ thống

- Windows 10 hoặc mới hơn
- Kết nối Internet
- Tài khoản Telegram

## Cấu trúc thư mục

- data/ - Dữ liệu ứng dụng và database
- logs/ - Log files
- .env - Cấu hình (tạo từ .env.example)

## Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra file teledrive.log trong thư mục ứng dụng.
"""
    
    dist_path = Path('dist/TeleDrive')
    if dist_path.exists():
        with open(dist_path / 'README.txt', 'w', encoding='utf-8') as f:
            f.write(readme_content)
        print("Created README.txt in distribution folder")

def main():
    """Main build process"""
    print("=" * 60)
    print("TeleDrive Desktop Application - Build Script")
    print("=" * 60)
    
    # Step 1: Clean
    clean_build()
    
    # Step 2: Create spec file
    create_spec_file()
    
    # Step 3: Build
    if build_executable():
        # Step 4: Create README
        create_readme()
        
        print("\n" + "=" * 60)
        print("Build complete! Distribution folder: dist/TeleDrive/")
        print("=" * 60)
        return 0
    else:
        return 1

if __name__ == '__main__':
    sys.exit(main())
