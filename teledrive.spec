# -*- mode: python ; coding: utf-8 -*-
"""
TeleDrive PyInstaller Spec File
Build command: pyinstaller teledrive.spec
"""

import os
import sys
from pathlib import Path

block_cipher = None

# Get project root
project_root = Path(SPECPATH)

# Collect all app module files
app_files = []
for root, dirs, files in os.walk(str(project_root / 'app')):
    # Skip __pycache__
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for f in files:
        if f.endswith('.py'):
            src = os.path.join(root, f)
            # Destination relative to 'app' folder
            rel = os.path.relpath(root, str(project_root / 'app'))
            if rel == '.':
                dest = 'app'
            else:
                dest = f'app/{rel}'
            app_files.append((src, dest))

# Data files to include
datas = [
    # Templates
    ('app/templates', 'app/templates'),
    # Config files
    ('config.json', '.'),
    ('config.py', '.'),
    # Icons
    ('icon.ico', '.'),
    ('icon.png', '.'),
    # README
    ('README.md', '.'),
]

# Add templates if they exist
if (project_root / 'app' / 'templates').exists():
    datas.append(('app/templates', 'app/templates'))

# Hidden imports that PyInstaller might miss
hiddenimports = [
    'flask',
    'flask_login',
    'flask_wtf',
    'flask_sqlalchemy',
    'flask_socketio',
    'sqlalchemy',
    'sqlalchemy.orm',
    'telethon',
    'telethon.tl',
    'telethon.errors',
    'eventlet',
    'eventlet.wsgi',
    'eventlet.green',
    'engineio.async_drivers.eventlet',
    'dns',
    'dns.resolver',
    'werkzeug',
    'jinja2',
    'wtforms',
    'cryptg',
    'PIL',
    'PIL.Image',
    'aiohttp',
    'aiosignal',
    'async_timeout',
    'multidict',
    'yarl',
    'frozenlist',
    'charset_normalizer',
    'certifi',
    'idna',
    'urllib3',
    'requests',
]

a = Analysis(
    ['main.py'],
    pathex=[str(project_root), str(project_root / 'app')],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'PyQt5',
        'PyQt6',
        'PySide2',
        'PySide6',
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
    name='TeleDrive',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Set to False for GUI-only app (no console window)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='icon.ico',
)
