import requests, time

BASE = 'http://127.0.0.1:3000'

def login_session():
    s = requests.Session()
    assert s.get(f'{BASE}/dev/auto-login', allow_redirects=True).status_code in (200,302)
    return s

# Helpers

def upload_small(s):
    csrf = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
    fn = f'unit_limits_{int(time.time())}.txt'
    open(fn,'wb').write(b'X')
    up = s.post(f'{BASE}/api/upload', files={'files': open(fn,'rb')}, data={'csrf_token': csrf}, headers={'X-CSRFToken': csrf})
    assert up.status_code == 200
    files = s.get(f'{BASE}/api/get_files').json()['files']
    name = up.json()['files'][0]['filename']
    item = next(f for f in files if f.get('filename') == name or f.get('name') == name)
    return item['id']

# Test view limit
s = login_session()
file_id = upload_small(s)
csrf = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
res = s.post(f'{BASE}/api/files/{file_id}/share', json={'name':'limit_view','can_download':True,'max_views':1}, headers={'X-CSRFToken': csrf})
assert res.status_code == 200 and res.json().get('success')
url = res.json()['share_url']

# First view OK
r1 = s.get(url)
print('[view1]', r1.status_code)
assert r1.status_code == 200
# Second view denied
r2 = s.get(url)
print('[view2]', r2.status_code)
assert r2.status_code == 403

# Test download limit
s2 = login_session()
file_id2 = upload_small(s2)
csrf2 = s2.get(f'{BASE}/api/csrf-token').json()['csrf_token']
res2 = s2.post(f'{BASE}/api/files/{file_id2}/share', json={'name':'limit_dl','can_download':True,'max_downloads':1}, headers={'X-CSRFToken': csrf2})
assert res2.status_code == 200 and res2.json().get('success')
tok = res2.json()['share_link']['token']

# First download OK
d1 = s2.get(f'{BASE}/share/{tok}/download')
print('[dl1]', d1.status_code)
assert d1.status_code == 200
# Second download denied
d2 = s2.get(f'{BASE}/share/{tok}/download')
print('[dl2]', d2.status_code, d2.text[:100])
assert d2.status_code == 403

