import requests, time, os

BASE = 'http://127.0.0.1:3000'
s = requests.Session()
assert s.get(f'{BASE}/dev/auto-login', allow_redirects=True).status_code in (200,302)

# create a dummy report file in output
o = os.path.join('output', f'unit_report_{int(time.time())}.json')
open(o,'w', encoding='utf-8').write('{"ok":true}')
fn = os.path.basename(o)

# attempt delete via API (legacy path)
csrf = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
r = s.post(f'{BASE}/api/delete_file', json={'filename': fn}, headers={'X-CSRFToken': csrf})
print('[delete output]', r.status_code, r.json())
assert r.status_code == 200 and r.json().get('success')

# ensure removed locally
assert not os.path.exists(o)

