import pytest
from app import app as flask_app
import config
import os

@pytest.fixture
def client():
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as client:
        yield client

def test_homepage(client):
    resp = client.get('/')
    assert resp.status_code == 200
    assert b'Telegram' in resp.data or b'TeleDrive' in resp.data

def test_settings_page(client):
    resp = client.get('/settings')
    assert resp.status_code == 200
    assert b'Settings' in resp.data or b'Cau hinh' in resp.data

def test_scan_page(client):
    resp = client.get('/scan')
    assert resp.status_code == 200
    assert b'Scan' in resp.data or b'Quet' in resp.data

def test_config_loaded():
    assert hasattr(config, 'ConfigManager') or os.path.exists('config.json')

# Thêm test cho models nếu cần
import models

def test_user_model_fields():
    user = models.User()
    assert hasattr(user, 'id')
    assert hasattr(user, 'username')
    assert hasattr(user, 'password_hash')

# Thêm test cho database nếu cần
import database

def test_database_connection():
    db = database.get_db()
    assert db is not None

# Có thể mở rộng thêm test cho API, logic, error, security... 