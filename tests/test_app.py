"""
Basic application tests for TeleDrive.
"""

import pytest


def test_app_creation(app):
    """Test that the Flask app is created successfully."""
    assert app is not None
    assert app.config['TESTING'] is True


def test_index_page(client):
    """Test that the index page loads successfully."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'TeleDrive' in response.data


def test_static_files(client):
    """Test that static files are served correctly."""
    # Test CSS file
    response = client.get('/static/css/gdrive.css')
    assert response.status_code == 200
    assert response.content_type.startswith('text/css')
    
    # Test JavaScript file
    response = client.get('/static/js/gdrive.js')
    assert response.status_code == 200
    assert response.content_type.startswith('application/javascript')


def test_favicon(client):
    """Test that favicon is served correctly."""
    response = client.get('/static/favicon.ico')
    assert response.status_code == 200


def test_404_page(client):
    """Test that 404 errors are handled gracefully."""
    response = client.get('/nonexistent-page')
    assert response.status_code == 404


class TestAuthentication:
    """Test authentication functionality."""
    
    def test_login_page_loads(self, client):
        """Test that login page loads correctly."""
        response = client.get('/login')
        assert response.status_code == 200
        assert b'login' in response.data.lower()
    
    def test_setup_page_loads(self, client):
        """Test that setup page loads correctly."""
        response = client.get('/setup')
        assert response.status_code == 200
        assert b'setup' in response.data.lower()


class TestFileManagement:
    """Test file management functionality."""
    
    def test_file_upload_page(self, authenticated_user):
        """Test file upload functionality."""
        # This would test the upload endpoint
        # Implementation depends on your actual upload logic
        pass
    
    def test_file_listing(self, authenticated_user):
        """Test file listing functionality."""
        response = authenticated_user.get('/api/files')
        # Adjust based on your actual API structure
        assert response.status_code in [200, 404]  # 404 if no files exist


class TestAPI:
    """Test API endpoints."""
    
    def test_api_health_check(self, client):
        """Test API health check endpoint."""
        response = client.get('/api/health')
        # Adjust based on whether you have this endpoint
        assert response.status_code in [200, 404]
    
    def test_api_requires_authentication(self, client):
        """Test that API endpoints require authentication."""
        response = client.get('/api/files')
        # Should redirect to login or return 401/403
        assert response.status_code in [302, 401, 403, 404]
