"""
Tests for the security module
"""

import pytest
from flask import Flask

from src.teledrive.security import csrf, limiter
from src.teledrive.security.csrf import init_csrf, exempt_blueprints
from src.teledrive.security.middleware import init_security_middleware


def test_csrf_initialization(app):
    """Test that CSRF protection can be initialized."""
    init_csrf(app)
    assert hasattr(app, 'extensions')
    assert 'csrf' in app.extensions
    

def test_limiter_initialization(app):
    """Test that the rate limiter is available."""
    assert limiter is not None
    
    # Verify it can be initialized with the app
    limiter.init_app(app)
    assert hasattr(app, 'extensions')
    assert 'limiter' in app.extensions


def test_security_middleware_initialization(app):
    """Test that security middleware can be initialized."""
    init_security_middleware(app)
    
    # Check that the middleware added response processors
    assert len(app.after_request_funcs[None]) >= 2  # Should have at least 2 after_request handlers
    
    # Check security headers in a test request
    with app.test_client() as client:
        response = client.get('/')
        
        assert 'X-Content-Type-Options' in response.headers
        assert response.headers['X-Content-Type-Options'] == 'nosniff'
        
        assert 'X-Frame-Options' in response.headers
        assert response.headers['X-Frame-Options'] == 'DENY'
        
        assert 'X-XSS-Protection' in response.headers
        assert response.headers['X-XSS-Protection'] == '1; mode=block'
        
        assert 'Content-Security-Policy' in response.headers


def test_blueprint_exemption(app):
    """Test that blueprints can be exempted from CSRF protection."""
    init_csrf(app)
    
    # Create a test blueprint
    from flask import Blueprint
    test_bp = Blueprint('test_bp', __name__)
    
    @test_bp.route('/test')
    def test_route():
        return 'Test'
    
    app.register_blueprint(test_bp)
    
    # Exempt the blueprint
    exempt_blueprints(['test_bp'])
    
    # Now the blueprint should be in the exempt list
    assert 'test_bp' in csrf._exempt_blueprints 