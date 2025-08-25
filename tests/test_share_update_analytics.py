import requests, time

BASE = 'http://127.0.0.1:3000'
s = requests.Session()
assert s.get(f'{BASE}/dev/auto-login', allow_redirects=True).status_code in (200,302)

# ensure we have a local file to share
csrf = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
name = f'unit_share_{int(time.time())}.txt'
open(name,'wb').write(b'abc')
up = s.post(f'{BASE}/api/upload', files={'files': open(name,'rb')}, data={'csrf_token': csrf}, headers={'X-CSRFToken': csrf})
assert up.status_code == 200

# pick the uploaded file id
files = s.get(f'{BASE}/api/get_files').json()['files']
fn = up.json()['files'][0]['filename']
item = next(f for f in files if f.get('filename') == fn or f.get('name') == fn)
file_id = item['id']

# create share
csrf2 = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
res = s.post(f'{BASE}/api/files/{file_id}/share', json={'name':'U','can_download':True}, headers={'X-CSRFToken': csrf2})
assert res.status_code == 200 and res.json().get('success')
link = res.json()['share_link']
link_id = link['id']

# update share
upd = s.put(f'{BASE}/api/share_link/{link_id}/update', json={'name':'NewName','description':'desc','can_view':True,'can_download':True,'max_downloads':5}, headers={'X-CSRFToken': s.get(f'{BASE}/api/csrf-token').json()['csrf_token']})
print('[update]', upd.status_code, upd.json())
assert upd.status_code == 200 and upd.json().get('success')

# access via public URLs to increment counters
url = res.json()['share_url']
assert s.get(url).status_code == 200
assert s.get(url).status_code == 200  # second view

# analytics
an = s.get(f'{BASE}/api/share_link/{link_id}/analytics')
print('[analytics]', an.status_code, an.json())
assert an.status_code == 200
j = an.json()['analytics']
assert j['total_views'] >= 2
assert j['is_active'] is True

