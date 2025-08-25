import requests, json

BASE = 'http://127.0.0.1:3000'

s = requests.Session()
print('[login]', s.get(f'{BASE}/dev/auto-login', allow_redirects=True).status_code)

csrf = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']

# Upload a small file to ensure we have something to delete/share
open('tmp_share.txt','wb').write(b'share123')
up = s.post(f'{BASE}/api/upload', files={'files': open('tmp_share.txt','rb')}, data={'csrf_token': csrf}, headers={'X-CSRFToken': csrf})
print('[upload]', up.status_code)

# Get files
files = s.get(f'{BASE}/api/get_files').json()['files']
assert files
first = files[0]
file_id = first.get('id')
name = first.get('filename') or first.get('name')
print('[file]', file_id, name)

# Create share link for the file id if present
if file_id:
    payload = {'name': 'Test Link', 'description': 'via http test', 'can_view': True, 'can_download': True}
    csrf2 = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
    headers = {'X-CSRFToken': csrf2}
    res = s.post(f'{BASE}/api/files/{file_id}/share', json=payload, headers=headers)
    print('[share create]', res.status_code, res.json().get('success'))
    data = res.json()
    if data.get('success'):
        share_url = data['share_url']
        token = data['share_link']['token']
        print('[share url]', share_url)
        # View public share page
        pv = s.get(share_url)
        print('[share view]', pv.status_code)
        # Download via share
        dv = s.get(f'{BASE}/share/{token}/download')
        print('[share download]', dv.status_code, len(dv.content))

# Delete file via API
csrf3 = s.get(f'{BASE}/api/csrf-token').json()['csrf_token']
resp = s.post(f'{BASE}/api/delete_file', json={'filename': name}, headers={'X-CSRFToken': csrf3})
print('[delete]', resp.status_code, resp.json())

