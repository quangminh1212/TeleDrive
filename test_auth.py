#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script cho TeleDrive Authentication System
Script kiểm tra các chức năng xác thực cơ bản
"""

import sys
import os
import requests
import json
from pathlib import Path

# Thêm thư mục hiện tại vào Python path
sys.path.insert(0, str(Path(__file__).parent))

def test_server_running():
    """Kiểm tra server có đang chạy không"""
    try:
        response = requests.get('http://localhost:5000/login', timeout=5)
        return response.status_code in [200, 302]
    except requests.exceptions.RequestException:
        return False

def test_setup_page():
    """Test trang setup"""
    try:
        response = requests.get('http://localhost:5000/setup')
        print(f"✅ Setup page accessible: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Setup page error: {e}")
        return False

def test_create_admin_user():
    """Test tạo admin user"""
    try:
        data = {
            'username': 'admin',
            'email': 'admin@teledrive.local',
            'password': 'admin123',
            'confirm_password': 'admin123'
        }
        
        response = requests.post('http://localhost:5000/setup', 
                               json=data,
                               headers={'Content-Type': 'application/json'})
        
        result = response.json()
        
        if response.status_code == 200 and result.get('success'):
            print(f"✅ Admin user created successfully: {result.get('message')}")
            return True
        else:
            print(f"❌ Failed to create admin user: {result.get('message')}")
            return False
            
    except Exception as e:
        print(f"❌ Create admin user error: {e}")
        return False

def test_login():
    """Test đăng nhập"""
    try:
        data = {
            'username': 'admin',
            'password': 'admin123'
        }
        
        session = requests.Session()
        response = session.post('http://localhost:5000/login',
                              json=data,
                              headers={'Content-Type': 'application/json'})
        
        result = response.json()
        
        if response.status_code == 200 and result.get('success'):
            print(f"✅ Login successful: {result.get('message')}")
            return session
        else:
            print(f"❌ Login failed: {result.get('message')}")
            return None
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_protected_routes(session):
    """Test các route được bảo vệ"""
    if not session:
        print("❌ No session available for testing protected routes")
        return False
    
    protected_routes = [
        '/',
        '/api/scans',
        '/api/user/info'
    ]
    
    success_count = 0
    
    for route in protected_routes:
        try:
            response = session.get(f'http://localhost:5000{route}')
            if response.status_code == 200:
                print(f"✅ Protected route accessible: {route}")
                success_count += 1
            else:
                print(f"❌ Protected route failed: {route} (status: {response.status_code})")
        except Exception as e:
            print(f"❌ Protected route error {route}: {e}")
    
    return success_count == len(protected_routes)

def test_logout(session):
    """Test đăng xuất"""
    if not session:
        print("❌ No session available for testing logout")
        return False
    
    try:
        response = session.post('http://localhost:5000/logout',
                              headers={'Content-Type': 'application/json'})
        
        result = response.json()
        
        if response.status_code == 200 and result.get('success'):
            print(f"✅ Logout successful: {result.get('message')}")
            return True
        else:
            print(f"❌ Logout failed: {result.get('message')}")
            return False
            
    except Exception as e:
        print(f"❌ Logout error: {e}")
        return False

def test_unauthorized_access():
    """Test truy cập không được phép"""
    try:
        # Test truy cập route được bảo vệ mà không đăng nhập
        response = requests.get('http://localhost:5000/api/scans')
        
        if response.status_code == 401:
            print("✅ Unauthorized access properly blocked")
            return True
        else:
            print(f"❌ Unauthorized access not blocked (status: {response.status_code})")
            return False
            
    except Exception as e:
        print(f"❌ Unauthorized access test error: {e}")
        return False

def main():
    """Chạy tất cả các test"""
    print("🧪 TELEDRIVE AUTHENTICATION SYSTEM TEST")
    print("=" * 50)
    
    # Kiểm tra server
    print("\n1. Checking server status...")
    if not test_server_running():
        print("❌ Server is not running. Please start the server first:")
        print("   python app.py")
        return False
    
    print("✅ Server is running")
    
    # Test setup page
    print("\n2. Testing setup page...")
    test_setup_page()
    
    # Test tạo admin user
    print("\n3. Testing admin user creation...")
    admin_created = test_create_admin_user()
    
    # Test login
    print("\n4. Testing login...")
    session = test_login()
    
    # Test protected routes
    print("\n5. Testing protected routes...")
    test_protected_routes(session)
    
    # Test logout
    print("\n6. Testing logout...")
    test_logout(session)
    
    # Test unauthorized access
    print("\n7. Testing unauthorized access...")
    test_unauthorized_access()
    
    print("\n" + "=" * 50)
    print("🎉 Authentication system test completed!")
    print("\n📋 Manual tests to perform:")
    print("   1. Open http://localhost:5000 in browser")
    print("   2. Should redirect to login page")
    print("   3. Try login with admin/admin123")
    print("   4. Should access main dashboard")
    print("   5. Click logout button")
    print("   6. Should redirect back to login")

if __name__ == "__main__":
    main()
