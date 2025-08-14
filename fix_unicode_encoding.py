#!/usr/bin/env python3
"""
Fix Unicode encoding issues in test scripts for Windows compatibility
"""

import os
import re

def fix_unicode_in_file(file_path):
    """Fix Unicode characters in a file"""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace Unicode emojis with ASCII equivalents
        replacements = {
            '🔍': '[CHECK]',
            '🧪': '[TEST]',
            '✅': '[PASS]',
            '❌': '[FAIL]',
            '⚠️': '[WARN]',
            '📊': '[REPORT]',
            '🎉': '[SUCCESS]',
            '🔧': '[CONFIG]',
            '📁': '[FILE]',
            '🌐': '[WEB]',
            '🚀': '[START]',
            '🎯': '[TARGET]',
            '📋': '[LIST]',
            '💾': '[DB]',
            '🔐': '[SECURITY]',
            '📱': '[TELEGRAM]',
            '⏳': '[WAIT]',
            '🔄': '[RETRY]',
            '🧹': '[CLEANUP]',
            '📄': '[DOC]',
            '🎊': '[COMPLETE]',
        }
        
        # Apply replacements
        for unicode_char, ascii_replacement in replacements.items():
            content = content.replace(unicode_char, ascii_replacement)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Fixed Unicode in: {file_path}")
        return True
        
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def main():
    """Fix Unicode in all test scripts"""
    test_scripts = [
        'check_syntax_imports.py',
        'check_configuration.py', 
        'check_database.py',
        'comprehensive_test_suite.py',
        'advanced_edge_case_tests.py',
        'telegram_integration_test.py'
    ]
    
    print("Fixing Unicode encoding issues in test scripts...")
    
    fixed_count = 0
    for script in test_scripts:
        if fix_unicode_in_file(script):
            fixed_count += 1
    
    print(f"\nFixed {fixed_count}/{len(test_scripts)} files")
    
    if fixed_count == len(test_scripts):
        print("All files fixed successfully!")
        return True
    else:
        print("Some files could not be fixed")
        return False

if __name__ == "__main__":
    main()
