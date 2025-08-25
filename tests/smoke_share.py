import sys
from contextlib import contextmanager

# Allow running from repo root
try:
    from pathlib import Path
    ROOT = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(ROOT))
    sys.path.insert(0, str(ROOT / 'app'))
    import werkzeug
    if not hasattr(werkzeug, '__version__'):
        # Monkey-patch for Flask<->Werkzeug compat in some environments
        werkzeug.__version__ = '3.0.0'
    from app import app as app_module  # when app/app.py exposes 'app' on module level
    app = getattr(app_module, 'app', app_module)
except Exception as e:
    print(f"Failed to import Flask app: {e}")
    sys.exit(2)

TOKEN = None
if len(sys.argv) > 1:
    TOKEN = sys.argv[1]
else:
    print("Usage: python tests/smoke_share.py <share_token>")
    sys.exit(1)

@contextmanager
def client_with_lang(lang: str):
    with app.test_client() as c:
        # Set language via route to ensure session is set properly
        c.get(f"/set_lang/{lang}")
        yield c

def check_path(c, path: str):
    try:
        r = c.get(path)
        print(f"GET {path} -> {r.status_code}, {len(r.data)} bytes")
        # Print first line of body to see which template likely rendered
        text = r.data.decode(errors='ignore')
        first_line = text.splitlines()[0] if text else ''
        print(f"  First line: {first_line[:120]}")
        return r.status_code
    except Exception as e:
        print(f"Error requesting {path}: {e}")
        return 0

if __name__ == "__main__":
    paths = [f"/share/{TOKEN}", f"/share/{TOKEN}/password"]

    print("==== VI language ====")
    with client_with_lang('vi') as c:
        for p in paths:
            check_path(c, p)

    print("\n==== EN language ====")
    with client_with_lang('en') as c:
        for p in paths:
            check_path(c, p)

    print("Done.")

