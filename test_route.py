#!/usr/bin/env python3
"""
Test route để kiểm tra lỗi cụ thể
"""

import os
import sys
import traceback

# Set environment variable for dev mode
os.environ['DEV_MODE'] = 'true'

def test_index_route():
    """Test index route trực tiếp"""
    try:
        print("🔍 Testing index route...")
        
        # Import app
        from src.teledrive.app import app
        
        # Tạo test client
        with app.test_client() as client:
            print("✅ App created successfully")
            
            # Test route /
            print("🌐 Testing GET /")
            response = client.get('/')
            
            print(f"📊 Status Code: {response.status_code}")
            print(f"📄 Content Type: {response.content_type}")
            
            if response.status_code == 500:
                print("❌ Internal Server Error detected!")
                print("📝 Response data:")
                print(response.get_data(as_text=True)[:500])
            elif response.status_code == 200:
                print("✅ Route working successfully!")
                print("📝 Response length:", len(response.get_data()))
            else:
                print(f"⚠️ Unexpected status code: {response.status_code}")
                print("📝 Response data:")
                print(response.get_data(as_text=True)[:500])
                
    except Exception as e:
        print(f"❌ Error testing route: {e}")
        print("\n🔍 Full traceback:")
        traceback.print_exc()

def test_simple_route():
    """Test simple route"""
    try:
        print("\n🔍 Testing simple route...")
        
        from src.teledrive.app import app
        
        with app.test_client() as client:
            # Test route /api/test
            print("🌐 Testing GET /api/test")
            response = client.get('/api/test')
            
            print(f"📊 Status Code: {response.status_code}")
            if response.status_code == 200:
                print("✅ Simple route working!")
                print("📝 Response:", response.get_json())
            else:
                print("❌ Simple route failed!")
                print("📝 Response:", response.get_data(as_text=True))
                
    except Exception as e:
        print(f"❌ Error testing simple route: {e}")
        traceback.print_exc()

if __name__ == '__main__':
    test_simple_route()
    test_index_route()
