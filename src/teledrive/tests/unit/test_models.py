"""
Tests for the application models
"""

import pytest
from datetime import datetime

from src.teledrive.models import User


def test_user_creation(db):
    """Test user creation."""
    user = User(
        username="testuser2",
        phone_number="+84999999999",
        email="test2@example.com"
    )
    db.session.add(user)
    db.session.commit()
    
    retrieved_user = User.query.filter_by(username="testuser2").first()
    
    assert retrieved_user is not None
    assert retrieved_user.username == "testuser2"
    assert retrieved_user.phone_number == "+84999999999"
    assert retrieved_user.email == "test2@example.com"
    assert retrieved_user.is_active is True
    assert retrieved_user.is_admin is False
    assert retrieved_user.is_verified is True


def test_user_password(db):
    """Test user password hashing and checking."""
    user = User(
        username="passuser",
        phone_number="+84888888888",
        email="pass@example.com"
    )
    
    # Set password and check it was hashed
    user.set_password("securepassword")
    assert user.password_hash is not None
    assert user.password_hash != "securepassword"
    
    # Verify password checking works
    assert user.check_password("securepassword") is True
    assert user.check_password("wrongpassword") is False
    
    db.session.add(user)
    db.session.commit()


def test_user_to_dict(test_user):
    """Test user to_dict method."""
    user_dict = test_user.to_dict()
    
    assert isinstance(user_dict, dict)
    assert user_dict['id'] == test_user.id
    assert user_dict['username'] == test_user.username
    assert user_dict['phone_number'] == test_user.phone_number
    assert user_dict['email'] == test_user.email
    assert user_dict['is_active'] == test_user.is_active
    assert user_dict['is_admin'] == test_user.is_admin


def test_user_update_last_login(test_user, db):
    """Test updating last login time."""
    assert test_user.last_login is None
    
    test_user.update_last_login()
    db.session.refresh(test_user)
    
    assert test_user.last_login is not None
    assert isinstance(test_user.last_login, datetime) 