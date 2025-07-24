"""
Application Factory

This module contains the application factory for creating Flask application instances
with proper configurations based on the environment.
"""

import os
import sys
from typing import Dict, Any, Optional

from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from . import __version__, TEMPLATE_DIR, STATIC_DIR
from .database import db
from .auth import auth_manager


def create_app(test_config: Optional[Dict[str, Any]] = None) -> Flask:
    """Create and configure the Flask application.

    Args:
        test_config: Configuration dictionary for testing purposes

    Returns:
        A configured Flask application
    """
    # Load environment variables
    load_dotenv()

    # Create Flask app with proper template and static folders
    app = Flask(
        __name__, 
        template_folder=str(TEMPLATE_DIR),
        static_folder=str(STATIC_DIR)
    )

    # Configure the app
    configure_app(app, test_config)
    
    # Initialize extensions
    initialize_extensions(app)
    
    # Register blueprints
    register_blueprints(app)

    # Register error handlers
    register_error_handlers(app)
    
    return app


def configure_app(app: Flask, test_config: Optional[Dict[str, Any]] = None) -> None:
    """Configure application settings.
    
    Args:
        app: Flask application instance
        test_config: Configuration dictionary for testing purposes
    """
    # Default configuration
    app.config.update(
        SECRET_KEY=os.getenv('SECRET_KEY', 'dev-key-insecure'),
        VERSION=__version__,
        ENV=os.getenv('FLASK_ENV', 'production'),
        DEBUG=os.getenv('DEBUG', 'false').lower() == 'true',
        TESTING=False,
        DEV_MODE=os.getenv('DEV_MODE', 'false').lower() == 'true',
    )

    # Set database URI
    from pathlib import Path
    instance_dir = Path('instance')
    instance_dir.mkdir(exist_ok=True)
    db_path = instance_dir / 'teledrive.db'
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path.resolve()}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Load test config if provided
    if test_config:
        app.config.update(test_config)

    # Load environment-specific config
    if app.config['ENV'] == 'production':
        try:
            from .config.production import ProductionConfig
            app.config.update(ProductionConfig().to_dict())
        except ImportError:
            pass


def initialize_extensions(app: Flask) -> None:
    """Initialize Flask extensions.
    
    Args:
        app: Flask application instance
    """
    # Initialize database
    db.init_app(app)
    
    # Initialize auth manager
    auth_manager.init_app(app)

    # Initialize CORS with proper settings
    if app.config['ENV'] == 'production':
        CORS(app, origins=[os.getenv('ALLOWED_ORIGIN', 'https://yourdomain.com')], 
             supports_credentials=True)
    else:
        CORS(app)
    
    # Create tables within app context
    with app.app_context():
        db.create_all()


def register_blueprints(app: Flask) -> None:
    """Register Flask blueprints.
    
    Args:
        app: Flask application instance
    """
    # Import blueprints
    from .api import api_bp
    from .admin import admin_bp
    from .auth.routes import auth_bp
    from .views import views_bp
    
    # Register blueprints
    app.register_blueprint(views_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/admin')


def register_error_handlers(app: Flask) -> None:
    """Register error handlers.
    
    Args:
        app: Flask application instance
    """
    @app.errorhandler(404)
    def page_not_found(e):
        return {"error": "Resource not found"}, 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return {"error": "Internal server error"}, 500 