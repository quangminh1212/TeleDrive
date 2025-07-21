#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update all imports after renaming files and directories
"""

import os
import re
from pathlib import Path

def update_imports_in_file(file_path):
    """Update imports in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Update main package name: teledrive -> app
        content = re.sub(r'from teledrive\.', 'from app.', content)
        content = re.sub(r'import teledrive\.', 'import app.', content)
        content = re.sub(r'from src\.teledrive\.', 'from app.', content)
        content = re.sub(r'import src\.teledrive\.', 'import app.', content)
        
        # Update specific module names
        replacements = {
            # observability -> monitor
            r'from app\.observability': 'from app.monitor',
            r'import app\.observability': 'import app.monitor',
            
            # smart_logger -> logger
            r'from app\.smart_logger': 'from app.logger',
            r'import app\.smart_logger': 'import app.logger',
            
            # log_utils -> logs
            r'from app\.log_utils': 'from app.logs',
            r'import app\.log_utils': 'import app.logs',
            
            # production -> settings
            r'from app\.config\.production': 'from app.config.settings',
            r'import app\.config\.production': 'import app.config.settings',
            
            # filesystem -> files
            r'from app\.services\.filesystem': 'from app.services.files',
            r'import app\.services\.filesystem': 'import app.services.files',
            
            # migrate -> setup
            r'from app\.utils\.migrate': 'from app.utils.setup',
            r'import app\.utils\.migrate': 'import app.utils.setup',
            
            # simple_logger -> logger
            r'from app\.utils\.simple_logger': 'from app.logger',
            r'import app\.utils\.simple_logger': 'import app.logger',
            
            # security_enhanced -> security.enhanced
            r'from app\.security_enhanced': 'from app.security.enhanced',
            r'import app\.security_enhanced': 'import app.security.enhanced',
        }
        
        for old_pattern, new_pattern in replacements.items():
            content = re.sub(old_pattern, new_pattern, content)
        
        # Update any remaining old references
        content = re.sub(r'teledrive\.observability', 'app.monitor', content)
        content = re.sub(r'teledrive\.smart_logger', 'app.logger', content)
        content = re.sub(r'teledrive\.log_utils', 'app.logs', content)
        content = re.sub(r'teledrive\.security_enhanced', 'app.security.enhanced', content)
        
        # If content changed, write it back
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def find_all_python_files():
    """Find all Python files in the project"""
    python_files = []
    
    # Directories to search
    search_dirs = ['src', 'scripts', '.']
    
    for search_dir in search_dirs:
        if os.path.exists(search_dir):
            for root, dirs, files in os.walk(search_dir):
                # Skip certain directories
                dirs[:] = [d for d in dirs if d not in ['__pycache__', '.git', 'venv', 'node_modules']]
                
                for file in files:
                    if file.endswith('.py'):
                        python_files.append(os.path.join(root, file))
    
    return python_files

def main():
    """Main function"""
    print("🔄 Updating imports after renaming...")
    print("=" * 50)
    
    # Find all Python files
    python_files = find_all_python_files()
    
    if not python_files:
        print("❌ No Python files found!")
        return
    
    print(f"📁 Found {len(python_files)} Python files to check")
    print()
    
    fixed_count = 0
    
    for file_path in python_files:
        print(f"🔍 Checking: {file_path}")
        
        if update_imports_in_file(file_path):
            print(f"   ✅ Updated imports in {file_path}")
            fixed_count += 1
        else:
            print(f"   ⏭️  No changes needed in {file_path}")
    
    print()
    print("=" * 50)
    print(f"✅ Import update completed!")
    print(f"📊 Updated {fixed_count} files")
    print("=" * 50)

if __name__ == "__main__":
    main()
