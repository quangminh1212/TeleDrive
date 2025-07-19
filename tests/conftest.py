#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pytest Configuration
Cấu hình chung cho test suite
"""

import pytest
import os
import sys
from pathlib import Path

# Add src to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

@pytest.fixture(scope="session")
def app():
    """Create application for testing"""
    from web.app import app
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    return app

@pytest.fixture(scope="session")
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture(scope="session")
def runner(app):
    """Create test runner"""
    return app.test_cli_runner()
