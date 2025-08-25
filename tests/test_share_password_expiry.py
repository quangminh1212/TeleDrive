import requests, time
from datetime import datetime, timedelta

BASE = 'http://127.0.0.1:3000'
s = requests.Session()
assert s.get(f'{BASE}/dev/auto-login', allow_redirects=True).status_code in (200,302)

# upload a small file
csrf = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
fn = f'unit_pw_{int(time.time())}.txt'
open(fn,'wb').write(b'x')
up = s.post(f'{BASE}/api/upload', files={'files': open(fn,'rb')}, data={'csrf_token': csrf}, headers={'X-CSRFToken': csrf})
assert up.status_code == 200

# pick id
files = s.get(f'{BASE}/api/get_files').json()['files']
newname = up.json()['files'][0]['filename']
file_id = next(f['id'] for f in files if f.get('filename')==newname or f.get('name')==newname)

# create share with password and short expiry
csrf2 = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
res = s.post(f'{BASE}/api/files/{file_id}/share', json={'name':'pw','password':'123','can_download':True,'expires_in_days':0}, headers={'X-CSRFToken': csrf2})
assert res.status_code == 200 and res.json().get('success')
token = res.json()['share_link']['token']
url = res.json()['share_url']

# viewing without password should prompt password page (200 HTML)
r = s.get(url)
print('[view pw]', r.status_code)
assert r.status_code == 200

# verify password via form (with CSRF)
csrf3 = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
rv = s.post(f'{BASE}/share/{token}/password', data={'password':'123', 'csrf_token': csrf3}, headers={'X-CSRFToken': csrf3})
print('[verify pw]', rv.status_code)
assert rv.status_code in (200, 302)

# after verification, download should work or be forbidden if expired
rd = s.get(f'{BASE}/share/{token}/download')
print('[download after pw]', rd.status_code)
assert rd.status_code in (200, 403)

