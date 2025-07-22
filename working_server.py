#!/usr/bin/env python3
"""
Working TeleDrive Server
Server hoạt động với tất cả routes cơ bản
"""

import os
import sys
from pathlib import Path
import sqlite3

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Tắt logging và warnings
import logging
logging.disable(logging.CRITICAL)
import warnings
warnings.filterwarnings("ignore")

def setup_database():
    """Setup database với tables đầy đủ"""
    print("🔧 Setting up database...")
    
    instance_dir = Path('instance')
    instance_dir.mkdir(exist_ok=True)
    db_path = instance_dir / 'teledrive.db'
    
    if not db_path.exists():
        print(f"📁 Creating database: {db_path}")
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Tạo table users
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(80) UNIQUE NOT NULL,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active BOOLEAN DEFAULT 1,
                is_admin BOOLEAN DEFAULT 0,
                is_verified BOOLEAN DEFAULT 1
            )
        ''')
        
        # Tạo table otp_codes
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS otp_codes (
                id INTEGER PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                code VARCHAR(6) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                is_used BOOLEAN DEFAULT 0,
                attempts INTEGER DEFAULT 0
            )
        ''')
        
        # Tạo admin user mặc định cho dev
        cursor.execute('''
            INSERT OR IGNORE INTO users 
            (username, phone_number, email, is_admin, is_verified) 
            VALUES (?, ?, ?, ?, ?)
        ''', ('admin', '+84123456789', 'admin@teledrive.local', 1, 1))
        
        conn.commit()
        conn.close()
        print("✅ Database created successfully")
    else:
        print(f"✅ Database exists: {db_path}")
    
    return db_path

def create_working_app():
    """Tạo Flask app hoạt động"""
    print("🚀 Creating Flask app...")
    
    from flask import Flask, render_template, jsonify, request, redirect, url_for
    
    # Đường dẫn templates và static
    basedir = Path(__file__).parent
    template_dir = basedir / 'templates'
    static_dir = basedir / 'static'
    
    print(f"📁 Templates: {template_dir}")
    print(f"📁 Static: {static_dir}")
    
    # Tạo Flask app
    app = Flask(__name__, 
                template_folder=str(template_dir), 
                static_folder=str(static_dir))
    
    # Cấu hình
    db_path = setup_database()
    app.config.update({
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path.resolve()}',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'SECRET_KEY': 'dev_secret_key_teledrive_2024',
        'DEV_MODE': True
    })
    
    # Dev user class
    class DevUser:
        def __init__(self):
            self.id = 'dev_user'
            self.username = 'Developer'
            self.phone_number = '+84123456789'
            self.email = 'dev@teledrive.local'
            self.is_admin = True
            self.is_authenticated = True
            self.is_active = True
            self.is_anonymous = False
            self.is_verified = True
    
    # Routes
    @app.route('/')
    def index():
        """Trang chính - Dashboard"""
        dev_user = DevUser()
        return render_template('index.html', user=dev_user)
    
    @app.route('/hello')
    def hello():
        """Test route"""
        return 'Hello from TeleDrive Working Server! 🎉'
    
    @app.route('/status')
    def status():
        """Status API"""
        return jsonify({
            'status': 'running',
            'dev_mode': True,
            'database': str(db_path),
            'user': 'Developer'
        })
    
    @app.route('/setup')
    def setup():
        """Setup page"""
        return render_template('setup.html')
    
    @app.route('/login')
    def login():
        """Login page - redirect to index in dev mode"""
        return redirect(url_for('index'))
    
    @app.route('/admin')
    def admin():
        """Admin page"""
        dev_user = DevUser()
        return render_template('admin/admin_navigation.html', user=dev_user)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': 'Route không tồn tại'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error', 'message': str(error)}), 500
    
    print("✅ Flask app created with routes")
    return app

def main():
    """Main function"""
    try:
        print("🎯 Starting TeleDrive Working Server...")
        print("=" * 50)
        
        # Tạo app
        app = create_working_app()
        
        print("🌐 Server starting at: http://localhost:5000")
        print("🔧 Dev Mode: Enabled (no login required)")
        print("👤 User: Developer (admin)")
        print("📱 Press Ctrl+C to stop")
        print("=" * 50)
        
        # Chạy server
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=False,
            threaded=True,
            use_reloader=False
        )
        
    except KeyboardInterrupt:
        print("\n✅ Server stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    main()
