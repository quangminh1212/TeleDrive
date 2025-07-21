#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix Import Statements Script
Automatically fix all 'from src.' imports to 'from app.' in the teledrive package
"""

import os
import re
from pathlib import Path

def fix_imports_in_file(file_path):
    """Fix imports in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace 'from src.' with 'from app.'
        content = re.sub(r'from src\.', 'from app.', content)
        
        # Replace 'import src.' with 'import app.'
        content = re.sub(r'import src\.', 'import app.', content)
        
        # If content changed, write it back
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def find_python_files_in_teledrive():
    """Find all Python files in src/teledrive directory"""
    teledrive_dir = Path('src/teledrive')
    if not teledrive_dir.exists():
        print("❌ src/teledrive directory not found!")
        return []
    
    python_files = []
    for file_path in teledrive_dir.rglob('*.py'):
        python_files.append(file_path)
    
    return python_files

def main():
    """Main function"""
    print("🔧 Fixing import statements in TeleDrive package...")
    print("=" * 50)
    
    # Find all Python files in teledrive package
    python_files = find_python_files_in_teledrive()
    
    if not python_files:
        print("❌ No Python files found in src/teledrive/")
        return
    
    print(f"📁 Found {len(python_files)} Python files to check")
    print()
    
    fixed_count = 0
    
    for file_path in python_files:
        print(f"🔍 Checking: {file_path}")
        
        if fix_imports_in_file(file_path):
            print(f"   ✅ Fixed imports in {file_path}")
            fixed_count += 1
        else:
            print(f"   ⏭️  No changes needed in {file_path}")
    
    print()
    print("=" * 50)
    print(f"📊 Summary:")
    print(f"   📁 Total files checked: {len(python_files)}")
    print(f"   ✅ Files fixed: {fixed_count}")
    print(f"   ⏭️  Files unchanged: {len(python_files) - fixed_count}")
    
    if fixed_count > 0:
        print()
        print("🎉 Import statements have been fixed!")
        print("💡 You can now try running: run.bat")
    else:
        print()
        print("ℹ️  All import statements are already correct!")

if __name__ == '__main__':
    main()
