#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple TeleDrive App for Testing UI
"""

from flask import Flask, render_template, g
from flask_login import LoginManager, UserMixin, current_user
import os

# Create simple Flask app
app = Flask(__name__,
           template_folder='templates',
           static_folder='static')

app.config['SECRET_KEY'] = 'dev-key-for-testing'

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)

# Simple User class for demo
class DemoUser(UserMixin):
    def __init__(self):
        self.id = 1
        self.username = "Developer"
        self.email = "dev@teledrive.com"
        self.is_admin = True
        self.is_authenticated = True

@login_manager.user_loader
def load_user(user_id):
    return DemoUser()

# Make demo user available in templates
@app.before_request
def before_request():
    g.current_user = DemoUser()

@app.context_processor
def inject_user():
    demo_user = DemoUser()
    return dict(
        current_user=demo_user,
        active_page='home',
        breadcrumbs=[],
        files=[],
        storage_used='2.5 GB',
        storage_total='10 GB',
        storage_percent=25
    )

@app.route('/')
def index():
    """Home page"""
    return render_template('index.html')

@app.route('/test')
def test():
    """Test route"""
    return "TeleDrive UI Test is working!"

@app.route('/dashboard')
def dashboard():
    """Dashboard page"""
    return render_template('dashboard.html')

if __name__ == '__main__':
    print("=" * 50)
    print("TeleDrive UI Test Server")
    print("=" * 50)
    print("Starting simple Flask app for UI testing...")
    print("URL: http://localhost:3000")
    print("Press Ctrl+C to stop")
    print("=" * 50)
    
    app.run(
        host='0.0.0.0',
        port=3000,
        debug=True,
        threaded=True
    )
