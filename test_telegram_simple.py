#!/usr/bin/env python3
"""
Simple Telegram Engine Tests for TeleDrive
Tests core Telegram functionality without complex async mocking
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime
from pathlib import Path

# Import Telegram engine components
from engine import TelegramFileScanner

# ================================================================
# FIXTURES AND SETUP
# ================================================================

@pytest.fixture
def scanner():
    """Create a TelegramFileScanner instance"""
    return TelegramFileScanner()

@pytest.fixture
def mock_document_message():
    """Create a mock Telegram message with document"""
    from telethon.tl.types import MessageMediaDocument, DocumentAttributeFilename
    
    message = MagicMock()
    message.id = 12345
    message.date = datetime.now()
    message.text = "Test document message"
    message.sender = MagicMock()
    message.sender.id = 67890
    
    # Mock media document with proper type checking
    message.media = MagicMock(spec=MessageMediaDocument)
    message.media.document = MagicMock()
    message.media.document.size = 1024
    message.media.document.mime_type = 'application/pdf'
    message.media.document.attributes = []
    
    # Mock filename attribute
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
def mock_photo_message():
    """Create a mock Telegram message with photo"""
    from telethon.tl.types import MessageMediaPhoto
    
    message = MagicMock()
    message.id = 12346
    message.date = datetime.now()
    message.text = "Test photo message"
    message.sender = MagicMock()
    message.sender.id = 67890
    
    # Mock photo media
    message.media = MagicMock(spec=MessageMediaPhoto)
    message.media.photo = MagicMock()
    message.media.photo.sizes = [MagicMock()]
    message.media.photo.sizes[0].size = 2048
    message.media.photo.sizes[0].w = 1920
    message.media.photo.sizes[0].h = 1080
    
    # Mock chat
    message.chat = MagicMock()
    message.chat.id = -1001234567890
    message.chat.username = 'testchannel'
    
    return message

# ================================================================
# SCANNER BASIC TESTS
# ================================================================

class TestScannerBasics:
    """Test basic scanner functionality"""
    
    def test_scanner_creation(self, scanner):
        """Test scanner can be created"""
        assert scanner is not None
        assert scanner.client is None
        assert scanner.files_data == []
        assert isinstance(scanner.output_dir, Path)
    
    def test_scanner_output_directory_creation(self, scanner, tmp_path):
        """Test output directory is created"""
        scanner.output_dir = tmp_path / 'test_output'
        scanner.output_dir.mkdir(exist_ok=True)
        
        assert scanner.output_dir.exists()
        assert scanner.output_dir.is_dir()

# ================================================================
# FILE EXTRACTION TESTS
# ================================================================

class TestFileExtraction:
    """Test file information extraction from messages"""
    
    def test_extract_file_info_document(self, scanner, mock_document_message):
        """Test extracting file info from document message"""
        file_info = scanner.extract_file_info(mock_document_message)
        
        assert file_info is not None
        assert file_info['message_id'] == 12345
        assert file_info['file_name'] == 'test_document.pdf'
        assert file_info['file_size'] == 1024
        assert file_info['mime_type'] == 'application/pdf'
        assert file_info['file_type'] == 'document'
        assert file_info['sender_id'] == 67890
        assert file_info['message_text'] == "Test document message"
    
    def test_extract_file_info_photo(self, scanner, mock_photo_message):
        """Test extracting file info from photo message"""
        file_info = scanner.extract_file_info(mock_photo_message)
        
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
    
    def test_extract_file_info_no_filename(self, scanner):
        """Test extracting file info from document without filename"""
        from telethon.tl.types import MessageMediaDocument, DocumentAttributeFilename

        message = MagicMock()
        message.id = 12347
        message.date = datetime.now()
        message.text = "Document without filename"
        message.sender = MagicMock()
        message.sender.id = 67890

        # Mock media document with filename attribute but no file_name
        message.media = MagicMock(spec=MessageMediaDocument)
        message.media.document = MagicMock()
        message.media.document.size = 2048
        message.media.document.mime_type = 'application/pdf'

        # Add a filename attribute to set file_type to 'document'
        filename_attr = MagicMock(spec=DocumentAttributeFilename)
        filename_attr.file_name = None  # No filename
        message.media.document.attributes = [filename_attr]

        message.chat = MagicMock()
        message.chat.id = -1001234567890
        message.chat.username = 'testchannel'

        file_info = scanner.extract_file_info(message)

        assert file_info is not None
        assert file_info['file_name'] == 'file_12347.pdf'  # Generated filename
        assert file_info['file_type'] == 'document'

# ================================================================
# UTILITY FUNCTION TESTS
# ================================================================

class TestUtilityFunctions:
    """Test utility functions"""
    
    def test_get_extension_from_mime(self, scanner):
        """Test getting file extension from MIME type"""
        test_cases = [
            ('image/jpeg', '.jpg'),
            ('image/png', '.png'),
            ('image/gif', '.gif'),
            ('video/mp4', '.mp4'),
            ('video/avi', '.avi'),
            ('audio/mpeg', '.mp3'),
            ('audio/ogg', '.ogg'),
            ('application/pdf', '.pdf'),
            ('application/zip', '.zip'),
            ('text/plain', '.txt'),
            ('unknown/type', ''),  # Unknown type returns empty string
            ('', '')  # Empty type returns empty string
        ]
        
        for mime_type, expected_ext in test_cases:
            assert scanner.get_extension_from_mime(mime_type) == expected_ext
    
    @patch('config.SCAN_DOCUMENTS', True)
    @patch('config.SCAN_PHOTOS', True)
    @patch('config.SCAN_VIDEOS', False)
    @patch('config.SCAN_AUDIO', True)
    @patch('config.SCAN_VOICE', False)
    @patch('config.SCAN_STICKERS', True)
    @patch('config.SCAN_ANIMATIONS', False)
    def test_should_include_file_type(self, scanner):
        """Test file type inclusion logic"""
        assert scanner.should_include_file_type('document') is True
        assert scanner.should_include_file_type('photo') is True
        assert scanner.should_include_file_type('video') is False
        assert scanner.should_include_file_type('audio') is True
        assert scanner.should_include_file_type('voice') is False
        assert scanner.should_include_file_type('sticker') is True
        assert scanner.should_include_file_type('animation') is False
        assert scanner.should_include_file_type('unknown') is True  # Default True

# ================================================================
# DOWNLOAD LINK GENERATION TESTS
# ================================================================

class TestDownloadLinkGeneration:
    """Test download link generation"""
    
    @patch('config.GENERATE_DOWNLOAD_LINKS', True)
    def test_generate_public_channel_link(self, scanner, mock_document_message):
        """Test generating download link for public channel"""
        file_info = scanner.extract_file_info(mock_document_message)
        
        assert file_info is not None
        assert 'download_link' in file_info
        assert 'https://t.me/testchannel/12345' in file_info['download_link']
    
    @patch('config.GENERATE_DOWNLOAD_LINKS', True)
    def test_generate_private_channel_link(self, scanner):
        """Test generating download link for private channel"""
        from telethon.tl.types import MessageMediaDocument, DocumentAttributeFilename
        
        message = MagicMock()
        message.id = 12345
        message.date = datetime.now()
        message.text = "Test message"
        message.sender = MagicMock()
        message.sender.id = 67890
        
        # Mock media
        message.media = MagicMock(spec=MessageMediaDocument)
        message.media.document = MagicMock()
        message.media.document.size = 1024
        message.media.document.mime_type = 'application/pdf'
        message.media.document.attributes = []
        
        filename_attr = MagicMock(spec=DocumentAttributeFilename)
        filename_attr.file_name = 'test.pdf'
        message.media.document.attributes.append(filename_attr)
        
        # Mock private chat (no username)
        message.chat = MagicMock()
        message.chat.id = -1001234567890
        message.chat.username = None  # Private channel
        
        file_info = scanner.extract_file_info(message)
        
        assert file_info is not None
        assert 'download_link' in file_info
        assert 'https://t.me/c/' in file_info['download_link']
        assert '1234567890' in file_info['download_link']  # Clean ID without -100 prefix
    
    @patch('config.GENERATE_DOWNLOAD_LINKS', False)
    def test_no_download_link_generation(self, scanner, mock_document_message):
        """Test that download links are not generated when disabled"""
        file_info = scanner.extract_file_info(mock_document_message)
        
        assert file_info is not None
        assert file_info['download_link'] is None

# ================================================================
# DATA PROCESSING TESTS
# ================================================================

class TestDataProcessing:
    """Test data processing functionality"""
    
    def test_files_data_accumulation(self, scanner, mock_document_message, mock_photo_message):
        """Test that files data is accumulated correctly"""
        # Extract info from multiple messages
        doc_info = scanner.extract_file_info(mock_document_message)
        photo_info = scanner.extract_file_info(mock_photo_message)
        
        # Add to scanner's files data
        scanner.files_data.append(doc_info)
        scanner.files_data.append(photo_info)
        
        assert len(scanner.files_data) == 2
        assert scanner.files_data[0]['file_type'] == 'document'
        assert scanner.files_data[1]['file_type'] == 'photo'
    
    def test_file_info_serialization(self, scanner, mock_document_message):
        """Test that file info can be serialized to JSON"""
        file_info = scanner.extract_file_info(mock_document_message)
        
        # Should be JSON serializable
        json_str = json.dumps(file_info, default=str)
        assert json_str is not None
        
        # Should be deserializable
        deserialized = json.loads(json_str)
        assert deserialized['file_name'] == 'test_document.pdf'
        assert deserialized['file_type'] == 'document'

# ================================================================
# ERROR HANDLING TESTS
# ================================================================

class TestErrorHandling:
    """Test error handling in file extraction"""
    
    def test_extract_file_info_malformed_document(self, scanner):
        """Test extracting file info from malformed document"""
        from telethon.tl.types import MessageMediaDocument

        message = MagicMock()
        message.id = 12348
        message.date = datetime.now()
        message.text = "Malformed document"
        message.sender = MagicMock()
        message.sender.id = 67890

        # Mock malformed media document
        message.media = MagicMock(spec=MessageMediaDocument)
        message.media.document = None  # Malformed - document is None

        message.chat = MagicMock()
        message.chat.id = -1001234567890

        # Should raise AttributeError due to doc.size access
        with pytest.raises(AttributeError):
            scanner.extract_file_info(message)
    
    def test_extract_file_info_missing_attributes(self, scanner):
        """Test extracting file info when attributes are missing"""
        from telethon.tl.types import MessageMediaDocument, DocumentAttributeFilename

        message = MagicMock()
        message.id = 12349
        message.date = datetime.now()
        message.text = "Document with missing attributes"
        message.sender = None  # Missing sender

        # Mock media document with at least one attribute to set file_type
        message.media = MagicMock(spec=MessageMediaDocument)
        message.media.document = MagicMock()
        message.media.document.size = 1024
        message.media.document.mime_type = 'application/pdf'

        # Add filename attribute to ensure file_type is set
        filename_attr = MagicMock(spec=DocumentAttributeFilename)
        filename_attr.file_name = 'test.pdf'
        message.media.document.attributes = [filename_attr]

        message.chat = MagicMock()
        message.chat.id = -1001234567890

        file_info = scanner.extract_file_info(message)

        # Should handle missing sender gracefully
        assert file_info is not None
        assert file_info['sender_id'] is None
        assert file_info['file_name'] == 'test.pdf'
        assert file_info['file_type'] == 'document'

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
