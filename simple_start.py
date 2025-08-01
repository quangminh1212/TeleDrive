#!/usr/bin/env python3
"""
Simple server starter without complex logging
"""

import sys
import os
sys.path.insert(0, 'source')

print("🌐 Starting TeleDrive Web Interface...")
print("=" * 60)

try:
    # Disable detailed logging
    os.environ['MINIMAL_LOGGING'] = '1'
    os.environ['DISABLE_LOGGING'] = '1'
    
    # Import the app
    from app import app, socketio
    import flask_config
    
    print("✅ Flask app loaded successfully")
    
    # Get server configuration
    server_config = flask_config.flask_config.get_server_config()
    
    print(f"✅ Server configuration loaded")
    print(f"📱 Host: {server_config['host']}")
    print(f"🔌 Port: {server_config['port']}")
    print(f"🐛 Debug: {server_config['debug']}")
    
    print("\n" + "=" * 60)
    print("🚀 STARTING SERVER...")
    print("=" * 60)
    print(f"📱 Access at: http://{server_config['host']}:{server_config['port']}")
    print(f"🎨 Enhanced Scan: http://{server_config['host']}:{server_config['port']}/scan")
    print(f"⚙️  Settings: http://{server_config['host']}:{server_config['port']}/settings")
    print("⏹️  Press Ctrl+C to stop")
    print("=" * 60)
    
    # Start the server
    socketio_config = {
        'host': server_config['host'],
        'port': server_config['port'],
        'debug': server_config['debug']
    }
    
    socketio.run(app, **socketio_config)
    
except KeyboardInterrupt:
    print("\n🛑 Server stopped by user")
except Exception as e:
    print(f"❌ Error starting server: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
