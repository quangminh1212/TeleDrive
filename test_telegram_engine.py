#!/usr/bin/env python3
"""
Telegram Engine Tests for TeleDrive
Tests Telegram scanning functionality and file processing
"""

import pytest
import asyncio
import json
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime
from pathlib import Path

# Import Telegram engine components
from engine import TelegramFileScanner
import config

# Mark all async tests
pytestmark = pytest.mark.asyncio

# ================================================================
# FIXTURES AND SETUP
# ================================================================

@pytest.fixture
def mock_telegram_client():
    """Create a mock Telegram client"""
    client = MagicMock()
    client.start = AsyncMock()
    client.get_entity = AsyncMock()
    client.get_messages = AsyncMock()
    client.iter_messages = AsyncMock()
    client.disconnect = AsyncMock()
    return client

@pytest.fixture
def mock_message():
    """Create a mock Telegram message with file"""
    from telethon.tl.types import MessageMediaDocument, DocumentAttributeFilename

    message = MagicMock()
    message.id = 12345
    message.date = datetime.now()
    message.text = "Test message with file"
    message.sender = MagicMock()
    message.sender.id = 67890

    # Mock media document with proper type checking
    message.media = MagicMock(spec=MessageMediaDocument)
    message.media.document = MagicMock()
    message.media.document.size = 1024
    message.media.document.mime_type = 'application/pdf'
    message.media.document.attributes = []

    # Mock filename attribute with proper type
    filename_attr = MagicMock(spec=DocumentAttributeFilename)
    filename_attr.file_name = 'test_document.pdf'
    message.media.document.attributes.append(filename_attr)

    # Mock chat
    message.chat = MagicMock()
    message.chat.id = -1001234567890
    message.chat.username = 'testchannel'
    message.chat.title = 'Test Channel'

    return message

@pytest.fixture
def scanner():
    """Create a TelegramFileScanner instance"""
    return TelegramFileScanner()

# ================================================================
# SCANNER INITIALIZATION TESTS
# ================================================================

class TestScannerInitialization:
    """Test scanner initialization and configuration"""
    
    def test_scanner_creation(self, scanner):
        """Test scanner can be created"""
        assert scanner is not None
        assert scanner.client is None
        assert scanner.files_data == []
        assert isinstance(scanner.output_dir, Path)
    
    @patch('config.PHONE_NUMBER', '+84987654321')
    @patch('config.API_ID', '12345678')
    @patch('config.API_HASH', 'test_hash')
    @patch('config.SESSION_NAME', 'test_session')
    @patch('engine.TelegramClient')
    async def test_scanner_initialization_success(self, mock_client_class, scanner):
        """Test successful scanner initialization"""
        mock_client = MagicMock()
        mock_client.start = AsyncMock()
        mock_client_class.return_value = mock_client
        
        await scanner.initialize()
        
        assert scanner.client is not None
        mock_client_class.assert_called_once()
        mock_client.start.assert_called_once()
    
    @patch('config.PHONE_NUMBER', '+84xxxxxxxxx')
    async def test_scanner_initialization_invalid_phone(self, scanner):
        """Test scanner initialization with invalid phone number"""
        with pytest.raises(ValueError) as exc_info:
            await scanner.initialize()
        
        assert "CHUA CAU HINH PHONE_NUMBER" in str(exc_info.value)
    
    @patch('config.PHONE_NUMBER', '+84987654321')
    @patch('config.API_ID', 'invalid_id')
    @patch('engine.TelegramClient')
    async def test_scanner_initialization_invalid_api_id(self, mock_client_class, scanner):
        """Test scanner initialization with invalid API ID"""
        mock_client = MagicMock()
        mock_client.start = AsyncMock(side_effect=ValueError("invalid literal for int()"))
        mock_client_class.return_value = mock_client
        
        with pytest.raises(ValueError) as exc_info:
            await scanner.initialize()
        
        assert "API_ID phai la so nguyen" in str(exc_info.value)

# ================================================================
# CHANNEL ENTITY TESTS
# ================================================================

class TestChannelEntity:
    """Test channel entity retrieval"""
    
    @patch('engine.TelegramClient')
    async def test_get_public_channel_entity(self, mock_client_class, scanner):
        """Test getting public channel entity"""
        mock_client = MagicMock()
        mock_entity = MagicMock()
        mock_entity.title = 'Test Channel'
        mock_entity.id = 1234567890
        
        mock_client.get_entity = AsyncMock(return_value=mock_entity)
        mock_client.get_messages = AsyncMock(return_value=[])
        scanner.client = mock_client
        
        entity = await scanner.get_channel_entity('@testchannel')
        
        assert entity is not None
        assert entity.title == 'Test Channel'
        mock_client.get_entity.assert_called_once_with('testchannel')
    
    @patch('engine.TelegramClient')
    async def test_get_private_channel_entity(self, mock_client_class, scanner):
        """Test getting private channel entity with invite link"""
        mock_client = MagicMock()
        mock_entity = MagicMock()
        mock_entity.title = 'Private Channel'
        
        mock_client.get_entity = AsyncMock(return_value=mock_entity)
        scanner.client = mock_client
        
        entity = await scanner.get_channel_entity('https://t.me/joinchat/abcdef123456')
        
        assert entity is not None
        assert entity.title == 'Private Channel'
        mock_client.get_entity.assert_called_once_with('https://t.me/joinchat/abcdef123456')
    
    @patch('engine.TelegramClient')
    async def test_get_channel_entity_error(self, mock_client_class, scanner):
        """Test channel entity retrieval error"""
        mock_client = MagicMock()
        mock_client.get_entity = AsyncMock(side_effect=Exception("Channel not found"))
        scanner.client = mock_client
        
        entity = await scanner.get_channel_entity('@nonexistent')
        
        assert entity is None

# ================================================================
# FILE EXTRACTION TESTS
# ================================================================

class TestFileExtraction:
    """Test file information extraction from messages"""
    
    def test_extract_file_info_document(self, scanner, mock_message):
        """Test extracting file info from document message"""
        file_info = scanner.extract_file_info(mock_message)
        
        assert file_info is not None
        assert file_info['message_id'] == 12345
        assert file_info['file_name'] == 'test_document.pdf'
        assert file_info['file_size'] == 1024
        assert file_info['mime_type'] == 'application/pdf'
        assert file_info['file_type'] == 'document'
        assert file_info['sender_id'] == 67890
    
    def test_extract_file_info_photo(self, scanner):
        """Test extracting file info from photo message"""
        message = MagicMock()
        message.id = 12346
        message.date = datetime.now()
        message.text = "Photo message"
        message.sender = MagicMock()
        message.sender.id = 67890
        
        # Mock photo media
        from telethon.tl.types import MessageMediaPhoto
        message.media = MagicMock(spec=MessageMediaPhoto)
        message.media.photo = MagicMock()
        message.media.photo.sizes = [MagicMock()]
        message.media.photo.sizes[0].size = 2048
        message.media.photo.sizes[0].w = 1920
        message.media.photo.sizes[0].h = 1080
        
        message.chat = MagicMock()
        message.chat.id = -1001234567890
        message.chat.username = 'testchannel'
        
        file_info = scanner.extract_file_info(message)
        
        assert file_info is not None
        assert file_info['file_type'] == 'photo'
        assert file_info['file_name'] == 'photo_12346.jpg'
        assert file_info['file_size'] == 2048
        assert file_info['width'] == 1920
        assert file_info['height'] == 1080
    
    def test_extract_file_info_no_media(self, scanner):
        """Test extracting file info from message without media"""
        message = MagicMock()
        message.media = None
        
        file_info = scanner.extract_file_info(message)
        
        assert file_info is None
    
    def test_get_extension_from_mime(self, scanner):
        """Test getting file extension from MIME type"""
        test_cases = [
            ('image/jpeg', '.jpg'),
            ('image/png', '.png'),
            ('video/mp4', '.mp4'),
            ('audio/mpeg', '.mp3'),
            ('application/pdf', '.pdf'),
            ('text/plain', '.txt'),
            ('unknown/type', '')
        ]
        
        for mime_type, expected_ext in test_cases:
            assert scanner.get_extension_from_mime(mime_type) == expected_ext

# ================================================================
# FILE TYPE FILTERING TESTS
# ================================================================

class TestFileTypeFiltering:
    """Test file type filtering logic"""
    
    @patch('config.SCAN_DOCUMENTS', True)
    @patch('config.SCAN_PHOTOS', True)
    @patch('config.SCAN_VIDEOS', False)
    def test_should_include_file_type(self, scanner):
        """Test file type inclusion logic"""
        assert scanner.should_include_file_type('document') is True
        assert scanner.should_include_file_type('photo') is True
        assert scanner.should_include_file_type('video') is False
        assert scanner.should_include_file_type('unknown') is True  # Default

# ================================================================
# SCANNING PROCESS TESTS
# ================================================================

class TestScanningProcess:
    """Test the scanning process"""
    
    @patch('engine.TelegramClient')
    async def test_scan_channel_success(self, mock_client_class, scanner, mock_message):
        """Test successful channel scanning"""
        mock_client = MagicMock()
        mock_entity = MagicMock()
        mock_entity.title = 'Test Channel'
        mock_entity.id = 1234567890
        
        # Mock client methods
        mock_client.get_entity = AsyncMock(return_value=mock_entity)
        mock_client.get_messages = AsyncMock(return_value=[])
        
        # Mock iter_messages to return our mock message
        async def mock_iter_messages(*args, **kwargs):
            yield mock_message
        
        mock_client.iter_messages = mock_iter_messages
        scanner.client = mock_client
        
        await scanner.scan_channel('@testchannel')
        
        # Should have found one file
        assert len(scanner.files_data) == 1
        assert scanner.files_data[0]['file_name'] == 'test_document.pdf'
    
    @patch('engine.TelegramClient')
    async def test_scan_channel_no_entity(self, mock_client_class, scanner):
        """Test scanning when channel entity cannot be retrieved"""
        mock_client = MagicMock()
        mock_client.get_entity = AsyncMock(side_effect=Exception("Channel not found"))
        scanner.client = mock_client
        
        await scanner.scan_channel('@nonexistent')
        
        # Should have no files
        assert len(scanner.files_data) == 0

# ================================================================
# OUTPUT GENERATION TESTS
# ================================================================

class TestOutputGeneration:
    """Test output file generation"""
    
    @patch('config.OUTPUT_FORMATS', {'json': {'enabled': True, 'filename': 'test.json'}})
    async def test_save_results_json(self, scanner, tmp_path):
        """Test saving results to JSON"""
        # Set temporary output directory
        scanner.output_dir = tmp_path
        
        # Add test data
        scanner.files_data = [
            {
                'message_id': 12345,
                'file_name': 'test.pdf',
                'file_size': 1024,
                'file_type': 'document',
                'date': '2023-01-01T12:00:00'
            }
        ]
        
        await scanner.save_results()
        
        # Check if JSON file was created
        json_file = tmp_path / 'test.json'
        assert json_file.exists()
        
        # Check JSON content
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        assert len(data) == 1
        assert data[0]['file_name'] == 'test.pdf'
    
    async def test_save_results_no_files(self, scanner, tmp_path):
        """Test saving results when no files found"""
        scanner.output_dir = tmp_path
        scanner.files_data = []
        
        await scanner.save_results()
        
        # Should still create output files (empty)
        # This depends on implementation - adjust as needed

# ================================================================
# ERROR HANDLING TESTS
# ================================================================

class TestErrorHandling:
    """Test error handling in scanning process"""
    
    @patch('engine.TelegramClient')
    async def test_client_connection_error(self, mock_client_class, scanner):
        """Test handling client connection errors"""
        mock_client = MagicMock()
        mock_client.start = AsyncMock(side_effect=ConnectionError("Network error"))
        mock_client_class.return_value = mock_client
        
        with pytest.raises(ConnectionError):
            await scanner.initialize()
    
    def test_extract_file_info_malformed_message(self, scanner):
        """Test extracting file info from malformed message"""
        message = MagicMock()
        message.media = MagicMock()
        message.media.document = None  # Malformed document
        
        # Should handle gracefully
        file_info = scanner.extract_file_info(message)
        # Depending on implementation, this might return None or handle gracefully

# ================================================================
# DOWNLOAD LINK GENERATION TESTS
# ================================================================

class TestDownloadLinkGeneration:
    """Test download link generation"""
    
    @patch('config.GENERATE_DOWNLOAD_LINKS', True)
    def test_generate_public_channel_link(self, scanner, mock_message):
        """Test generating download link for public channel"""
        file_info = scanner.extract_file_info(mock_message)
        
        assert file_info is not None
        assert 'download_link' in file_info
        assert 'https://t.me/testchannel/12345' in file_info['download_link']
    
    @patch('config.GENERATE_DOWNLOAD_LINKS', True)
    def test_generate_private_channel_link(self, scanner):
        """Test generating download link for private channel"""
        message = MagicMock()
        message.id = 12345
        message.date = datetime.now()
        message.text = "Test message"
        message.sender = MagicMock()
        message.sender.id = 67890
        
        # Mock media
        message.media = MagicMock()
        message.media.document = MagicMock()
        message.media.document.size = 1024
        message.media.document.mime_type = 'application/pdf'
        message.media.document.attributes = []
        
        # Mock private chat (no username)
        message.chat = MagicMock()
        message.chat.id = -1001234567890
        message.chat.username = None  # Private channel
        
        file_info = scanner.extract_file_info(message)
        
        assert file_info is not None
        assert 'download_link' in file_info
        assert 'https://t.me/c/' in file_info['download_link']

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
