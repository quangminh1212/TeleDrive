import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'app'))

from app import app as app_module
app = getattr(app_module, 'app', app_module)

from db import db

# Force a known-good SQLite path for local testing if needed
DB_DIR = ROOT / 'data'
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_FILE = DB_DIR / 'teledrive.db'
os.environ['DATABASE_URL'] = f'sqlite:///{DB_FILE}'

print(f"Using DB: {os.environ['DATABASE_URL']}")

with app.app_context():
    db.create_all()
    print("DB initialized.")

