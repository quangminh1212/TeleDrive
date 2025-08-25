import requests

def test_download_roundtrip():
    s = requests.Session()
    # Auto login first
    r = s.get('http://127.0.0.1:3000/dev/auto-login', allow_redirects=True)
    assert r.status_code in (200, 302)

    # Get CSRF token
    csrf = s.get('http://127.0.0.1:3000/api/csrf-token').json()['csrf_token']

    # Upload a tiny file
    fname = 'unit_small.txt'
    open(fname, 'wb').write(b'abc')
    up = s.post('http://127.0.0.1:3000/api/upload', files={'files': open(fname, 'rb')},
                data={'csrf_token': csrf}, headers={'X-CSRFToken': csrf})
    assert up.status_code == 200, up.text

    # Pick first file
    files = s.get('http://127.0.0.1:3000/api/get_files').json()['files']
    assert files, 'no files returned'
    name = files[0].get('filename') or files[0].get('name')

    # Download
    d = s.get(f'http://127.0.0.1:3000/download/{name}')
    assert d.status_code == 200, d.text
    assert len(d.content) >= 0

