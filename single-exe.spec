# -*- mode: python ; coding: utf-8 -*-
"""
TeleDrive Single-EXE PyInstaller Spec
Creates a single portable executable containing:
- Flask backend (Python)
- Tauri frontend (TeleDrive-UI.exe)
"""

import os
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules, collect_all

block_cipher = None
project_root = Path(SPECPATH)

# Collect ALL submodules for problematic packages
dns_imports = collect_submodules('dns')
eventlet_imports = collect_submodules('eventlet')
telethon_imports = collect_submodules('telethon')
flask_imports = collect_submodules('flask')
sqlalchemy_imports = collect_submodules('sqlalchemy')

# Collect all app module files
app_datas = []
app_dir = project_root / 'app'

for root, dirs, files in os.walk(str(app_dir)):
    # Skip __pycache__ and other unwanted dirs
    dirs[:] = [d for d in dirs if d not in ('__pycache__', '.git', 'node_modules')]
    
    for f in files:
        # Include Python, HTML, JSON, CSS, JS files
        if f.endswith(('.py', '.html', '.json', '.css', '.js', '.txt')):
            src = os.path.join(root, f)
            rel = os.path.relpath(root, str(project_root))
            app_datas.append((src, rel))

# Main data files
datas = [
    # Tauri UI executable
    ('TeleDrive-UI.exe', '.'),
    
    # Templates
    ('app/templates', 'app/templates'),
    
    # Config
    ('config.json', '.'),
]

# Add static files if they exist
if (project_root / 'app' / 'static').exists():
    datas.append(('app/static', 'app/static'))

# Hidden imports that PyInstaller might miss
hiddenimports = [
    # Flask ecosystem
    'flask',
    'flask.json',
    'flask_login',
    'flask_wtf',
    'flask_sqlalchemy',
    'flask_socketio',
    
    # SQLAlchemy
    'sqlalchemy',
    'sqlalchemy.orm',
    'sqlalchemy.ext.declarative',
    
    # Telethon
    'telethon',
    'telethon.tl',
    'telethon.tl.types',
    'telethon.tl.functions',
    'telethon.errors',
    'telethon.sessions',
    
    # Eventlet for SocketIO - include ALL hubs
    'eventlet',
    'eventlet.wsgi',
    'eventlet.green',
    'eventlet.green.socket',
    'eventlet.green.ssl',
    'eventlet.green.threading',
    'eventlet.hubs',
    'eventlet.hubs.hub',
    'eventlet.hubs.poll',
    'eventlet.hubs.selects',
    'eventlet.hubs.epolls',
    'eventlet.hubs.kqueue',
    'eventlet.support',
    'eventlet.support.greendns',
    'engineio.async_drivers.eventlet',
    'socketio',
    
    # DNS - include all submodules
    'dns',
    'dns.resolver',
    'dns.rdata',
    'dns.rdatatype',
    'dns.rdataclass',
    'dns.name',
    'dns.message',
    'dns.query',
    'dns.exception',
    'dns.entropy',
    'dns.flags',
    'dns.opcode',
    'dns.rcode',
    'dns.zone',
    'dns.namedict',
    'dns.reversename',
    
    # Web
    'werkzeug',
    'werkzeug.routing',
    'werkzeug.datastructures',
    'jinja2',
    'wtforms',
    
    # Crypto
    'cryptg',
    'cryptography',
    
    # Image processing
    'PIL',
    'PIL.Image',
    
    # Async
    'aiohttp',
    'aiosignal',
    'async_timeout',
    'asyncio',
    
    # Utils
    'multidict',
    'yarl',
    'frozenlist',
    'charset_normalizer',
    'certifi',
    'idna',
    'urllib3',
    'requests',
    
    # App modules
    'app',
    'app.app',
    'app.auth',
    'app.db',
    'app.config',
    'app.forms',
    'app.log',
    'app.scanner',
    'app.telegram_storage',
    'app.telegram_auth',
    'app.web_config',
    'app.i18n',
] + dns_imports + eventlet_imports + telethon_imports + flask_imports + sqlalchemy_imports

a = Analysis(
    ['launcher.py'],
    pathex=[str(project_root), str(project_root / 'app')],
    binaries=[],
    datas=datas + app_datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib', 
        'scipy',
        'PyQt5',
        'PyQt6',
        'PySide2',
        'PySide6',
        'wx',
        'gtk',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='TeleDrive-Portable',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window for release
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='frontend/src-tauri/icons/icon.ico',
)
