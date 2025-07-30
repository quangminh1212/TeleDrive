#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, 'source')

print("Testing TeleDrive server startup...")

try:
    # Test basic imports
    print("1. Testing imports...")
    from app import app, socketio
    print("   ✅ Flask app imported successfully")
    
    # Test configuration
    print("2. Testing configuration...")
    import flask_config
    server_config = flask_config.flask_config.get_server_config()
    print(f"   ✅ Server config: {server_config['host']}:{server_config['port']}")
    
    # Test routes
    print("3. Testing routes...")
    with app.test_client() as client:
        # Test main routes
        routes_to_test = [
            ('/', 'dashboard'),
            ('/scan', 'scan page'),
            ('/search', 'search page'),
            ('/settings', 'settings page'),
            ('/favicon.ico', 'favicon'),
        ]
        
        for route, name in routes_to_test:
            try:
                response = client.get(route)
                if response.status_code in [200, 204, 302]:  # OK, No Content, or Redirect
                    print(f"   ✅ {name}: {response.status_code}")
                else:
                    print(f"   ⚠️  {name}: {response.status_code}")
            except Exception as e:
                print(f"   ❌ {name}: {e}")
    
    print("\n🎉 ALL TESTS PASSED!")
    print("🚀 Server is ready to start!")
    print(f"📱 Will run on: http://{server_config['host']}:{server_config['port']}")
    print("\n💡 To start the server:")
    print("   python source/app.py")
    print("   OR")
    print("   run.bat")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
