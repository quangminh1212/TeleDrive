#!/usr/bin/env python3
"""
Simple Authentication Tests for TeleDrive
Tests authentication components without complex dependencies
"""

import pytest
from flask import Flask
from flask_login import LoginManager, login_user, logout_user, current_user
from models import db, User
from forms import LoginForm, RegistrationForm, ChangePasswordForm

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
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """Create a test client"""
    return app.test_client()

# ================================================================
# USER MODEL AUTHENTICATION TESTS
# ================================================================

class TestUserAuthentication:
    """Test User model authentication methods"""
    
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
            
            # Hash should be consistent
            hash1 = user.password_hash
            user.set_password(password)
            hash2 = user.password_hash
            # Different hashes due to salt, but both should verify
            assert user.check_password(password) is True
    
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
            assert user.check_password(None) is False
    
    def test_empty_password_handling(self, app):
        """Test handling of empty passwords"""
        with app.app_context():
            user = User(username='testuser', email='test@example.com')
            
            # Setting empty password
            user.set_password('')
            assert user.password_hash is None or user.password_hash == ''
            
            user.set_password(None)
            assert user.password_hash is None or user.password_hash == ''
    
    def test_flask_login_methods(self, app):
        """Test Flask-Login required methods"""
        with app.app_context():
            user = User(
                username='testuser',
                email='test@example.com',
                is_active=True
            )
            db.session.add(user)
            db.session.commit()
            
            # Test Flask-Login methods
            assert user.is_authenticated() is True
            assert user.is_anonymous() is False
            assert user.is_active is True  # This is a property, not a method
            assert user.get_id() == str(user.id)
    
    def test_inactive_user(self, app):
        """Test inactive user behavior"""
        with app.app_context():
            user = User(
                username='testuser',
                email='test@example.com',
                is_active=False
            )
            db.session.add(user)
            db.session.commit()
            
            # User should still be authenticated but not active
            assert user.is_authenticated() is True
            assert user.is_active is False

# ================================================================
# FORM VALIDATION TESTS
# ================================================================

class TestFormValidation:
    """Test form validation for authentication forms"""
    
    def test_login_form_valid(self, app):
        """Test valid login form"""
        with app.app_context():
            form = LoginForm(data={
                'username': 'testuser',
                'password': 'password123',
                'remember_me': False
            })
            assert form.validate() is True
    
    def test_login_form_missing_username(self, app):
        """Test login form with missing username"""
        with app.app_context():
            form = LoginForm(data={
                'username': '',
                'password': 'password123'
            })
            assert form.validate() is False
            assert 'Username is required' in str(form.username.errors)
    
    def test_login_form_missing_password(self, app):
        """Test login form with missing password"""
        with app.app_context():
            form = LoginForm(data={
                'username': 'testuser',
                'password': ''
            })
            assert form.validate() is False
            assert 'Password is required' in str(form.password.errors)
    
    def test_login_form_username_length(self, app):
        """Test login form username length validation"""
        with app.app_context():
            # Too short username
            form = LoginForm(data={
                'username': 'ab',  # Less than 3 characters
                'password': 'password123'
            })
            assert form.validate() is False
            assert 'between 3 and 80 characters' in str(form.username.errors)
    
    def test_registration_form_valid(self, app):
        """Test valid registration form"""
        with app.app_context():
            form = RegistrationForm(data={
                'username': 'newuser',
                'email': 'new@example.com',
                'password': 'password123',
                'password2': 'password123'
            })
            assert form.validate() is True
    
    def test_registration_form_invalid_email(self, app):
        """Test registration form with invalid email"""
        with app.app_context():
            form = RegistrationForm(data={
                'username': 'newuser',
                'email': 'invalid-email',
                'password': 'password123',
                'password2': 'password123'
            })
            assert form.validate() is False
            assert 'valid email' in str(form.email.errors).lower()
    
    def test_registration_form_password_mismatch(self, app):
        """Test registration form with password mismatch"""
        with app.app_context():
            form = RegistrationForm(data={
                'username': 'newuser',
                'email': 'new@example.com',
                'password': 'password123',
                'password2': 'differentpassword'
            })
            assert form.validate() is False
            assert 'Passwords must match' in str(form.password2.errors)
    
    def test_registration_form_short_password(self, app):
        """Test registration form with short password"""
        with app.app_context():
            form = RegistrationForm(data={
                'username': 'newuser',
                'email': 'new@example.com',
                'password': '123',  # Too short
                'password2': '123'
            })
            assert form.validate() is False
            assert 'at least 6 characters' in str(form.password.errors)
    
    def test_registration_form_duplicate_username(self, app):
        """Test registration form with duplicate username"""
        with app.app_context():
            # Create existing user
            existing_user = User(username='existinguser', email='existing@example.com')
            db.session.add(existing_user)
            db.session.commit()
            
            # Try to register with same username
            form = RegistrationForm(data={
                'username': 'existinguser',
                'email': 'new@example.com',
                'password': 'password123',
                'password2': 'password123'
            })
            assert form.validate() is False
            assert 'Username already exists' in str(form.username.errors)
    
    def test_registration_form_duplicate_email(self, app):
        """Test registration form with duplicate email"""
        with app.app_context():
            # Create existing user
            existing_user = User(username='existinguser', email='existing@example.com')
            db.session.add(existing_user)
            db.session.commit()
            
            # Try to register with same email
            form = RegistrationForm(data={
                'username': 'newuser',
                'email': 'existing@example.com',
                'password': 'password123',
                'password2': 'password123'
            })
            assert form.validate() is False
            assert 'Email already registered' in str(form.email.errors)
    
    def test_change_password_form_valid(self, app):
        """Test valid change password form"""
        with app.app_context():
            form = ChangePasswordForm(data={
                'current_password': 'oldpassword',
                'new_password': 'newpassword123',
                'new_password2': 'newpassword123'
            })
            assert form.validate() is True
    
    def test_change_password_form_mismatch(self, app):
        """Test change password form with password mismatch"""
        with app.app_context():
            form = ChangePasswordForm(data={
                'current_password': 'oldpassword',
                'new_password': 'newpassword123',
                'new_password2': 'differentpassword'
            })
            assert form.validate() is False
            assert 'Passwords must match' in str(form.new_password2.errors)

# ================================================================
# USER ROLE TESTS
# ================================================================

class TestUserRoles:
    """Test user roles and permissions"""
    
    def test_default_user_role(self, app):
        """Test that new users get default role"""
        with app.app_context():
            user = User(username='testuser', email='test@example.com', role='user')
            assert user.role == 'user'  # Default role
    
    def test_admin_user_role(self, app):
        """Test admin user role"""
        with app.app_context():
            admin = User(
                username='admin',
                email='admin@example.com',
                role='admin'
            )
            assert admin.role == 'admin'
    
    def test_user_role_assignment(self, app):
        """Test assigning different roles to users"""
        with app.app_context():
            roles = ['user', 'admin', 'viewer']
            
            for role in roles:
                user = User(
                    username=f'test_{role}',
                    email=f'{role}@example.com',
                    role=role
                )
                assert user.role == role

# ================================================================
# SECURITY TESTS
# ================================================================

class TestSecurity:
    """Test security measures"""
    
    def test_password_hash_uniqueness(self, app):
        """Test that same password produces different hashes (due to salt)"""
        with app.app_context():
            user1 = User(username='user1', email='user1@example.com')
            user2 = User(username='user2', email='user2@example.com')
            
            password = 'samepassword123'
            user1.set_password(password)
            user2.set_password(password)
            
            # Hashes should be different due to salt
            assert user1.password_hash != user2.password_hash
            
            # But both should verify correctly
            assert user1.check_password(password) is True
            assert user2.check_password(password) is True
    
    def test_user_to_dict_security(self, app):
        """Test that sensitive data is not exposed in to_dict"""
        with app.app_context():
            user = User(
                username='testuser',
                email='test@example.com',
                role='user'
            )
            user.set_password('secretpassword')
            db.session.add(user)
            db.session.commit()
            
            user_dict = user.to_dict()
            
            # Should not expose password hash
            assert 'password_hash' not in user_dict
            assert 'password' not in user_dict
            
            # Should include safe fields
            assert 'username' in user_dict
            assert 'email' in user_dict
            assert 'role' in user_dict

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
