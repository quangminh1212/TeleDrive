#!/usr/bin/env python3
"""
Simple server để test
"""

import os
import sys

# Set environment variable for dev mode
os.environ['DEV_MODE'] = 'true'

def create_simple_app():
    """Tạo Flask app đơn giản"""
    from flask import Flask
    
    app = Flask(__name__)
    
    @app.route('/')
    def index():
        return '<h1>TeleDrive Simple</h1><p>Server hoạt động!</p>'
    
    @app.route('/test')
    def test():
        return '<h1>Test Route</h1><p>OK!</p>'
    
    return app

if __name__ == '__main__':
    try:
        print("🚀 Starting simple server...")
        
        app = create_simple_app()
        
        print("✅ App created successfully")
        print("🌐 Server: http://localhost:5001")
        print("📱 Press Ctrl+C to stop")
        print("-" * 30)

        # Chạy server
        app.run(
            host='0.0.0.0',
            port=5001,
            debug=True,
            threaded=True,
            use_reloader=False
        )
        
    except KeyboardInterrupt:
        print("\n✅ Server stopped.")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
