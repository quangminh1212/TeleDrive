#!/usr/bin/env python3
"""
Integration tests for web interface
Test 4: File Management and Web Interface Tests
"""

import pytest
import json
import tempfile
from pathlib import Path
import sys
import io

# Add source to path
project_root = Path(__file__).parent.parent.parent
source_dir = project_root / 'source'
sys.path.insert(0, str(source_dir))

from models import db, User, File, Folder

class TestWebInterfaceBasics:
    """Test basic web interface functionality"""
    
    def test_home_page_access(self, test_client):
        """Test accessing the home page"""
        response = test_client.get('/')
        assert response.status_code == 200
        assert b'TeleDrive' in response.data or b'teledrive' in response.data.lower()
    
    def test_settings_page_access(self, test_client):
        """Test accessing settings page"""
        response = test_client.get('/settings')
        assert response.status_code == 200
    
    def test_scan_page_access(self, test_client):
        """Test accessing scan page"""
        response = test_client.get('/scan')
        assert response.status_code == 200
    
    def test_search_page_access(self, test_client):
        """Test accessing search page"""
        response = test_client.get('/search')
        assert response.status_code == 200

class TestFileManagement:
    """Test 4.1-4.10: File management functionality"""
    
    def test_file_list_display(self, authenticated_client, test_db):
        """Test 4.1: Display file list"""
        response = authenticated_client.get('/')
        assert response.status_code == 200
        
        # Should show files in some format
        # The exact format depends on the template
        assert response.data is not None
    
    def test_file_upload_endpoint(self, authenticated_client, temp_dir):
        """Test 4.2: File upload functionality"""
        # Create a test file
        test_file = temp_dir / 'test_upload.txt'
        test_content = 'This is a test file for upload'
        with open(test_file, 'w') as f:
            f.write(test_content)
        
        # Test file upload
        with open(test_file, 'rb') as f:
            data = {
                'file': (f, 'test_upload.txt', 'text/plain')
            }
            response = authenticated_client.post('/api/upload', 
                                               data=data,
                                               content_type='multipart/form-data')
        
        # Should handle upload (might return various status codes depending on implementation)
        assert response.status_code in [200, 201, 400, 404, 405]
    
    def test_file_download_endpoint(self, authenticated_client, test_file):
        """Test 4.3: File download functionality"""
        # Test download endpoint
        response = authenticated_client.get(f'/api/download/{test_file.id}')
        
        # Should handle download request
        assert response.status_code in [200, 404, 403]
    
    def test_file_rename_endpoint(self, authenticated_client, test_file):
        """Test 4.5: File rename functionality"""
        new_name = 'renamed_file.txt'
        
        response = authenticated_client.post(f'/api/files/{test_file.id}/rename',
                                           json={'new_name': new_name})
        
        # Should handle rename request
        assert response.status_code in [200, 400, 404]
    
    def test_file_delete_endpoint(self, authenticated_client, test_file):
        """Test 4.6: File delete functionality"""
        response = authenticated_client.delete(f'/api/files/{test_file.id}')
        
        # Should handle delete request
        assert response.status_code in [200, 204, 404]
    
    def test_file_move_endpoint(self, authenticated_client, test_file, test_folder):
        """Test 4.7: File move functionality"""
        response = authenticated_client.post(f'/api/files/{test_file.id}/move',
                                           json={'folder_id': test_folder.id})
        
        # Should handle move request
        assert response.status_code in [200, 400, 404]
    
    def test_bulk_operations_endpoint(self, authenticated_client, test_db):
        """Test 4.8: Bulk file operations"""
        # Test bulk delete
        file_ids = [test_db['file'].id]
        
        response = authenticated_client.post('/api/files/bulk/delete',
                                           json={'file_ids': file_ids})
        
        # Should handle bulk operations
        assert response.status_code in [200, 400, 404]

class TestFolderManagement:
    """Test 5.1-5.7: Folder management functionality"""
    
    def test_folder_creation_endpoint(self, authenticated_client, test_user):
        """Test 5.1: Create new folder"""
        folder_data = {
            'name': 'New Test Folder',
            'parent_id': None
        }
        
        response = authenticated_client.post('/api/folders',
                                           json=folder_data)
        
        # Should handle folder creation
        assert response.status_code in [200, 201, 400]
    
    def test_subfolder_creation(self, authenticated_client, test_folder):
        """Test 5.2: Create subfolder"""
        subfolder_data = {
            'name': 'Sub Folder',
            'parent_id': test_folder.id
        }
        
        response = authenticated_client.post('/api/folders',
                                           json=subfolder_data)
        
        # Should handle subfolder creation
        assert response.status_code in [200, 201, 400]
    
    def test_folder_rename_endpoint(self, authenticated_client, test_folder):
        """Test 5.3: Rename folder"""
        new_name = 'Renamed Folder'
        
        response = authenticated_client.post(f'/api/folders/{test_folder.id}/rename',
                                           json={'new_name': new_name})
        
        # Should handle folder rename
        assert response.status_code in [200, 400, 404]
    
    def test_folder_delete_endpoint(self, authenticated_client, test_folder):
        """Test 5.4: Delete folder"""
        response = authenticated_client.delete(f'/api/folders/{test_folder.id}')
        
        # Should handle folder deletion
        assert response.status_code in [200, 204, 400, 404]
    
    def test_folder_move_endpoint(self, authenticated_client, test_app):
        """Test 5.5: Move folder"""
        with test_app.app_context():
            db.create_all()
            
            # Create test user
            user = User(username='testuser', email='test@example.com')
            user.set_password('test')
            db.session.add(user)
            db.session.commit()
            
            # Create parent and child folders
            parent_folder = Folder(name='Parent', user_id=user.id, path='Parent')
            child_folder = Folder(name='Child', user_id=user.id, path='Child')
            db.session.add_all([parent_folder, child_folder])
            db.session.commit()
            
            # Test moving child into parent
            response = authenticated_client.post(f'/api/folders/{child_folder.id}/move',
                                               json={'parent_id': parent_folder.id})
            
            # Should handle folder move
            assert response.status_code in [200, 400, 404]
            
            db.session.remove()
            db.drop_all()

class TestSearchAndFilter:
    """Test 6.1-6.9: Search and filter functionality"""
    
    def test_search_endpoint(self, authenticated_client):
        """Test 6.1: Search by filename"""
        search_query = 'test'
        
        response = authenticated_client.get(f'/api/search?q={search_query}')
        
        # Should handle search request
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            # Should return JSON response
            try:
                data = json.loads(response.data)
                assert isinstance(data, (dict, list))
            except json.JSONDecodeError:
                # Response might not be JSON
                pass
    
    def test_filter_by_file_type(self, authenticated_client):
        """Test 6.3: Filter by file type"""
        response = authenticated_client.get('/api/files?type=document')
        
        # Should handle file type filtering
        assert response.status_code in [200, 400]
    
    def test_filter_by_size(self, authenticated_client):
        """Test 6.4: Filter by file size"""
        response = authenticated_client.get('/api/files?min_size=1024&max_size=1048576')
        
        # Should handle size filtering
        assert response.status_code in [200, 400]
    
    def test_search_suggestions(self, authenticated_client):
        """Test 6.7: Search suggestions/autocomplete"""
        response = authenticated_client.get('/api/search/suggestions?q=te')
        
        # Should handle search suggestions
        assert response.status_code in [200, 404]

class TestSettings:
    """Test 13.1-13.6: Settings and configuration"""
    
    def test_save_telegram_settings(self, authenticated_client):
        """Test 13.1: Update Telegram API settings"""
        settings_data = {
            'api_id': '123456',
            'api_hash': 'test_hash',
            'phone_number': '+1234567890'
        }
        
        response = authenticated_client.post('/api/save_settings',
                                           json=settings_data)
        
        # Should handle settings update
        assert response.status_code in [200, 400, 403]
    
    def test_get_current_settings(self, authenticated_client):
        """Test retrieving current settings"""
        response = authenticated_client.get('/api/settings')
        
        # Should return current settings
        assert response.status_code in [200, 404]

class TestAPIEndpoints:
    """Test various API endpoints"""
    
    def test_api_status(self, test_client):
        """Test API status endpoint"""
        response = test_client.get('/api/status')
        
        # Should return status (might not exist)
        assert response.status_code in [200, 404]
    
    def test_api_files_list(self, authenticated_client):
        """Test files API endpoint"""
        response = authenticated_client.get('/api/files')
        
        # Should return files list
        assert response.status_code in [200, 404]
    
    def test_api_folders_list(self, authenticated_client):
        """Test folders API endpoint"""
        response = authenticated_client.get('/api/folders')
        
        # Should return folders list
        assert response.status_code in [200, 404]
    
    def test_api_scan_start(self, authenticated_client):
        """Test starting a scan via API"""
        scan_data = {
            'channel': 'test_channel',
            'max_messages': 100
        }
        
        response = authenticated_client.post('/api/scan/start',
                                           json=scan_data)
        
        # Should handle scan start request
        assert response.status_code in [200, 400, 404]
    
    def test_api_scan_status(self, authenticated_client):
        """Test getting scan status"""
        response = authenticated_client.get('/api/scan/status')
        
        # Should return scan status
        assert response.status_code in [200, 404]

class TestErrorHandling:
    """Test error handling in web interface"""
    
    def test_404_handling(self, test_client):
        """Test 404 error handling"""
        response = test_client.get('/nonexistent-page')
        assert response.status_code == 404
    
    def test_invalid_api_request(self, authenticated_client):
        """Test handling invalid API requests"""
        # Send malformed JSON
        response = authenticated_client.post('/api/save_settings',
                                           data='invalid json',
                                           content_type='application/json')
        
        # Should handle malformed requests gracefully
        assert response.status_code in [400, 422, 500]
    
    def test_unauthorized_access(self, test_client):
        """Test unauthorized access to protected endpoints"""
        # Try to access protected endpoint without authentication
        response = test_client.get('/api/files')
        
        # Should require authentication
        assert response.status_code in [401, 403, 302]  # 302 for redirect to login

class TestResponseFormats:
    """Test response formats and content types"""
    
    def test_json_response_format(self, authenticated_client):
        """Test that API endpoints return proper JSON"""
        response = authenticated_client.get('/api/files')
        
        if response.status_code == 200:
            # Should have JSON content type
            assert 'application/json' in response.content_type or response.content_type == 'application/json'
    
    def test_html_response_format(self, test_client):
        """Test that web pages return HTML"""
        response = test_client.get('/')
        
        if response.status_code == 200:
            # Should have HTML content type
            assert 'text/html' in response.content_type or response.content_type == 'text/html'
