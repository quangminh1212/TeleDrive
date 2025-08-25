import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure import paths
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'app'))

from app import app as app_module  # app/app.py exposes 'app'
app = getattr(app_module, 'app', app_module)

from db import db, User, File, ShareLink


def ensure_dirs():
    data_dir = ROOT / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    (ROOT / 'output').mkdir(parents=True, exist_ok=True)
    (ROOT / 'logs').mkdir(parents=True, exist_ok=True)


def init_db():
    with app.app_context():
        db.create_all()


def seed_share(token: str, filename: str = 'demo.txt', content: bytes = b'Hello TeleDrive!'):
    with app.app_context():
        # Ensure admin user
        user = User.query.filter_by(username='admin').first()
        if not user:
            user = User(username='admin', email='admin@teledrive.local', role='admin', is_active=True)
            db.session.add(user)
            db.session.commit()
        # Ensure file record + create simple local file in output
        f = File.query.filter_by(filename=filename).first()
        if not f:
            file_path = ROOT / 'output' / filename
            file_path.write_bytes(content)
            f = File(filename=filename, file_size=len(content), mime_type='text/plain', user_id=user.id)
            db.session.add(f)
            db.session.commit()
        # Create or update share link
        share = ShareLink.query.filter_by(token=token).first()
        if not share:
            share = ShareLink(token=token, file_id=f.id, user_id=user.id,
                               can_view=True, can_download=True, can_preview=True,
                               name='Seeded Share', description='Seeded for local E2E test',
                               expires_at=datetime.now(timezone.utc) + timedelta(days=7))
            db.session.add(share)
        else:
            share.file_id = f.id
            share.user_id = user.id
            share.is_active = True
            share.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        db.session.commit()
        print(f"Seeded share token: {token} -> file: {filename}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python tests/seed_share.py <token> [filename]')
        sys.exit(1)
    token = sys.argv[1]
    filename = sys.argv[2] if len(sys.argv) > 2 else 'demo.txt'
    ensure_dirs()
    init_db()
    seed_share(token, filename)

