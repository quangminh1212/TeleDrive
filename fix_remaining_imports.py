#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix Remaining Import Issues
Sửa các import 'from src.' còn lại trong project
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
        
        # Replace 'from src.' with 'from teledrive.'
        content = re.sub(r'from src\.', 'from teledrive.', content)
        
        # Replace 'import src.' with 'import teledrive.'
        content = re.sub(r'import src\.', 'import teledrive.', content)
        
        # If content changed, write it back
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def main():
    """Main function"""
    print("🔧 Fixing remaining import issues...")
    print("=" * 50)
    
    # Files that need fixing based on the check
    files_to_fix = [
        'clean.py',
        'main.py', 
        'scripts/create_admin.py',
        'scripts/migrate.py',
        'scripts/production.py',
        'scripts/verify.py'
    ]
    
    fixed_count = 0
    
    for file_path in files_to_fix:
        if Path(file_path).exists():
            print(f"🔍 Checking: {file_path}")
            
            if fix_imports_in_file(file_path):
                print(f"   ✅ Fixed imports in {file_path}")
                fixed_count += 1
            else:
                print(f"   ⏭️  No changes needed in {file_path}")
        else:
            print(f"   ⚠️  File not found: {file_path}")
    
    print()
    print("=" * 50)
    print(f"📊 Summary:")
    print(f"   📁 Total files checked: {len(files_to_fix)}")
    print(f"   ✅ Files fixed: {fixed_count}")
    
    if fixed_count > 0:
        print()
        print("🎉 Import statements have been fixed!")
        print("💡 Run the project health check again to verify")
    else:
        print()
        print("ℹ️  All import statements are already correct!")

if __name__ == '__main__':
    main()
