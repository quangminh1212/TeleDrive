"""
Integration tests for API endpoints
"""

import pytest
import json


def test_api_status(client):
    """Test the API status endpoint."""
    response = client.get('/api/status')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert 'status' in data
    assert data['status'] == 'online'
    assert 'version' in data


def test_api_health(client):
    """Test the API health endpoint."""
    response = client.get('/api/health')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert 'status' in data
    assert data['status'] == 'healthy'


def test_api_files_endpoint(client, auth, test_user):
    """Test the files endpoint."""
    # In dev mode, no auth is needed
    response = client.get('/api/files')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert 'success' in data
    assert data['success'] is True
    assert 'files' in data
    assert isinstance(data['files'], list)


def test_api_session_files(client, auth, test_user):
    """Test getting files for a specific session."""
    response = client.get('/api/files/test-session')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert 'success' in data
    assert data['success'] is True
    assert 'files' in data
    assert isinstance(data['files'], list)
    assert 'session_id' in data
    assert data['session_id'] == 'test-session'


def test_file_creation_without_file(client):
    """Test file creation without providing a file."""
    response = client.post('/api/file/create')
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert 'success' in data
    assert data['success'] is False
    assert 'error' in data


def test_file_creation_with_empty_filename(client):
    """Test file creation with an empty filename."""
    response = client.post(
        '/api/file/create',
        data={'file': (b'', '')}
    )
    assert response.status_code == 400
    
    data = json.loads(response.data)
    assert 'success' in data
    assert data['success'] is False
    assert 'error' in data


def test_file_download_endpoint(client):
    """Test file download endpoint."""
    response = client.get('/api/file/download/test-session/123')
    
    # Since this is a mock implementation, we expect a 501 Not Implemented
    assert response.status_code == 501
    
    data = json.loads(response.data)
    assert 'success' in data
    assert data['success'] is False
    assert 'error' in data 