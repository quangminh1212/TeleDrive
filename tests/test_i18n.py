import sys
from datetime import datetime

# Import app and i18n
try:
    from pathlib import Path
    ROOT = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(ROOT))
    sys.path.insert(0, str(ROOT / 'app'))
    from app import app as app_module
    app = getattr(app_module, 'app', app_module)
    from i18n import t as i18n_t
except Exception as e:
    print(f"Failed to import app/i18n: {e}")
    sys.exit(2)


failures = 0

def check(name, cond):
    global failures
    if cond:
        print(f"[PASS] {name}")
    else:
        failures += 1
        print(f"[FAIL] {name}")

# t() basic keys
check('t share.view.download vi', i18n_t('share.view.download', lang='vi') == 'Tải xuống')
check('t share.view.download en', i18n_t('share.view.download', lang='en') == 'Download')

# t() fallback behavior: unknown key returns key
unknown_key = '___not_exists_key__'
check('t fallback to key', i18n_t(unknown_key, lang='vi') == unknown_key)

# t() formatting with extra kwargs (no placeholders -> returns unchanged)
check('t formatting extra kwargs ignored', i18n_t('share.view.type', lang='en', foo='bar') == 'Type')

# format_dt filter via Jinja
with app.app_context():
    fmt = app.jinja_env.filters.get('format_dt')
    if not fmt:
        print('[FAIL] format_dt filter not registered')
        failures += 1
    else:
        # Use a fixed datetime for predictable output
        dt = datetime(2024, 12, 31, 23, 45, 0)
        # VI format default: %d/%m/%Y %H:%M:%S
        from flask import session
        with app.test_request_context('/'):
            session['lang'] = 'vi'
            vi_out = fmt(dt)
            print('VI format_dt:', vi_out)
            check('format_dt vi contains dd/mm/yyyy', vi_out.startswith('31/12/2024'))
        # EN format default: %Y-%m-%d %I:%M %p
        with app.test_request_context('/'):
            session['lang'] = 'en'
            en_out = fmt(dt)
            print('EN format_dt:', en_out)
            check('format_dt en contains yyyy-mm-dd', en_out.startswith('2024-12-31'))

if failures:
    print(f"Done with {failures} failure(s)")
    sys.exit(1)
else:
    print("All i18n tests passed")
    sys.exit(0)

