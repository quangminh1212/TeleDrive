#!/usr/bin/env python3
"""
API and Route Tests for TeleDrive
Tests all Flask routes and API endpoints
"""

import pytest
import json
import tempfile
import os
from flask import Flask
from flask_login import LoginManager
from models import db, User, File, Folder
from unittest.mock import patch, MagicMock

# ================================================================
# FIXTURES AND SETUP
# ================================================================

@pytest.fixture
def app():
    """Create a minimal Flask app for testing"""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'test_secret_key'
    
    # Initialize database
    db.init_app(app)
    
    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Import routes after app setup
    with app.app_context():
        db.create_all()
        
        # Create test user
        test_user = User(
            username='testuser',
            email='test@example.com',
            role='user',
            is_active=True
        )
        test_user.set_password('testpassword')
        db.session.add(test_user)
        db.session.commit()
        
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """Create a test client"""
    return app.test_client()

@pytest.fixture
def authenticated_client(client):
    """Create an authenticated test client"""
    # Login the test user
    client.post('/login', data={
        'username': 'testuser',
        'password': 'testpassword'
    })
    return client

@pytest.fixture
def sample_folder(app):
    """Create a sample folder for testing"""
    with app.app_context():
        user = User.query.filter_by(username='testuser').first()
        folder = Folder(
            name='Test Folder',
            user_id=user.id,
            path='Test Folder'
        )
        db.session.add(folder)
        db.session.commit()
        return folder

@pytest.fixture
def sample_file(app, sample_folder):
    """Create a sample file for testing"""
    with app.app_context():
        user = User.query.filter_by(username='testuser').first()
        file = File(
            filename='test_file.txt',
            original_filename='test_file.txt',
            file_size=1024,
            mime_type='text/plain',
            folder_id=sample_folder.id,
            user_id=user.id,
            telegram_channel='@testchannel',
            telegram_message_id=12345
        )
        db.session.add(file)
        db.session.commit()
        return file

# ================================================================
# BASIC ROUTE TESTS
# ================================================================

class TestBasicRoutes:
    """Test basic application routes"""
    
    def test_login_page(self, client):
        """Test login page loads correctly"""
        response = client.get('/login')
        assert response.status_code == 200
        assert b'login' in response.data.lower()
    
    def test_register_page(self, client):
        """Test register page loads correctly"""
        response = client.get('/register')
        assert response.status_code == 200
        assert b'register' in response.data.lower()
    
    def test_dashboard_requires_auth(self, client):
        """Test dashboard requires authentication"""
        response = client.get('/')
        assert response.status_code == 302  # Redirect to login
    
    def test_settings_requires_auth(self, client):
        """Test settings page requires authentication"""
        response = client.get('/settings')
        assert response.status_code == 302  # Redirect to login
    
    def test_scan_requires_auth(self, client):
        """Test scan page requires authentication"""
        response = client.get('/scan')
        assert response.status_code == 302  # Redirect to login
    
    def test_search_requires_auth(self, client):
        """Test search page requires authentication"""
        response = client.get('/search')
        assert response.status_code == 302  # Redirect to login

# ================================================================
# AUTHENTICATED ROUTE TESTS
# ================================================================

class TestAuthenticatedRoutes:
    """Test routes that require authentication"""
    
    @patch('app.get_or_create_user')
    def test_dashboard_authenticated(self, mock_get_user, authenticated_client, app):
        """Test dashboard loads for authenticated users"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user
            
            response = authenticated_client.get('/')
            assert response.status_code == 200
            assert b'dashboard' in response.data.lower() or b'teledrive' in response.data.lower()
    
    @patch('app.ConfigManager')
    def test_settings_authenticated(self, mock_config, authenticated_client):
        """Test settings page loads for authenticated users"""
        mock_config_instance = MagicMock()
        mock_config_instance.load_config.return_value = {'telegram': {'api_id': '123'}}
        mock_config.return_value = mock_config_instance
        
        response = authenticated_client.get('/settings')
        assert response.status_code == 200
        assert b'settings' in response.data.lower()
    
    def test_scan_authenticated(self, authenticated_client):
        """Test scan page loads for authenticated users"""
        response = authenticated_client.get('/scan')
        assert response.status_code == 200
        assert b'scan' in response.data.lower()
    
    def test_search_authenticated(self, authenticated_client):
        """Test search page loads for authenticated users"""
        response = authenticated_client.get('/search')
        assert response.status_code == 200
        assert b'search' in response.data.lower()

# ================================================================
# API ENDPOINT TESTS
# ================================================================

class TestAPIEndpoints:
    """Test API endpoints"""
    
    @patch('app.ConfigManager')
    def test_save_settings_api(self, mock_config, authenticated_client):
        """Test save settings API endpoint"""
        mock_config_instance = MagicMock()
        mock_config_instance.save_config.return_value = True
        mock_config.return_value = mock_config_instance
        
        data = {
            'api_id': '12345678',
            'api_hash': 'test_hash',
            'phone_number': '+1234567890'
        }
        
        response = authenticated_client.post('/api/save_settings',
                                           data=json.dumps(data),
                                           content_type='application/json')
        
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result['success'] is True
    
    def test_save_settings_invalid_data(self, authenticated_client):
        """Test save settings with invalid data"""
        data = {}  # Empty data
        
        response = authenticated_client.post('/api/save_settings',
                                           data=json.dumps(data),
                                           content_type='application/json')
        
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result['success'] is False
    
    @patch('app.get_or_create_user')
    def test_get_files_api(self, mock_get_user, authenticated_client, app, sample_file):
        """Test get files API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user
            
            response = authenticated_client.get('/api/get_files')
            assert response.status_code == 200
            
            result = json.loads(response.data)
            assert isinstance(result, list)
            # Should contain our sample file
            assert len(result) >= 1
    
    @patch('app.get_or_create_user')
    def test_rename_file_api(self, mock_get_user, authenticated_client, app, sample_file):
        """Test rename file API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user
            
            data = {'name': 'renamed_file.txt'}
            
            response = authenticated_client.post(f'/api/files/{sample_file.id}/rename',
                                               data=json.dumps(data),
                                               content_type='application/json')
            
            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is True
            assert 'renamed' in result['message'].lower()
    
    @patch('app.get_or_create_user')
    def test_rename_file_invalid_id(self, mock_get_user, authenticated_client, app):
        """Test rename file with invalid file ID"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user
            
            data = {'name': 'renamed_file.txt'}
            
            response = authenticated_client.post('/api/files/99999/rename',
                                               data=json.dumps(data),
                                               content_type='application/json')
            
            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is False
            assert 'not found' in result['error'].lower()
    
    @patch('app.get_or_create_user')
    def test_delete_file_api(self, mock_get_user, authenticated_client, app, sample_file):
        """Test delete file API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user
            
            response = authenticated_client.post(f'/api/files/{sample_file.id}/delete')
            
            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is True
            
            # Verify file is marked as deleted
            file_record = File.query.get(sample_file.id)
            assert file_record.is_deleted is True
    
    @patch('app.get_or_create_user')
    def test_move_file_api(self, mock_get_user, authenticated_client, app, sample_file, sample_folder):
        """Test move file API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user
            
            # Create another folder to move to
            new_folder = Folder(
                name='New Folder',
                user_id=user.id,
                path='New Folder'
            )
            db.session.add(new_folder)
            db.session.commit()
            
            data = {'folder_id': new_folder.id}
            
            response = authenticated_client.post(f'/api/files/{sample_file.id}/move',
                                               data=json.dumps(data),
                                               content_type='application/json')
            
            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is True
    
    @patch('app.get_or_create_user')
    def test_bulk_file_operations(self, mock_get_user, authenticated_client, app, sample_file):
        """Test bulk file operations API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user
            
            data = {
                'operation': 'delete',
                'file_ids': [sample_file.id]
            }
            
            response = authenticated_client.post('/api/files/bulk',
                                               data=json.dumps(data),
                                               content_type='application/json')
            
            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is True
            assert len(result['results']) > 0

    @patch('app.get_or_create_user')
    def test_search_api(self, mock_get_user, authenticated_client, app, sample_file):
        """Test search API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user

            response = authenticated_client.get('/api/search?q=test')

            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is True
            assert 'results' in result
            assert 'total' in result

    def test_search_api_no_query(self, authenticated_client):
        """Test search API without query parameter"""
        response = authenticated_client.get('/api/search')

        assert response.status_code == 200
        result = json.loads(response.data)
        assert result['success'] is False
        assert 'required' in result['error'].lower()

    @patch('app.get_or_create_user')
    def test_search_suggestions_api(self, mock_get_user, authenticated_client, app, sample_file):
        """Test search suggestions API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user

            response = authenticated_client.get('/api/search/suggestions?q=te')

            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is True
            assert 'suggestions' in result

    def test_search_suggestions_short_query(self, authenticated_client):
        """Test search suggestions with short query"""
        response = authenticated_client.get('/api/search/suggestions?q=t')

        assert response.status_code == 200
        result = json.loads(response.data)
        assert result['success'] is True
        assert result['suggestions'] == []

# ================================================================
# FOLDER API TESTS
# ================================================================

class TestFolderAPI:
    """Test folder management API endpoints"""

    @patch('app.get_or_create_user')
    def test_get_folders_api(self, mock_get_user, authenticated_client, app, sample_folder):
        """Test get folders API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user

            response = authenticated_client.get('/api/folders')

            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is True
            assert 'folders' in result
            assert len(result['folders']) >= 1

    @patch('app.get_or_create_user')
    def test_create_folder_api(self, mock_get_user, authenticated_client, app):
        """Test create folder API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user

            data = {'name': 'New Test Folder'}

            response = authenticated_client.post('/api/folders',
                                               data=json.dumps(data),
                                               content_type='application/json')

            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is True
            assert 'folder' in result

    @patch('app.get_or_create_user')
    def test_create_folder_invalid_name(self, mock_get_user, authenticated_client, app):
        """Test create folder with invalid name"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user

            data = {'name': 'Invalid/Folder\\Name'}

            response = authenticated_client.post('/api/folders',
                                               data=json.dumps(data),
                                               content_type='application/json')

            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is False
            assert 'cannot contain' in result['error'].lower()

    @patch('app.get_or_create_user')
    def test_delete_folder_api(self, mock_get_user, authenticated_client, app, sample_folder):
        """Test delete folder API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user

            # Create empty folder for deletion
            empty_folder = Folder(
                name='Empty Folder',
                user_id=user.id,
                path='Empty Folder'
            )
            db.session.add(empty_folder)
            db.session.commit()

            response = authenticated_client.delete(f'/api/folders/{empty_folder.id}')

            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is True

    @patch('app.get_or_create_user')
    def test_rename_folder_api(self, mock_get_user, authenticated_client, app, sample_folder):
        """Test rename folder API endpoint"""
        with app.app_context():
            user = User.query.filter_by(username='testuser').first()
            mock_get_user.return_value = user

            data = {'name': 'Renamed Folder'}

            response = authenticated_client.post(f'/api/folders/{sample_folder.id}/rename',
                                               data=json.dumps(data),
                                               content_type='application/json')

            assert response.status_code == 200
            result = json.loads(response.data)
            assert result['success'] is True

# ================================================================
# FILE DOWNLOAD TESTS
# ================================================================

class TestFileDownload:
    """Test file download functionality"""

    def test_download_nonexistent_file(self, authenticated_client):
        """Test downloading non-existent file"""
        response = authenticated_client.get('/download/nonexistent.json')

        assert response.status_code == 404
        result = json.loads(response.data)
        assert 'not found' in result['error'].lower()

    def test_download_invalid_file_type(self, authenticated_client):
        """Test downloading invalid file type"""
        response = authenticated_client.get('/download/malicious.exe')

        assert response.status_code == 400
        result = json.loads(response.data)
        assert 'invalid file type' in result['error'].lower()

# ================================================================
# ERROR HANDLING TESTS
# ================================================================

class TestErrorHandling:
    """Test API error handling"""

    def test_api_invalid_json(self, authenticated_client):
        """Test API with invalid JSON"""
        response = authenticated_client.post('/api/save_settings',
                                           data='invalid json',
                                           content_type='application/json')

        # Should handle gracefully
        assert response.status_code in [200, 400]

    def test_api_missing_content_type(self, authenticated_client):
        """Test API without content type"""
        response = authenticated_client.post('/api/save_settings',
                                           data='{"test": "data"}')

        # Should handle gracefully
        assert response.status_code in [200, 400]

    @patch('app.get_or_create_user')
    def test_api_database_error(self, mock_get_user, authenticated_client):
        """Test API with database error"""
        mock_get_user.side_effect = Exception("Database error")

        response = authenticated_client.get('/api/get_files')

        # Should handle gracefully
        assert response.status_code in [200, 500]

# ================================================================
# AUTHENTICATION REQUIRED TESTS
# ================================================================

class TestAuthenticationRequired:
    """Test that API endpoints require authentication"""

    def test_api_endpoints_require_auth(self, client):
        """Test that API endpoints require authentication"""
        api_endpoints = [
            '/api/save_settings',
            '/api/get_files',
            '/api/search',
            '/api/folders'
        ]

        for endpoint in api_endpoints:
            response = client.get(endpoint)
            # Should redirect to login or return 401/403
            assert response.status_code in [302, 401, 403]

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
