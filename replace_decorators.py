#!/usr/bin/env python3
"""
Script để thay thế tất cả @login_required và @admin_required 
bằng @dev_login_required và @dev_admin_required trong app.py
"""

import re

def replace_decorators():
    """Thay thế decorators trong app.py"""
    file_path = "src/teledrive/app.py"
    
    # Đọc file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Thay thế @login_required
    content = re.sub(r'@login_required', '@dev_login_required', content)
    
    # Thay thế @admin_required
    content = re.sub(r'@admin_required', '@dev_admin_required', content)
    
    # Ghi lại file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Đã thay thế tất cả decorators trong app.py")
    print("   @login_required -> @dev_login_required")
    print("   @admin_required -> @dev_admin_required")

if __name__ == "__main__":
    replace_decorators()
