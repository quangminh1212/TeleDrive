#!/usr/bin/env python3
"""
Test template để kiểm tra lỗi template
"""

import os
import sys
import traceback

# Set environment variable for dev mode
os.environ['DEV_MODE'] = 'true'

def test_template_render():
    """Test render template trực tiếp"""
    try:
        print("🔍 Testing template rendering...")
        
        # Import app và functions
        from src.teledrive.app import app, create_dev_user, dev_mode_enabled
        
        print(f"✅ App imported successfully")
        print(f"🔧 Dev mode enabled: {dev_mode_enabled()}")
        
        # Test create_dev_user
        print("👤 Testing create_dev_user...")
        dev_user = create_dev_user()
        print(f"✅ Dev user created: {dev_user.username}")
        
        # Test template rendering
        print("📄 Testing template rendering...")
        with app.app_context():
            from flask import render_template
            
            # Test render template với dev_user
            html = render_template('index.html', user=dev_user)
            print(f"✅ Template rendered successfully! Length: {len(html)}")
            
            # Kiểm tra một số phần quan trọng
            if 'TeleDrive' in html:
                print("✅ Title found in template")
            else:
                print("❌ Title not found in template")
                
            if 'user' in html.lower():
                print("✅ User data found in template")
            else:
                print("❌ User data not found in template")
                
    except Exception as e:
        print(f"❌ Error testing template: {e}")
        print("\n🔍 Full traceback:")
        traceback.print_exc()

def test_static_files():
    """Test static files"""
    try:
        print("\n🔍 Testing static files...")
        
        from pathlib import Path
        
        # Check CSS files
        css_file = Path('static/css/style.css')
        if css_file.exists():
            print("✅ CSS file exists")
        else:
            print("❌ CSS file missing")
            
        # Check logo
        logo_file = Path('static/images/logo.png')
        if logo_file.exists():
            print("✅ Logo file exists")
        else:
            print("❌ Logo file missing")
            
    except Exception as e:
        print(f"❌ Error checking static files: {e}")

if __name__ == '__main__':
    test_static_files()
    test_template_render()
