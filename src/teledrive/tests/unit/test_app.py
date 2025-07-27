"""
Unit tests for main Flask application.
"""
import unittest
from unittest import mock

class TestApp(unittest.TestCase):
    """Test suite for the main Flask application."""
    
    def setUp(self):
        """Set up test environment."""
        # Import app locally to avoid circular imports
        with mock.patch('flask_login.LoginManager'):  # Mock flask_login
            from src.teledrive.app import app
            self.app = app.test_client()
            self.app.testing = True
    
    def test_index_route(self):
        """Test that the index route returns 200 or 302 (redirect to login)."""
        response = self.app.get('/')
        # Either 200 OK or 302 redirect to login
        self.assertIn(response.status_code, [200, 302])
    
    def test_api_status(self):
        """Test that the API status endpoint works."""
        response = self.app.get('/api/status')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'status', response.data)
        self.assertIn(b'ok', response.data)

if __name__ == '__main__':
    unittest.main() 