#!/usr/bin/env python3
"""
Minimal Flask app to test web interface
"""

from flask import Flask, render_template, jsonify, g
from pathlib import Path
import os

# Mock current_user object
class MockUser:
    def __init__(self):
        self.is_authenticated = False
        self.username = "Test User"

    def is_active(self):
        return True

# Create mock user
mock_user = MockUser()

# Get project root directory
project_root = Path(__file__).parent
template_folder = project_root / 'templates'
static_folder = project_root / 'static'

# Initialize Flask app
app = Flask(__name__, 
           template_folder=str(template_folder),
           static_folder=str(static_folder))

app.config['SECRET_KEY'] = 'test-secret-key'

@app.context_processor
def inject_user():
    """Inject current_user into all templates"""
    return dict(current_user=mock_user)

@app.route('/')
def index():
    """Main dashboard"""
    try:
        # Mock data for template
        files = []
        return render_template('index.html', files=files)
    except Exception as e:
        return f"Template error: {str(e)}"

@app.route('/dashboard')
def dashboard():
    """Dashboard page"""
    try:
        files = []
        return render_template('index.html', files=files)
    except Exception as e:
        return f"Template error: {str(e)}"

@app.route('/login')
def login():
    """Login page"""
    try:
        return render_template('auth/login.html')
    except Exception as e:
        return f"Template error: {str(e)}"

@app.route('/register')
def register():
    """Register page"""
    return "Register page (not implemented)"

@app.route('/settings')
def settings():
    """Settings page"""
    try:
        return render_template('settings.html')
    except Exception as e:
        return f"Template error: {str(e)}"

@app.route('/scan')
def scan_page():
    """Scan page"""
    try:
        return render_template('scan.html')
    except Exception as e:
        return f"Template error: {str(e)}"

@app.route('/search')
def search_page():
    """Search page"""
    try:
        return render_template('search.html')
    except Exception as e:
        return f"Template error: {str(e)}"

@app.route('/profile')
def profile():
    """Profile page"""
    return "Profile page (not implemented)"

@app.route('/change_password')
def change_password():
    """Change password page"""
    return "Change password page (not implemented)"

@app.route('/logout')
def logout():
    """Logout"""
    return "Logout (not implemented)"

@app.route('/test')
def test():
    """Test endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Flask app is working!',
        'static_folder': str(static_folder),
        'template_folder': str(template_folder)
    })

@app.route('/static-test')
def static_test():
    """Test static files"""
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Static Files Test</title>
        <link rel="stylesheet" href="/static/css/style.css">
    </head>
    <body>
        <h1>Static Files Test</h1>
        <p>If this page has styling, CSS is working.</p>
        <script src="/static/js/app.js"></script>
    </body>
    </html>
    '''

if __name__ == '__main__':
    print("🌐 Starting Test Flask App...")
    print(f"📁 Template folder: {template_folder}")
    print(f"📁 Static folder: {static_folder}")
    print("📱 Access at: http://localhost:3000")
    
    app.run(host='0.0.0.0', port=3000, debug=True)
