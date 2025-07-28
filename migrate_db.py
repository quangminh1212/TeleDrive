#!/usr/bin/env python3
"""
Database Migration Script for TeleDrive
Handles database migrations using Flask-Migrate and Alembic
"""

import os
import sys
from flask import Flask
from flask_migrate import Migrate, init, migrate, upgrade, downgrade
from database import configure_flask_app
from models import db

def create_app():
    """Create Flask app for migrations"""
    app = Flask(__name__)
    configure_flask_app(app)
    return app

def init_migrations():
    """Initialize migration repository"""
    app = create_app()
    migrate_obj = Migrate(app, db)
    
    with app.app_context():
        try:
            init()
            print("✅ Migration repository initialized")
            return True
        except Exception as e:
            print(f"❌ Failed to initialize migrations: {e}")
            return False

def create_migration(message="Auto migration"):
    """Create a new migration"""
    app = create_app()
    migrate_obj = Migrate(app, db)
    
    with app.app_context():
        try:
            migrate(message=message)
            print(f"✅ Migration created: {message}")
            return True
        except Exception as e:
            print(f"❌ Failed to create migration: {e}")
            return False

def apply_migrations():
    """Apply all pending migrations"""
    app = create_app()
    migrate_obj = Migrate(app, db)
    
    with app.app_context():
        try:
            upgrade()
            print("✅ Migrations applied successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to apply migrations: {e}")
            return False

def rollback_migration():
    """Rollback the last migration"""
    app = create_app()
    migrate_obj = Migrate(app, db)
    
    with app.app_context():
        try:
            downgrade()
            print("✅ Migration rolled back successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to rollback migration: {e}")
            return False

def setup_initial_migration():
    """Set up initial migration for existing database"""
    app = create_app()
    migrate_obj = Migrate(app, db)
    
    # Check if migrations directory exists
    if not os.path.exists('migrations'):
        print("🔧 Initializing migration repository...")
        if not init_migrations():
            return False
    
    # Create initial migration
    print("🔧 Creating initial migration...")
    if not create_migration("Initial database schema"):
        return False
    
    print("✅ Initial migration setup completed")
    return True

if __name__ == '__main__':
    """Command line interface for database migrations"""
    if len(sys.argv) < 2:
        print("Usage: python migrate_db.py <command>")
        print("Commands:")
        print("  init     - Initialize migration repository")
        print("  migrate  - Create a new migration")
        print("  upgrade  - Apply all pending migrations")
        print("  downgrade - Rollback the last migration")
        print("  setup    - Set up initial migration")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'init':
        init_migrations()
    elif command == 'migrate':
        message = sys.argv[2] if len(sys.argv) > 2 else "Auto migration"
        create_migration(message)
    elif command == 'upgrade':
        apply_migrations()
    elif command == 'downgrade':
        rollback_migration()
    elif command == 'setup':
        setup_initial_migration()
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
