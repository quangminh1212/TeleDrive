import requests
import time

BASE = 'http://127.0.0.1:3000'

s = requests.Session()
assert s.get(f'{BASE}/dev/auto-login', allow_redirects=True).status_code in (200, 302)

# CSRF
csrf = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']

# Upload a tiny file
fname = f'unit_del_{int(time.time())}.txt'
open(fname, 'wb').write(b'delme')
up = s.post(f'{BASE}/api/upload', files={'files': open(fname, 'rb')}, data={'csrf_token': csrf}, headers={'X-CSRFToken': csrf})
assert up.status_code == 200, up.text

# Find the file by filename
files = s.get(f'{BASE}/api/get_files').json()['files']
item = next((f for f in files if f.get('filename') == up.json()['files'][0]['filename'] or f.get('name') == up.json()['files'][0]['filename']), None)
assert item, 'uploaded file not found in listing'
file_id = item.get('id')

# Delete by id
csrf2 = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
res = s.post(f'{BASE}/api/delete_file', json={'id': file_id}, headers={'X-CSRFToken': csrf2})
print('[delete by id]', res.status_code, res.json())
assert res.status_code == 200
assert res.json().get('success') is True

# Ensure it is marked deleted in listing (won't show or appears with is_deleted True)
files2 = s.get(f'{BASE}/api/get_files').json()['files']
ids2 = [f.get('id') for f in files2]
assert file_id not in ids2, 'deleted file still visible in listing'

