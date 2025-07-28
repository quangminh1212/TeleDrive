#!/usr/bin/env python3
"""
Performance and Integration Tests for TeleDrive
Tests system performance and end-to-end integration
"""

import pytest
import time
from unittest.mock import MagicMock
from flask import Flask
from models import db, User, File, Folder
from engine import TelegramFileScanner

# ================================================================
# FIXTURES AND SETUP
# ================================================================

@pytest.fixture
def app():
    """Create a Flask app for testing"""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'test_secret_key'
    
    # Initialize database
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        # Create test user
        test_user = User(
            username='perfuser',
            email='perf@example.com',
            role='user',
            is_active=True
        )
        test_user.set_password('testpassword')
        db.session.add(test_user)
        db.session.commit()
        
        yield app
        db.drop_all()

# ================================================================
# PERFORMANCE TESTS
# ================================================================

class TestDatabasePerformance:
    """Test database performance"""
    
    def test_bulk_file_creation_performance(self, app):
        """Test performance of bulk file creation"""
        with app.app_context():
            user = User.query.filter_by(username='perfuser').first()
            
            # Create folder
            folder = Folder(
                name='Performance Test Folder',
                user_id=user.id,
                path='Performance Test Folder'
            )
            db.session.add(folder)
            db.session.commit()
            
            # Measure time for bulk file creation
            start_time = time.time()
            
            # Create 100 files
            files = []
            for i in range(100):
                file = File(
                    filename=f'perf_file_{i}.txt',
                    original_filename=f'perf_file_{i}.txt',
                    file_size=1024 * (i + 1),
                    mime_type='text/plain',
                    folder_id=folder.id,
                    user_id=user.id,
                    description=f'Performance test file {i}'
                )
                files.append(file)
            
            # Bulk insert
            db.session.add_all(files)
            db.session.commit()
            
            end_time = time.time()
            creation_time = end_time - start_time
            
            # Verify all files were created
            saved_files = File.query.filter_by(folder_id=folder.id).all()
            assert len(saved_files) == 100
            
            # Performance assertion (should complete within 5 seconds)
            assert creation_time < 5.0, f"Bulk creation took {creation_time:.2f}s, expected < 5.0s"
            
            print(f"✅ Created 100 files in {creation_time:.2f} seconds")
    
    def test_large_query_performance(self, app):
        """Test performance of large database queries"""
        with app.app_context():
            user = User.query.filter_by(username='perfuser').first()
            
            # Create many files for querying
            files = []
            for i in range(500):
                file = File(
                    filename=f'query_file_{i}.txt',
                    file_size=1024,
                    mime_type='text/plain',
                    user_id=user.id
                )
                files.append(file)
            
            db.session.add_all(files)
            db.session.commit()
            
            # Measure query performance
            start_time = time.time()
            
            # Query all files for user
            user_files = File.query.filter_by(user_id=user.id).all()
            
            end_time = time.time()
            query_time = end_time - start_time
            
            # Verify query results
            assert len(user_files) >= 500
            
            # Performance assertion (should complete within 2 seconds)
            assert query_time < 2.0, f"Query took {query_time:.2f}s, expected < 2.0s"
            
            print(f"✅ Queried {len(user_files)} files in {query_time:.2f} seconds")
    
    def test_sequential_batch_operations(self, app):
        """Test sequential batch operations performance"""
        with app.app_context():
            user = User.query.filter_by(username='perfuser').first()

            start_time = time.time()

            # Simulate multiple batch operations
            for batch in range(5):
                files = []
                for i in range(10):
                    file = File(
                        filename=f'batch_{batch}_file_{i}.txt',
                        file_size=1024,
                        user_id=user.id
                    )
                    files.append(file)

                db.session.add_all(files)
                db.session.commit()

            end_time = time.time()
            total_time = end_time - start_time

            # Verify all files were created
            batch_files = File.query.filter(File.filename.like('batch_%')).all()
            assert len(batch_files) == 50  # 5 batches * 10 files each

            # Performance assertion
            assert total_time < 5.0, f"Batch operations took {total_time:.2f}s, expected < 5.0s"

            print(f"✅ Sequential batch operations completed in {total_time:.2f} seconds")

# ================================================================
# INTEGRATION TESTS
# ================================================================

class TestEndToEndIntegration:
    """Test end-to-end integration scenarios"""
    
    def test_complete_file_lifecycle(self, app):
        """Test complete file lifecycle from creation to deletion"""
        with app.app_context():
            user = User.query.filter_by(username='perfuser').first()
            
            # 1. Create folder
            folder = Folder(
                name='Integration Test Folder',
                user_id=user.id,
                path='Integration Test Folder'
            )
            db.session.add(folder)
            db.session.commit()
            
            # 2. Create file
            file = File(
                filename='integration_test.pdf',
                original_filename='integration_test.pdf',
                file_size=2048,
                mime_type='application/pdf',
                folder_id=folder.id,
                user_id=user.id,
                description='Integration test file'
            )
            db.session.add(file)
            db.session.commit()
            
            # 3. Add tags and metadata
            file.set_tags(['integration', 'test', 'important'])
            file.set_metadata({
                'author': 'Test User',
                'version': '1.0',
                'test_type': 'integration'
            })
            db.session.commit()
            
            # 4. Verify file exists and has correct data
            saved_file = File.query.get(file.id)
            assert saved_file is not None
            assert saved_file.filename == 'integration_test.pdf'
            assert saved_file.folder_id == folder.id
            assert 'integration' in saved_file.get_tags()
            assert saved_file.get_metadata()['author'] == 'Test User'
            
            # 5. Move file to different folder
            new_folder = Folder(
                name='New Integration Folder',
                user_id=user.id,
                path='New Integration Folder'
            )
            db.session.add(new_folder)
            db.session.commit()
            
            saved_file.folder_id = new_folder.id
            db.session.commit()
            
            # 6. Verify move
            moved_file = File.query.get(file.id)
            assert moved_file.folder_id == new_folder.id
            
            # 7. Mark as favorite
            moved_file.is_favorite = True
            db.session.commit()
            
            # 8. Soft delete
            moved_file.is_deleted = True
            db.session.commit()
            
            # 9. Verify soft delete
            deleted_file = File.query.get(file.id)
            assert deleted_file.is_deleted is True
            
            # 10. Verify not in active files
            active_files = File.query.filter_by(is_deleted=False, user_id=user.id).all()
            assert file not in active_files
            
            print("✅ Complete file lifecycle test passed")
    
    def test_telegram_scanner_integration(self):
        """Test Telegram scanner integration"""
        scanner = TelegramFileScanner()
        
        # Test scanner initialization
        assert scanner is not None
        assert scanner.files_data == []
        
        # Test file info extraction with mock message
        mock_message = MagicMock()
        mock_message.id = 12345
        mock_message.date = time.time()
        mock_message.text = "Test message"
        mock_message.sender = MagicMock()
        mock_message.sender.id = 67890
        mock_message.media = None  # No media
        
        # Should return None for message without media
        file_info = scanner.extract_file_info(mock_message)
        assert file_info is None
        
        print("✅ Telegram scanner integration test passed")
    
    def test_configuration_integration(self):
        """Test configuration system integration"""
        import config_manager
        
        # Test default config creation
        manager = config_manager.ConfigManager('nonexistent_test_config.json')
        config = manager.config
        
        assert config is not None
        assert 'telegram' in config
        assert 'output' in config
        assert 'scanning' in config
        
        # Test config validation
        validator = config_manager.ConfigValidator()
        assert validator is not None
        
        print("✅ Configuration integration test passed")

# ================================================================
# STRESS TESTS
# ================================================================

class TestStressScenarios:
    """Test system under stress conditions"""
    
    def test_memory_usage_with_large_dataset(self, app):
        """Test memory usage with large dataset"""
        with app.app_context():
            user = User.query.filter_by(username='perfuser').first()
            user_id = user.id  # Store ID to avoid session issues

            # Create a large number of files to test memory usage
            batch_size = 50
            total_files = 500  # Reduced for stability

            start_time = time.time()

            for batch in range(total_files // batch_size):
                files = []
                for i in range(batch_size):
                    file_id = batch * batch_size + i
                    file = File(
                        filename=f'stress_file_{file_id}.txt',
                        file_size=1024,
                        user_id=user_id,
                        description=f'Stress test file {file_id}'
                    )
                    files.append(file)

                db.session.add_all(files)
                db.session.commit()

                # Clear session to manage memory
                db.session.expunge_all()

            end_time = time.time()
            creation_time = end_time - start_time

            # Verify total count
            total_count = File.query.filter_by(user_id=user_id).count()
            assert total_count >= total_files

            # Performance assertion
            assert creation_time < 30.0, f"Stress test took {creation_time:.2f}s, expected < 30.0s"

            print(f"✅ Created {total_files} files in {creation_time:.2f} seconds")
    
    def test_rapid_sequential_operations(self, app):
        """Test rapid sequential operations"""
        with app.app_context():
            user = User.query.filter_by(username='perfuser').first()
            user_id = user.id

            start_time = time.time()

            # Perform rapid sequential operations
            for i in range(50):
                # Create file
                file = File(
                    filename=f'rapid_seq_{i}.txt',
                    user_id=user_id,
                    file_size=512
                )
                db.session.add(file)
                db.session.commit()

                # Update file
                file.description = f'Updated description {i}'
                db.session.commit()

                # Query files (every 10th iteration to avoid overhead)
                if i % 10 == 0:
                    File.query.filter_by(user_id=user_id).count()

            end_time = time.time()
            total_time = end_time - start_time

            # Verify operations completed
            file_count = File.query.filter(File.filename.like('rapid_seq_%')).count()
            assert file_count == 50

            # Performance assertion
            assert total_time < 15.0, f"Rapid operations took {total_time:.2f}s, expected < 15.0s"

            print(f"✅ Rapid sequential operations completed in {total_time:.2f} seconds")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
