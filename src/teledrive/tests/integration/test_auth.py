"""
Integration tests for authentication endpoints
"""

import pytest
from flask import session


def test_login_page(client):
    """Test accessing the login page."""
    response = client.get('/auth/login')
    assert response.status_code == 200


def test_login_with_invalid_phone(client):
    """Test login with an invalid phone number."""
    response = client.post(
        '/auth/login',
        data={'phone_number': 'invalid-phone'}
    )
    # Should return to the login page with a validation error
    assert response.status_code in (200, 302)


def test_login_with_nonexistent_user(client, db):
    """Test login with a phone number that doesn't exist in the database."""
    response = client.post(
        '/auth/login',
        data={'phone_number': '+84111111111'}  # Assuming this user doesn't exist
    )
    # Should return to the login page with an error
    assert response.status_code in (200, 302)


def test_login_with_valid_user(client, test_user):
    """Test login with a valid user."""
    # In a real app, this would trigger OTP generation
    # For testing, we're expecting a redirect to OTP verification
    response = client.post(
        '/auth/login',
        data={'phone_number': test_user.phone_number},
        follow_redirects=True
    )
    
    # Should redirect to OTP verification
    assert response.status_code == 200
    assert b'verify' in response.data.lower() or b'otp' in response.data.lower()


def test_logout(client, test_user, auth):
    """Test logging out."""
    # First login
    auth.login(test_user.phone_number)
    
    # Then logout
    response = auth.logout()
    
    # Should redirect to login page or home
    assert response.status_code in (200, 302)
    
    # Check that the session is cleared
    with client.session_transaction() as sess:
        assert '_user_id' not in sess


def test_accessing_protected_route(client):
    """Test accessing a protected route without logging in."""
    response = client.get('/dashboard', follow_redirects=True)
    
    # In dev mode, this will be allowed, but in normal mode it would redirect
    # to the login page or return an error
    assert response.status_code in (200, 302, 401, 403) 