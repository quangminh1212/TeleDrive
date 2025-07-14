#!/usr/bin/env python3
"""
Test Flask app đơn giản để debug static file serving
"""

from flask import Flask, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='ui', static_url_path='')
CORS(app)

@app.route('/')
def index():
    """Serve the main UI"""
    return send_from_directory('ui', 'index.html')

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files"""
    print(f"CSS request: {filename}")
    return send_from_directory('ui/css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files"""
    print(f"JS request: {filename}")
    return send_from_directory('ui/js', filename)

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """Serve asset files"""
    print(f"Assets request: {filename}")
    return send_from_directory('ui/assets', filename)

@app.route('/debug/routes')
def debug_routes():
    """Debug route để xem tất cả routes"""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'rule': rule.rule
        })
    return {"routes": routes}

if __name__ == '__main__':
    print("🚀 Starting simple Flask test server...")
    print("📋 Routes:")
    for rule in app.url_map.iter_rules():
        print(f"   {rule.rule} -> {rule.endpoint}")
    
    print("\n🌐 Server starting on http://127.0.0.1:5004")
    app.run(host='127.0.0.1', port=5004, debug=True)
