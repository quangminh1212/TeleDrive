"""
Tests for the application factory
"""

import pytest
from flask import Flask

from src.teledrive.factory import create_app


def test_create_app():
    """Test that create_app returns a Flask application."""
    app = create_app()
    assert isinstance(app, Flask)
    assert app.name == 'src.teledrive.factory'


def test_config():
    """Test the application configuration."""
    app = create_app({'TESTING': True})
    assert app.config['TESTING']
    assert not app.config['DEBUG']


def test_dev_config():
    """Test the development configuration."""
    app = create_app({'TESTING': True, 'DEBUG': True, 'ENV': 'development'})
    assert app.config['TESTING']
    assert app.config['DEBUG']
    assert app.config['ENV'] == 'development'


def test_request_context(app):
    """Test the application request context."""
    with app.test_request_context('/'):
        assert app.config['TESTING'] 