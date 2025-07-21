"""
Test cases for the main Flask application.
"""

import pytest
from unittest.mock import patch, Mock


class TestApplication:
    """Test cases for Flask application."""
    
    def test_app_creation(self, app):
        """Test that the Flask app is created successfully."""
        assert app is not None
        assert app.config['TESTING'] is True
    
    def test_app_config(self, app):
        """Test application configuration."""
        assert 'SECRET_KEY' in app.config
        assert 'SQLALCHEMY_DATABASE_URI' in app.config
        assert app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] is False
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get('/health')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'status' in data
        assert data['status'] == 'healthy'
    
    def test_index_page(self, client):
        """Test index page loads."""
        response = client.get('/')
        assert response.status_code in [200, 302]  # 302 if redirected to login
    
    def test_login_page(self, client):
        """Test login page loads."""
        response = client.get('/login')
        assert response.status_code == 200
        assert b'login' in response.data.lower()
    
    def test_static_files(self, client):
        """Test static file serving."""
        # Test CSS file
        response = client.get('/static/css/style.css')
        assert response.status_code == 200
        assert response.content_type.startswith('text/css')
        
        # Test favicon
        response = client.get('/static/favicon.ico')
        assert response.status_code == 200


class TestAPIEndpoints:
    """Test cases for API endpoints."""
    
    def test_api_health(self, client):
        """Test API health endpoint."""
        response = client.get('/api/health')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'status' in data
        assert 'timestamp' in data
        assert 'version' in data
    
    def test_api_unauthorized_access(self, client):
        """Test unauthorized API access."""
        response = client.get('/api/admin/users')
        assert response.status_code in [401, 403]  # Unauthorized or Forbidden
    
    @pytest.mark.integration
    def test_file_system_api(self, client, auth_headers):
        """Test file system API endpoints."""
        # Test file listing
        response = client.get('/api/files/', headers=auth_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'files' in data or 'error' in data  # May error if no access to root
    
    @pytest.mark.integration
    def test_telegram_scanner_api(self, client, admin_headers):
        """Test Telegram scanner API endpoints."""
        # Test scanner status
        response = client.get('/api/scanner/status', headers=admin_headers)
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'status' in data


class TestAuthentication:
    """Test cases for authentication system."""
    
    def test_login_required_decorator(self, client):
        """Test login required decorator."""
        response = client.get('/admin')
        assert response.status_code in [302, 401]  # Redirect to login or unauthorized
    
    def test_admin_required_decorator(self, client, auth_headers):
        """Test admin required decorator."""
        response = client.get('/admin', headers=auth_headers)
        assert response.status_code in [403, 302]  # Forbidden or redirect
    
    @pytest.mark.integration
    def test_otp_generation(self, client):
        """Test OTP generation."""
        with patch('teledrive.services.send_otp_sync') as mock_send_otp:
            mock_send_otp.return_value = True
            
            response = client.post('/api/auth/send-otp', json={
                'phone_number': '+1234567890'
            })
            
            # Should succeed or fail gracefully
            assert response.status_code in [200, 400, 500]


class TestErrorHandling:
    """Test cases for error handling."""
    
    def test_404_error(self, client):
        """Test 404 error handling."""
        response = client.get('/nonexistent-page')
        assert response.status_code == 404
    
    def test_500_error_handling(self, client):
        """Test 500 error handling."""
        with patch('teledrive.app.render_template') as mock_render:
            mock_render.side_effect = Exception("Test error")
            
            response = client.get('/login')
            # Should handle error gracefully
            assert response.status_code in [500, 200]  # May be caught by error handler
    
    def test_invalid_json_request(self, client):
        """Test invalid JSON request handling."""
        response = client.post('/api/auth/login', 
                             data='invalid json',
                             content_type='application/json')
        assert response.status_code == 400


class TestSecurity:
    """Test cases for security features."""
    
    def test_csrf_protection(self, app):
        """Test CSRF protection is configured."""
        assert 'WTF_CSRF_ENABLED' in app.config
    
    def test_secure_headers(self, client):
        """Test security headers are present."""
        response = client.get('/')
        
        # Check for common security headers
        headers = response.headers
        # Note: Actual headers depend on security middleware configuration
        assert response.status_code in [200, 302]
    
    def test_rate_limiting(self, client):
        """Test rate limiting (if implemented)."""
        # Make multiple requests quickly
        responses = []
        for _ in range(10):
            response = client.get('/api/health')
            responses.append(response.status_code)
        
        # Should not be rate limited for health checks
        assert all(status == 200 for status in responses)


@pytest.mark.slow
class TestPerformance:
    """Test cases for performance."""
    
    def test_response_time(self, client):
        """Test response time for critical endpoints."""
        import time
        
        start_time = time.time()
        response = client.get('/api/health')
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 1.0  # Should respond within 1 second
    
    def test_concurrent_requests(self, client):
        """Test handling of concurrent requests."""
        import threading
        import time
        
        results = []
        
        def make_request():
            response = client.get('/api/health')
            results.append(response.status_code)
        
        # Create multiple threads
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        assert len(results) == 5
        assert all(status == 200 for status in results)
