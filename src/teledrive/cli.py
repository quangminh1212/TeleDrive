#!/usr/bin/env python3
"""
TeleDrive CLI Entry Point

Command-line interface for TeleDrive application.
"""

import sys
import os
import click
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from teledrive import __version__
from teledrive.config import config, validate_environment


@click.group()
@click.version_option(version=__version__, prog_name="TeleDrive")
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
def main(verbose):
    """TeleDrive - Modern Telegram File Manager"""
    if verbose:
        click.echo(f"TeleDrive v{__version__}")


@main.command()
@click.option('--host', default='localhost', help='Host to bind to')
@click.option('--port', default=5000, help='Port to bind to')
@click.option('--debug', is_flag=True, help='Enable debug mode')
def web(host, port, debug):
    """Start the web interface"""
    try:
        validate_environment()
    except ValueError as e:
        click.echo(f"❌ Configuration error: {e}", err=True)
        sys.exit(1)
    
    click.echo("🚀 Starting TeleDrive Web Interface...")
    click.echo(f"📍 Server: http://{host}:{port}")
    click.echo("🛑 Press Ctrl+C to stop")
    click.echo("-" * 50)
    
    try:
        from teledrive.app import app
        app.run(
            host=host,
            port=port,
            debug=debug,
            threaded=True,
            use_reloader=False
        )
    except KeyboardInterrupt:
        click.echo("\n✅ Server stopped.")
    except Exception as e:
        click.echo(f"❌ Error starting server: {e}", err=True)
        sys.exit(1)


@main.command()
def scanner():
    """Start the Telegram scanner"""
    click.echo("🔍 Starting Telegram Scanner...")
    
    try:
        from teledrive.core.main import main as scanner_main
        import asyncio
        asyncio.run(scanner_main())
    except KeyboardInterrupt:
        click.echo("\n✅ Scanner stopped.")
    except Exception as e:
        click.echo(f"❌ Error starting scanner: {e}", err=True)
        sys.exit(1)


@main.command()
def config_check():
    """Check configuration validity"""
    click.echo("🔧 Checking configuration...")
    
    try:
        validate_environment()
        click.echo("✅ Configuration is valid")
    except ValueError as e:
        click.echo(f"❌ Configuration error: {e}", err=True)
        sys.exit(1)


@main.command()
def init_db():
    """Initialize database"""
    click.echo("🗄️ Initializing database...")
    
    try:
        from teledrive.database import init_database
        from teledrive.auth import auth_manager
        from flask import Flask
        
        app = Flask(__name__)
        app.config.update(config.get_flask_config())
        
        with app.app_context():
            init_database(app)
            auth_manager.init_app(app)
            click.echo("✅ Database initialized successfully")
            
    except Exception as e:
        click.echo(f"❌ Error initializing database: {e}", err=True)
        sys.exit(1)


@main.command()
@click.option('--username', prompt=True, help='Admin username')
@click.option('--phone', prompt=True, help='Admin phone number')
@click.option('--email', prompt=True, help='Admin email')
def create_admin(username, phone, email):
    """Create admin user"""
    click.echo("👑 Creating admin user...")
    
    try:
        from teledrive.database import init_database
        from teledrive.auth import auth_manager
        from flask import Flask
        
        app = Flask(__name__)
        app.config.update(config.get_flask_config())
        
        with app.app_context():
            init_database(app)
            auth_manager.init_app(app)
            
            success, message = auth_manager.create_user(
                username=username,
                phone_number=phone,
                email=email,
                is_admin=True
            )
            
            if success:
                click.echo(f"✅ Admin user '{username}' created successfully")
            else:
                click.echo(f"❌ Failed to create admin user: {message}", err=True)
                sys.exit(1)
                
    except Exception as e:
        click.echo(f"❌ Error creating admin user: {e}", err=True)
        sys.exit(1)


@main.command()
def version():
    """Show version information"""
    click.echo(f"TeleDrive v{__version__}")
    click.echo("Modern Telegram File Manager")
    click.echo("https://github.com/quangminh1212/TeleDrive")


if __name__ == '__main__':
    main()
