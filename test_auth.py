#!/usr/bin/env python3
"""
Authentication and Security Tests for TeleDrive
Tests user authentication, permissions, and security measures
"""

import pytest
from flask import url_for
from flask_login import current_user
from models import db, User
from forms import LoginForm, RegistrationForm, ChangePasswordForm

# ================================================================
# FIXTURES AND SETUP
# ================================================================

@pytest.fixture
def app():
    """Create a minimal Flask app for testing"""
    from app import app as flask_app
    
    # Override configuration for testing
    flask_app.config['TESTING'] = True
    flask_app.config['WTF_CSRF_ENABLED'] = False
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['SECRET_KEY'] = 'test_secret_key'
    
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.drop_all()

@pytest.fixture
def client(app):
    """Create a test client"""
    return app.test_client()

@pytest.fixture
def test_user(app):
    """Create a test user"""
    with app.app_context():
        user = User(
            username='testuser',
            email='test@example.com',
            role='user',
            is_active=True
        )
        user.set_password('testpassword123')
        db.session.add(user)
        db.session.commit()
        return user

@pytest.fixture
def admin_user(app):
    """Create an admin user"""
    with app.app_context():
        admin = User(
            username='admin',
            email='admin@example.com',
            role='admin',
            is_active=True
        )
        admin.set_password('adminpassword123')
        db.session.add(admin)
        db.session.commit()
        return admin

# ================================================================
# AUTHENTICATION TESTS
# ================================================================

class TestAuthentication:
    """Test user authentication functionality"""
    
    def test_login_page_loads(self, client):
        """Test that login page loads correctly"""
        response = client.get('/login')
        assert response.status_code == 200
        assert b'Sign in' in response.data
        assert b'Username' in response.data
        assert b'Password' in response.data
    
    def test_register_page_loads(self, client):
        """Test that registration page loads correctly"""
        response = client.get('/register')
        assert response.status_code == 200
        assert b'Register' in response.data
        assert b'Username' in response.data
        assert b'Email' in response.data
    
    def test_successful_login(self, client, test_user):
        """Test successful user login"""
        response = client.post('/login', data={
            'username': 'testuser',
            'password': 'testpassword123'
        }, follow_redirects=True)
        
        assert response.status_code == 200
        # Should redirect to dashboard after successful login
        assert b'Dashboard' in response.data or b'TeleDrive' in response.data
    
    def test_invalid_username_login(self, client):
        """Test login with invalid username"""
        response = client.post('/login', data={
            'username': 'nonexistent',
            'password': 'password123'
        })
        
        assert response.status_code == 200
        assert b'Invalid username or password' in response.data
    
    def test_invalid_password_login(self, client, test_user):
        """Test login with invalid password"""
        response = client.post('/login', data={
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 200
        assert b'Invalid username or password' in response.data
    
    def test_empty_credentials_login(self, client):
        """Test login with empty credentials"""
        response = client.post('/login', data={
            'username': '',
            'password': ''
        })
        
        assert response.status_code == 200
        # Should show validation errors
        assert b'Username is required' in response.data or b'required' in response.data
    
    def test_successful_registration(self, client):
        """Test successful user registration"""
        response = client.post('/register', data={
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpassword123',
            'password2': 'newpassword123'
        }, follow_redirects=True)
        
        assert response.status_code == 200
        assert b'Registration successful' in response.data
        
        # Verify user was created in database
        with client.application.app_context():
            user = User.query.filter_by(username='newuser').first()
            assert user is not None
            assert user.email == 'newuser@example.com'
    
    def test_duplicate_username_registration(self, client, test_user):
        """Test registration with duplicate username"""
        response = client.post('/register', data={
            'username': 'testuser',  # Already exists
            'email': 'different@example.com',
            'password': 'password123',
            'password2': 'password123'
        })
        
        assert response.status_code == 200
        assert b'Username already exists' in response.data
    
    def test_duplicate_email_registration(self, client, test_user):
        """Test registration with duplicate email"""
        response = client.post('/register', data={
            'username': 'differentuser',
            'email': 'test@example.com',  # Already exists
            'password': 'password123',
            'password2': 'password123'
        })
        
        assert response.status_code == 200
        assert b'Email already registered' in response.data
    
    def test_password_mismatch_registration(self, client):
        """Test registration with password mismatch"""
        response = client.post('/register', data={
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'password123',
            'password2': 'differentpassword'
        })
        
        assert response.status_code == 200
        assert b'Passwords must match' in response.data
    
    def test_logout(self, client, test_user):
        """Test user logout"""
        # First login
        client.post('/login', data={
            'username': 'testuser',
            'password': 'testpassword123'
        })
        
        # Then logout
        response = client.get('/logout', follow_redirects=True)
        assert response.status_code == 200
        assert b'logged out' in response.data
        
        # Should redirect to login page
        assert b'Sign in' in response.data

# ================================================================
# AUTHORIZATION TESTS
# ================================================================

class TestAuthorization:
    """Test user authorization and access control"""
    
    def test_dashboard_requires_login(self, client):
        """Test that dashboard requires authentication"""
        response = client.get('/')
        assert response.status_code == 302  # Redirect to login
        
        # Follow redirect
        response = client.get('/', follow_redirects=True)
        assert b'Sign in' in response.data
    
    def test_settings_requires_login(self, client):
        """Test that settings page requires authentication"""
        response = client.get('/settings')
        assert response.status_code == 302  # Redirect to login
    
    def test_scan_requires_login(self, client):
        """Test that scan page requires authentication"""
        response = client.get('/scan')
        assert response.status_code == 302  # Redirect to login
    
    def test_profile_requires_login(self, client):
        """Test that profile page requires authentication"""
        response = client.get('/profile')
        assert response.status_code == 302  # Redirect to login
    
    def test_authenticated_user_access(self, client, test_user):
        """Test that authenticated users can access protected pages"""
        # Login first
        client.post('/login', data={
            'username': 'testuser',
            'password': 'testpassword123'
        })
        
        # Test access to protected pages
        protected_pages = ['/', '/settings', '/scan', '/profile']
        for page in protected_pages:
            response = client.get(page)
            assert response.status_code == 200, f"Failed to access {page}"

# ================================================================
# PASSWORD SECURITY TESTS
# ================================================================

class TestPasswordSecurity:
    """Test password security measures"""
    
    def test_password_hashing(self, app):
        """Test that passwords are properly hashed"""
        with app.app_context():
            user = User(username='testuser', email='test@example.com')
            password = 'testpassword123'
            
            user.set_password(password)
            
            # Password should be hashed, not stored in plain text
            assert user.password_hash != password
            assert user.password_hash is not None
            assert len(user.password_hash) > 0
    
    def test_password_verification(self, app):
        """Test password verification"""
        with app.app_context():
            user = User(username='testuser', email='test@example.com')
            password = 'testpassword123'
            
            user.set_password(password)
            
            # Correct password should verify
            assert user.check_password(password) is True
            
            # Wrong password should not verify
            assert user.check_password('wrongpassword') is False
            assert user.check_password('') is False
    
    def test_change_password(self, client, test_user):
        """Test password change functionality"""
        # Login first
        client.post('/login', data={
            'username': 'testuser',
            'password': 'testpassword123'
        })
        
        # Change password
        response = client.post('/change_password', data={
            'current_password': 'testpassword123',
            'new_password': 'newpassword456',
            'new_password2': 'newpassword456'
        }, follow_redirects=True)
        
        assert response.status_code == 200
        assert b'Password changed successfully' in response.data
        
        # Verify old password no longer works
        client.get('/logout')
        response = client.post('/login', data={
            'username': 'testuser',
            'password': 'testpassword123'
        })
        assert b'Invalid username or password' in response.data
        
        # Verify new password works
        response = client.post('/login', data={
            'username': 'testuser',
            'password': 'newpassword456'
        }, follow_redirects=True)
        assert response.status_code == 200
    
    def test_change_password_wrong_current(self, client, test_user):
        """Test password change with wrong current password"""
        # Login first
        client.post('/login', data={
            'username': 'testuser',
            'password': 'testpassword123'
        })
        
        # Try to change password with wrong current password
        response = client.post('/change_password', data={
            'current_password': 'wrongpassword',
            'new_password': 'newpassword456',
            'new_password2': 'newpassword456'
        })
        
        assert response.status_code == 200
        assert b'Current password is incorrect' in response.data

# ================================================================
# FORM VALIDATION TESTS
# ================================================================

class TestFormValidation:
    """Test form validation for authentication forms"""
    
    def test_login_form_validation(self, app):
        """Test login form validation"""
        with app.app_context():
            # Valid form
            form = LoginForm(data={
                'username': 'testuser',
                'password': 'password123'
            })
            assert form.validate() is True
            
            # Invalid form - missing username
            form = LoginForm(data={
                'username': '',
                'password': 'password123'
            })
            assert form.validate() is False
            assert 'Username is required' in str(form.username.errors)
    
    def test_registration_form_validation(self, app):
        """Test registration form validation"""
        with app.app_context():
            # Valid form
            form = RegistrationForm(data={
                'username': 'newuser',
                'email': 'new@example.com',
                'password': 'password123',
                'password2': 'password123'
            })
            assert form.validate() is True
            
            # Invalid email
            form = RegistrationForm(data={
                'username': 'newuser',
                'email': 'invalid-email',
                'password': 'password123',
                'password2': 'password123'
            })
            assert form.validate() is False
            assert 'valid email' in str(form.email.errors).lower()
    
    def test_password_strength_validation(self, app):
        """Test password strength validation"""
        with app.app_context():
            # Too short password
            form = RegistrationForm(data={
                'username': 'newuser',
                'email': 'new@example.com',
                'password': '123',  # Too short
                'password2': '123'
            })
            assert form.validate() is False
            assert 'at least 6 characters' in str(form.password.errors)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
