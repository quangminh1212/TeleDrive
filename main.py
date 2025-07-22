#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive - Entry Point
Entry point cho TeleDrive Web Application
"""

import sys
import os
import logging

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Tắt TẤT CẢ các log hoàn toàn
logging.disable(logging.CRITICAL)

# Tắt tất cả các logger có thể
for logger_name in ['werkzeug', 'urllib3', 'requests', 'telethon', 'asyncio', 'flask', 'teledrive', 'root']:
    logging.getLogger(logger_name).setLevel(logging.CRITICAL)
    logging.getLogger(logger_name).disabled = True

# Tắt warnings
import warnings
warnings.filterwarnings("ignore")

# Sửa database trước khi import app
print("🔧 Checking database...")
from pathlib import Path

# Tạo thư mục instance và đảm bảo database tồn tại
instance_dir = Path('instance')
instance_dir.mkdir(exist_ok=True)
db_path = instance_dir / 'teledrive.db'

# Nếu database không tồn tại, tạo một database đơn giản
if not db_path.exists():
    import sqlite3
    print(f"📁 Creating database: {db_path}")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
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
    conn.commit()
    conn.close()
    print("✅ Database created successfully")

def create_app():
    """Tạo Flask app hoạt động"""
    print("🚀 Creating Flask app...")

    from flask import Flask, render_template, jsonify, request, redirect, url_for

    # Đường dẫn templates và static
    basedir = Path(__file__).parent
    template_dir = basedir / 'templates'
    static_dir = basedir / 'static'

    # Tạo Flask app
    app = Flask(__name__,
                template_folder=str(template_dir),
                static_folder=str(static_dir))

    # Cấu hình
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
        return 'Hello from TeleDrive! 🎉'

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

    @app.route('/admin/system')
    def admin_system():
        """Admin system management"""
        dev_user = DevUser()

        # Mock stats data
        stats = {
            'cpu_usage': 25.5,
            'memory_usage': 45.2,
            'disk_usage': 67.8,
            'active_sessions': 3,
            'total_files': 1250,
            'database_size': '15.2 MB',
            'uptime': '2 hours 15 minutes'
        }

        # Mock config data
        class MockConfig:
            class Server:
                host = '0.0.0.0'
                port = 5000
            server = Server()
            environment = 'development'
            debug = True

        config = MockConfig()

        try:
            return render_template('admin/system_management.html',
                                 user=dev_user,
                                 stats=stats,
                                 config=config)
        except Exception as e:
            return jsonify({'error': 'Template error', 'message': str(e)}), 500

    @app.route('/admin/users')
    def admin_users():
        """Admin user management"""
        dev_user = DevUser()
        return render_template('admin/user_management.html', user=dev_user)

    @app.route('/admin/settings')
    def admin_settings():
        """Admin system settings"""
        dev_user = DevUser()
        return render_template('admin/system_settings.html', user=dev_user)

    @app.route('/admin/telegram')
    def admin_telegram():
        """Admin telegram settings"""
        dev_user = DevUser()
        return render_template('admin/telegram_settings.html', user=dev_user)

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': 'Route không tồn tại'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error', 'message': str(error)}), 500

    print("✅ Flask app created with routes")
    return app

if __name__ == '__main__':
    try:
        print("🎯 Starting TeleDrive...")
        print("=" * 50)

        # Tạo app
        app = create_app()

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
        sys.exit(1)
