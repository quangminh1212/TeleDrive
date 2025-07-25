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
from .database import db, init_db
from .auth import auth_manager
from .security import init_security_middleware, init_attack_prevention
from .performance import memory_monitor_start
from .performance.middleware import (
    init_performance_middleware,
    cache_control_middleware,
    compression_middleware,
    rate_limit_middleware
)


def create_app(test_config: Optional[Dict[str, Any]] = None) -> Flask:
    """Create and configure the Flask application."""
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

    # Initialize performance monitoring
    initialize_performance_monitoring(app)
    
    # Initialize advanced security features
    initialize_advanced_security(app)
    
    return app


def configure_app(app: Flask, test_config: Optional[Dict[str, Any]] = None) -> None:
    """Configure application settings."""
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
    
    # Security configuration
    app.config['WTF_CSRF_ENABLED'] = True
    app.config['RATELIMIT_ENABLED'] = True
    app.config['RATELIMIT_HEADERS_ENABLED'] = True
    
    if os.getenv('REDIS_URL'):
        app.config['RATELIMIT_STORAGE_URL'] = os.getenv('REDIS_URL')
        app.config['SESSION_TYPE'] = 'redis'
        app.config['SESSION_REDIS'] = os.getenv('REDIS_URL')
    else:
        app.config['SESSION_TYPE'] = 'filesystem'
    
    app.config['SESSION_PERMANENT'] = True
    app.config['SESSION_USE_SIGNER'] = True
    
    # Performance configuration
    app.config['COMPRESS_MIMETYPES'] = [
        'text/html', 'text/css', 'text/xml', 'application/json',
        'application/javascript', 'text/javascript'
    ]
    app.config['COMPRESS_LEVEL'] = 6
    app.config['COMPRESS_MIN_SIZE'] = 500
    
    # Security configuration
    app.config['ENABLE_ADVANCED_SECURITY'] = os.getenv('ENABLE_ADVANCED_SECURITY', 'true').lower() == 'true'
    app.config['MAX_FAILED_LOGIN_ATTEMPTS'] = int(os.getenv('MAX_FAILED_LOGIN_ATTEMPTS', '5'))
    app.config['LOGIN_LOCKOUT_DURATION'] = int(os.getenv('LOGIN_LOCKOUT_DURATION', '1800'))  # 30 minutes
    
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
    """Initialize Flask extensions."""
    # Initialize database with improved init function
    init_db(app)
    
    # Initialize auth manager
    auth_manager.init_app(app)

    # Initialize security middleware
    init_security_middleware(app)
    
    # Initialize CORS with proper settings
    if app.config['ENV'] == 'production':
        CORS(app, origins=[os.getenv('ALLOWED_ORIGIN', 'https://yourdomain.com')], 
             supports_credentials=True)
    else:
        CORS(app)


def register_blueprints(app: Flask) -> None:
    """Register Flask blueprints."""
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
    """Register error handlers."""
    @app.errorhandler(404)
    def page_not_found(e):
        return {"error": "Resource not found"}, 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return {"error": "Internal server error"}, 500
        
    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return {"error": "Rate limit exceeded. Please try again later."}, 429
        
    @app.errorhandler(403)
    def forbidden(e):
        return {"error": "Access forbidden."}, 403


def initialize_performance_monitoring(app: Flask) -> None:
    """Initialize performance monitoring."""
    # Initialize performance middleware for request tracking
    init_performance_middleware(app)
    
    # Configure cache headers
    cache_control_middleware(app, cache_timeout=3600)
    
    # Enable response compression
    if os.getenv('ENABLE_COMPRESSION', 'true').lower() == 'true':
        compression_middleware(app)
    
    # Configure rate limiting
    if os.getenv('ENABLE_RATE_LIMIT', 'true').lower() == 'true':
        limits = [
            os.getenv('RATE_LIMIT_DEFAULT', '200 per day'),
            os.getenv('RATE_LIMIT_HOURLY', '50 per hour')
        ]
        rate_limit_middleware(app, default_limits=limits)
    
    # Start memory monitoring in a background thread
    if os.getenv('MONITOR_MEMORY', 'false').lower() == 'true':
        memory_monitor_start()


def initialize_advanced_security(app: Flask) -> None:
    """Initialize advanced security features."""
    # Skip in test mode
    if app.testing:
        return
    
    # Initialize attack prevention if enabled
    if app.config.get('ENABLE_ADVANCED_SECURITY', True):
        init_attack_prevention(app)
        app.logger.info("Advanced security features enabled") 