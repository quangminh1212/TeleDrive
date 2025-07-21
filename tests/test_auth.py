"""
Test cases for authentication system.
"""

import pytest
from unittest.mock import Mock, patch

from app.auth import auth_manager
from app.models import validate_phone_number


class TestAuthManager:
    """Test cases for AuthManager."""
    
    def test_create_user(self, app):
        """Test user creation."""
        with app.app_context():
            success, message = auth_manager.create_user(
                username='testuser',
                phone_number='+1234567890',
                email='test@example.com',
                is_admin=False
            )
            
            assert success is True
            assert 'successfully' in message.lower()
    
    def test_create_duplicate_user(self, app):
        """Test creating duplicate user fails."""
        with app.app_context():
            # Create first user
            success1, _ = auth_manager.create_user(
                username='testuser',
                phone_number='+1234567890',
                email='test@example.com',
                is_admin=False
            )
            assert success1 is True
            
            # Try to create duplicate
            success2, message2 = auth_manager.create_user(
                username='testuser2',
                phone_number='+1234567890',  # Same phone
                email='test2@example.com',
                is_admin=False
            )
            assert success2 is False
            assert 'already exists' in message2.lower()
    
    def test_find_user_by_phone(self, app):
        """Test finding user by phone number."""
        with app.app_context():
            # Create user
            auth_manager.create_user(
                username='testuser',
                phone_number='+1234567890',
                email='test@example.com',
                is_admin=False
            )
            
            # Find user
            user = auth_manager.find_user_by_phone('+1234567890')
            assert user is not None
            assert user.username == 'testuser'
            assert user.phone_number == '+1234567890'
    
    def test_find_nonexistent_user(self, app):
        """Test finding nonexistent user returns None."""
        with app.app_context():
            user = auth_manager.find_user_by_phone('+9999999999')
            assert user is None
    
    def test_has_admin_user(self, app):
        """Test checking for admin user."""
        with app.app_context():
            # Initially no admin
            assert auth_manager.has_admin_user() is False
            
            # Create admin user
            auth_manager.create_user(
                username='admin',
                phone_number='+1234567891',
                email='admin@example.com',
                is_admin=True
            )
            
            # Now should have admin
            assert auth_manager.has_admin_user() is True
    
    def test_get_all_users(self, app):
        """Test getting all users."""
        with app.app_context():
            # Create multiple users
            auth_manager.create_user(
                username='user1',
                phone_number='+1234567890',
                email='user1@example.com',
                is_admin=False
            )
            auth_manager.create_user(
                username='user2',
                phone_number='+1234567891',
                email='user2@example.com',
                is_admin=True
            )
            
            users = auth_manager.get_all_users()
            assert len(users) == 2
            
            usernames = [user.username for user in users]
            assert 'user1' in usernames
            assert 'user2' in usernames


class TestPhoneValidation:
    """Test cases for phone number validation."""
    
    def test_valid_phone_numbers(self):
        """Test valid phone number formats."""
        valid_phones = [
            '+1234567890',
            '+84987654321',
            '+441234567890',
            '+33123456789',
            '+86123456789'
        ]
        
        for phone in valid_phones:
            assert validate_phone_number(phone) is True, f"Phone {phone} should be valid"
    
    def test_invalid_phone_numbers(self):
        """Test invalid phone number formats."""
        invalid_phones = [
            '1234567890',      # Missing +
            '+123',            # Too short
            '+123456789012345', # Too long
            '+abc1234567890',  # Contains letters
            '+12-345-67890',   # Contains dashes
            '+12 345 67890',   # Contains spaces
            '',                # Empty
            None,              # None
            '+',               # Just plus
        ]
        
        for phone in invalid_phones:
            assert validate_phone_number(phone) is False, f"Phone {phone} should be invalid"


class TestOTPSystem:
    """Test cases for OTP system."""
    
    @patch('teledrive.services.send_otp_sync')
    def test_otp_generation(self, mock_send_otp, app):
        """Test OTP generation and sending."""
        mock_send_otp.return_value = True
        
        with app.app_context():
            from app.models import OTPManager
            
            otp_manager = OTPManager()
            
            # Generate OTP
            otp = otp_manager.generate_otp('+1234567890')
            assert otp is not None
            assert len(otp) == 6
            assert otp.isdigit()
    
    def test_otp_verification(self, app):
        """Test OTP verification."""
        with app.app_context():
            from app.models import OTPManager
            
            otp_manager = OTPManager()
            phone = '+1234567890'
            
            # Generate OTP
            otp = otp_manager.generate_otp(phone)
            
            # Verify correct OTP
            assert otp_manager.verify_otp(phone, otp) is True
            
            # Verify incorrect OTP
            assert otp_manager.verify_otp(phone, '000000') is False
    
    def test_otp_expiration(self, app):
        """Test OTP expiration."""
        with app.app_context():
            from app.models import OTPManager
            import time
            
            otp_manager = OTPManager()
            phone = '+1234567890'
            
            # Generate OTP with short expiration
            otp = otp_manager.generate_otp(phone, expiration_minutes=0.01)  # 0.6 seconds
            
            # Should work immediately
            assert otp_manager.verify_otp(phone, otp) is True
            
            # Wait for expiration
            time.sleep(1)
            
            # Should not work after expiration
            assert otp_manager.verify_otp(phone, otp) is False


class TestAuthenticationAPI:
    """Test cases for authentication API endpoints."""
    
    @patch('teledrive.services.send_otp_sync')
    def test_send_otp_endpoint(self, mock_send_otp, client):
        """Test send OTP API endpoint."""
        mock_send_otp.return_value = True
        
        response = client.post('/api/auth/send-otp', json={
            'phone_number': '+1234567890'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
    
    @patch('teledrive.services.send_otp_sync')
    def test_send_otp_invalid_phone(self, mock_send_otp, client):
        """Test send OTP with invalid phone number."""
        response = client.post('/api/auth/send-otp', json={
            'phone_number': 'invalid'
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
    
    def test_login_endpoint(self, client, app):
        """Test login API endpoint."""
        with app.app_context():
            # Create test user
            auth_manager.create_user(
                username='testuser',
                phone_number='+1234567890',
                email='test@example.com',
                is_admin=False
            )
            
            # Mock OTP verification
            with patch('teledrive.models.OTPManager.verify_otp') as mock_verify:
                mock_verify.return_value = True
                
                response = client.post('/api/auth/login', json={
                    'phone_number': '+1234567890',
                    'otp': '123456'
                })
                
                assert response.status_code == 200
                data = response.get_json()
                assert data['success'] is True
                assert 'user' in data
    
    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        response = client.post('/api/auth/login', json={
            'phone_number': '+9999999999',
            'otp': '123456'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert data['success'] is False
    
    def test_logout_endpoint(self, client, auth_headers):
        """Test logout API endpoint."""
        response = client.post('/api/auth/logout', headers=auth_headers)
        
        # Should succeed regardless of implementation
        assert response.status_code in [200, 302]


class TestUserManagement:
    """Test cases for user management."""
    
    def test_user_creation_validation(self, app):
        """Test user creation with validation."""
        with app.app_context():
            # Test missing username
            success, message = auth_manager.create_user(
                username='',
                phone_number='+1234567890',
                email='test@example.com',
                is_admin=False
            )
            assert success is False
            
            # Test invalid phone
            success, message = auth_manager.create_user(
                username='testuser',
                phone_number='invalid',
                email='test@example.com',
                is_admin=False
            )
            assert success is False
    
    def test_user_permissions(self, app):
        """Test user permission system."""
        with app.app_context():
            # Create regular user
            auth_manager.create_user(
                username='user',
                phone_number='+1234567890',
                email='user@example.com',
                is_admin=False
            )
            
            # Create admin user
            auth_manager.create_user(
                username='admin',
                phone_number='+1234567891',
                email='admin@example.com',
                is_admin=True
            )
            
            user = auth_manager.find_user_by_phone('+1234567890')
            admin = auth_manager.find_user_by_phone('+1234567891')
            
            assert user.is_admin is False
            assert admin.is_admin is True
