#!/usr/bin/env python3
"""
Database Configuration and Management for TeleDrive
Handles database initialization, migrations, and utility functions
"""

import os
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from flask import Flask
from flask_migrate import Migrate
from models import db, init_db, User, File, Folder, ScanSession

# Database configuration
DATABASE_DIR = Path('data')
DATABASE_FILE = DATABASE_DIR / 'teledrive.db'
DATABASE_URL = f'sqlite:///{DATABASE_FILE}'

def setup_database_config():
    """Setup database configuration in config.json"""
    config_file = Path('config.json')
    
    if config_file.exists():
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
    else:
        config = {}
    
    # Add database configuration
    if 'database' not in config:
        config['database'] = {
            'url': DATABASE_URL,
            'track_modifications': False,
            'pool_size': 10,
            'pool_timeout': 20,
            'pool_recycle': -1,
            'max_overflow': 0,
            'echo': False  # Set to True for SQL debugging
        }
        
        # Save updated config
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        print("✅ Added database configuration to config.json")
    
    return config['database']

def create_database_directories():
    """Create necessary directories for database and data storage"""
    directories = [
        DATABASE_DIR,
        Path('data/uploads'),
        Path('data/backups'),
        Path('data/temp')
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        print(f"✅ Created directory: {directory}")

def configure_flask_app(app):
    """Configure Flask app with database settings"""
    db_config = setup_database_config()

    # Flask-SQLAlchemy configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = db_config['url']
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = db_config['track_modifications']

    # Configure engine options based on database type
    if db_config['url'].startswith('sqlite'):
        # SQLite-specific configuration
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'echo': db_config['echo'],
            'connect_args': {
                'check_same_thread': False,  # Allow SQLite to be used across threads
                'timeout': 20  # Connection timeout in seconds
            }
        }
    else:
        # PostgreSQL/MySQL configuration with connection pooling
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_size': db_config['pool_size'],
            'pool_timeout': db_config['pool_timeout'],
            'pool_recycle': db_config['pool_recycle'],
            'max_overflow': db_config['max_overflow'],
            'echo': db_config['echo'],
            'pool_pre_ping': True,  # Verify connections before use
        }

    # Initialize database with app
    db.init_app(app)

    # Initialize Flask-Migrate
    try:
        from flask_migrate import Migrate
        migrate = Migrate(app, db)
        print("✅ Flask-Migrate initialized")
    except ImportError:
        print("⚠️ Flask-Migrate not available, migrations disabled")

    # Add database error handlers
    @app.teardown_appcontext
    def close_db(error):
        """Close database connection on app context teardown"""
        if error:
            db.session.rollback()
        db.session.remove()

    return app

def initialize_database(app=None):
    """Initialize database with tables and default data"""
    if app is None:
        # Create a temporary Flask app for database operations
        app = Flask(__name__)
        configure_flask_app(app)
    
    create_database_directories()
    
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully")
            
            # Create default admin user
            admin_user = User.query.filter_by(username='admin').first()
            if not admin_user:
                admin_user = User(
                    username='admin',
                    email='admin@teledrive.local',
                    role='admin',
                    is_active=True
                )
                admin_user.set_password('admin123')  # Set the default password
                db.session.add(admin_user)
                print("✅ Created default admin user")
            
            # Create default user for backward compatibility
            default_user = User.query.filter_by(username='default').first()
            if not default_user:
                default_user = User(
                    username='default',
                    email='default@teledrive.local',
                    role='user',
                    is_active=True
                )
                default_user.set_password('default123')  # Set the default password
                db.session.add(default_user)
                print("✅ Created default user")
            
            # Create root folder for default user
            if default_user:
                root_folder = Folder.query.filter_by(
                    user_id=default_user.id, 
                    parent_id=None, 
                    name='Root'
                ).first()
                if not root_folder:
                    root_folder = Folder(
                        name='Root',
                        user_id=default_user.id,
                        path='Root'
                    )
                    db.session.add(root_folder)
                    print("✅ Created root folder")
            
            db.session.commit()
            print("✅ Database initialization completed successfully")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Database initialization failed: {e}")
            raise

def backup_database():
    """Create a backup of the database"""
    if not DATABASE_FILE.exists():
        print("⚠️ Database file does not exist, nothing to backup")
        return None
    
    backup_dir = Path('data/backups')
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = backup_dir / f'teledrive_backup_{timestamp}.db'
    
    try:
        # Copy database file
        import shutil
        shutil.copy2(DATABASE_FILE, backup_file)
        print(f"✅ Database backed up to: {backup_file}")
        return backup_file
    except Exception as e:
        print(f"❌ Database backup failed: {e}")
        return None

def restore_database(backup_file):
    """Restore database from backup"""
    backup_path = Path(backup_file)
    if not backup_path.exists():
        print(f"❌ Backup file does not exist: {backup_file}")
        return False
    
    try:
        # Create backup of current database
        current_backup = backup_database()
        
        # Copy backup file to database location
        import shutil
        shutil.copy2(backup_path, DATABASE_FILE)
        print(f"✅ Database restored from: {backup_file}")
        
        if current_backup:
            print(f"📁 Previous database backed up to: {current_backup}")
        
        return True
    except Exception as e:
        print(f"❌ Database restore failed: {e}")
        return False

def get_database_stats():
    """Get database statistics"""
    if not DATABASE_FILE.exists():
        return None

    try:
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()

        stats = {}

        # Get table counts
        tables = ['users', 'files', 'folders', 'scan_sessions']
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[f'{table}_count'] = cursor.fetchone()[0]
            except sqlite3.OperationalError:
                stats[f'{table}_count'] = 0

        # Get database size
        stats['database_size'] = DATABASE_FILE.stat().st_size

        # Get last modified
        stats['last_modified'] = datetime.fromtimestamp(
            DATABASE_FILE.stat().st_mtime
        ).isoformat()

        conn.close()
        return stats

    except Exception as e:
        print(f"❌ Failed to get database stats: {e}")
        return None

def test_database_connection(app=None):
    """Test database connection and basic operations"""
    if app is None:
        app = Flask(__name__)
        configure_flask_app(app)

    try:
        with app.app_context():
            # Test basic connection
            db.session.execute('SELECT 1')

            # Test table existence
            tables = ['users', 'files', 'folders', 'scan_sessions']
            for table in tables:
                try:
                    db.session.execute(f'SELECT COUNT(*) FROM {table}')
                except Exception as e:
                    print(f"⚠️ Table {table} not accessible: {e}")
                    return False

            print("✅ Database connection test passed")
            return True

    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        return False

def repair_database():
    """Attempt to repair database issues"""
    try:
        # Check database file integrity
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()

        # Run integrity check
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()

        if result[0] != 'ok':
            print(f"⚠️ Database integrity issues found: {result[0]}")

            # Attempt to repair
            cursor.execute("PRAGMA quick_check")
            quick_result = cursor.fetchall()

            if len(quick_result) == 1 and quick_result[0][0] == 'ok':
                print("✅ Database repaired successfully")
            else:
                print("❌ Database repair failed, backup and recreate recommended")
                return False
        else:
            print("✅ Database integrity check passed")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ Database repair failed: {e}")
        return False

def migrate_json_data_to_database(app=None):
    """Migrate existing JSON data to database"""
    if app is None:
        app = Flask(__name__)
        configure_flask_app(app)
    
    output_dir = Path('output')
    if not output_dir.exists():
        print("⚠️ No output directory found, nothing to migrate")
        return
    
    with app.app_context():
        try:
            # Get or create default user
            default_user = User.query.filter_by(username='default').first()
            if not default_user:
                default_user = User(
                    username='default',
                    email='default@teledrive.local',
                    role='user'
                )
                db.session.add(default_user)
                db.session.commit()
            
            # Get or create root folder
            root_folder = Folder.query.filter_by(
                user_id=default_user.id,
                parent_id=None,
                name='Migrated Files'
            ).first()
            if not root_folder:
                root_folder = Folder(
                    name='Migrated Files',
                    user_id=default_user.id,
                    path='Migrated Files'
                )
                db.session.add(root_folder)
                db.session.commit()
            
            # Migrate JSON files
            json_files = list(output_dir.glob('*.json'))
            migrated_count = 0
            
            for json_file in json_files:
                if json_file.name.startswith('telegram_files'):
                    try:
                        with open(json_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        if isinstance(data, list):
                            for item in data:
                                # Check if file already exists
                                existing_file = File.query.filter_by(
                                    filename=item.get('filename', ''),
                                    telegram_message_id=item.get('message_id')
                                ).first()
                                
                                if not existing_file:
                                    file_record = File(
                                        filename=item.get('filename', ''),
                                        original_filename=item.get('filename', ''),
                                        file_size=item.get('file_size', 0),
                                        mime_type=item.get('mime_type', ''),
                                        folder_id=root_folder.id,
                                        user_id=default_user.id,
                                        telegram_message_id=item.get('message_id'),
                                        telegram_channel=item.get('channel', ''),
                                        telegram_date=datetime.fromisoformat(
                                            item['date'].replace('Z', '+00:00')
                                        ) if item.get('date') else None
                                    )
                                    
                                    # Set metadata
                                    metadata = {
                                        'download_url': item.get('download_url', ''),
                                        'file_type': item.get('file_type', ''),
                                        'sender': item.get('sender', '')
                                    }
                                    file_record.set_metadata(metadata)
                                    
                                    db.session.add(file_record)
                                    migrated_count += 1
                        
                    except Exception as e:
                        print(f"⚠️ Failed to migrate {json_file}: {e}")
                        continue
            
            db.session.commit()
            print(f"✅ Migrated {migrated_count} files to database")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Data migration failed: {e}")
            raise

if __name__ == '__main__':
    """Run database initialization when script is executed directly"""
    print("🚀 Initializing TeleDrive Database...")
    
    # Initialize database
    initialize_database()
    
    # Migrate existing data
    print("\n📦 Migrating existing data...")
    migrate_json_data_to_database()
    
    # Show database stats
    print("\n📊 Database Statistics:")
    stats = get_database_stats()
    if stats:
        for key, value in stats.items():
            print(f"   {key}: {value}")
    
    print("\n✅ Database setup completed!")
