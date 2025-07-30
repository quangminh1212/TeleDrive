#!/usr/bin/env python3
"""
Simple TeleDrive server starter without complex logging
"""

import sys
import os
from pathlib import Path

# Add source to path
sys.path.insert(0, 'source')

# Disable complex logging
os.environ['DISABLE_DETAILED_LOGGING'] = '1'

print("🌐 Starting TeleDrive Web Interface...")
print("📁 Project: C:\\VF\\TeleDrive")

try:
    # Create necessary directories
    directories = ['data', 'data/uploads', 'data/backups', 'data/temp', 'output', 'logs', 'static']
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✅ Directory: {directory}")
    
    # Import Flask components
    print("\n📦 Loading Flask components...")
    from flask import Flask
    from flask_socketio import SocketIO
    
    # Import configuration
    print("⚙️  Loading configuration...")
    import flask_config
    
    # Get server config
    server_config = flask_config.flask_config.get_server_config()
    print(f"🔌 Server: {server_config['host']}:{server_config['port']}")
    
    # Import the main app (this might take a moment)
    print("🚀 Loading TeleDrive application...")
    from app import app, socketio
    
    print("\n" + "="*60)
    print("✅ TeleDrive loaded successfully!")
    print("="*60)
    print(f"📱 Main Interface: http://{server_config['host']}:{server_config['port']}")
    print(f"🎨 Enhanced Scanner: http://{server_config['host']}:{server_config['port']}/scan")
    print(f"🔍 Search: http://{server_config['host']}:{server_config['port']}/search")
    print(f"⚙️  Settings: http://{server_config['host']}:{server_config['port']}/settings")
    print("="*60)
    print("⏹️  Press Ctrl+C to stop the server")
    print("="*60)
    
    # Start server
    socketio_config = {
        'host': server_config['host'],
        'port': server_config['port'],
        'debug': server_config['debug']
    }
    
    # This will start the server and block
    socketio.run(app, **socketio_config)
    
except KeyboardInterrupt:
    print("\n\n🛑 Server stopped by user")
    print("👋 Thank you for using TeleDrive!")
    
except ImportError as e:
    print(f"\n❌ Import Error: {e}")
    print("💡 Make sure all dependencies are installed:")
    print("   pip install -r requirements.txt")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\n🔍 Debug information:")
    import traceback
    traceback.print_exc()
    
    print("\n💡 Troubleshooting:")
    print("1. Check if all dependencies are installed")
    print("2. Verify configuration files exist")
    print("3. Make sure port is not in use")
    print("4. Check file permissions")
    
finally:
    print("\n📊 Session ended")
    sys.exit(0)
