"""
TData Session Importer - Support for new Telegram Desktop structure

This module can import Telegram Desktop sessions from both old and new tdata structures.
Uses telegram_tdata_decrypter for the new structure.
"""

import os
import sys
import json
import asyncio
from pathlib import Path

# Fix encoding for Windows console (only if console exists)
if sys.platform == 'win32' and sys.stdout is not None and sys.stderr is not None:
    import codecs
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
    if hasattr(sys.stderr, 'buffer'):
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'replace')


def find_telegram_desktop_tdata():
    """Find Telegram Desktop tdata folder"""
    possible_paths = []
    
    if sys.platform == 'win32':
        appdata = os.getenv('APPDATA')
        if appdata:
            possible_paths.append(os.path.join(appdata, 'Telegram Desktop', 'tdata'))
    elif sys.platform == 'darwin':
        home = os.path.expanduser('~')
        possible_paths.append(os.path.join(home, 'Library', 'Application Support', 'Telegram Desktop', 'tdata'))
    else:
        home = os.path.expanduser('~')
        possible_paths.extend([
            os.path.join(home, '.local', 'share', 'TelegramDesktop', 'tdata'),
            os.path.join(home, '.var', 'app', 'org.telegram.desktop', 'data', 'TelegramDesktop', 'tdata'),
        ])
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None


def check_tdata_structure(tdata_path: str) -> dict:
    """Check tdata structure and determine version"""
    result = {
        'version': 'unknown',
        'has_key_data': False,
        'has_key_datas': False,
        'hex_folders': [],
        'user_data_folders': [],
        'can_import': False,
        'message': ''
    }
    
    if not os.path.exists(tdata_path):
        result['message'] = 'Tdata folder does not exist'
        return result
    
    # Check key_data/key_datas
    result['has_key_data'] = os.path.exists(os.path.join(tdata_path, 'key_data'))
    result['has_key_datas'] = os.path.exists(os.path.join(tdata_path, 'key_datas'))
    
    # Find folders
    for item in os.listdir(tdata_path):
        item_path = os.path.join(tdata_path, item)
        if os.path.isdir(item_path):
            # 16-char hex folders (old)
            if len(item) == 16:
                try:
                    int(item, 16)
                    result['hex_folders'].append(item)
                except ValueError:
                    pass
            # user_data folders (new)
            elif item.startswith('user_data'):
                result['user_data_folders'].append(item)
    
    # Determine version and import capability
    if result['has_key_datas']:
        result['version'] = 'new_multi'
        result['can_import'] = True
        result['message'] = f'New multi-account tdata structure detected'
    elif result['has_key_data']:
        result['version'] = 'old'
        result['can_import'] = True
        result['message'] = f'Old tdata structure'
    else:
        result['message'] = 'No valid key_data found'
    
    return result


async def create_telethon_session_from_tdata(tdata_path: str, output_session_path: str):
    """Create Telethon session from tdata using telegram_tdata_decrypter"""
    try:
        from telegram_tdata_decrypter import TdataReader
        from telegram_tdata_decrypter.decrypter import AccountReader
        from telethon import TelegramClient
        from telethon.sessions import StringSession
        
        # Read key data
        reader = TdataReader(tdata_path, dataname='data')
        local_key, account_indexes = reader.read_key_data()
        
        if not account_indexes:
            return {
                'success': False,
                'message': 'No account found in tdata'
            }
        
        # Read first account (main account)
        account_reader = AccountReader(tdata_path, account_indexes[0], 'data')
        parsed_account = account_reader.read(local_key)
        
        user_id = parsed_account.mtp_data.user_id
        dc_id = parsed_account.mtp_data.current_dc_id
        auth_keys = parsed_account.mtp_data.keys
        
        # Get auth key for main DC
        if dc_id not in auth_keys:
            return {
                'success': False,
                'message': f'Auth key for DC {dc_id} not found'
            }
        
        auth_key = auth_keys[dc_id]
        
        # Create Telethon session file directly
        # We need to create a SQLite session file with the auth key
        import sqlite3
        
        session_file = output_session_path + '.session'
        
        # Ensure output directory exists
        output_dir = os.path.dirname(session_file)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        # Remove existing session file if exists
        if os.path.exists(session_file):
            os.remove(session_file)
        
        # DC servers
        DC_SERVERS = {
            1: ('149.154.175.53', 443),
            2: ('149.154.167.51', 443),
            3: ('149.154.175.100', 443),
            4: ('149.154.167.91', 443),
            5: ('91.108.56.130', 443),
        }
        
        server_address, port = DC_SERVERS.get(dc_id, ('149.154.167.51', 443))
        
        # Create new session database
        conn = sqlite3.connect(session_file)
        cursor = conn.cursor()
        
        # Create version table first
        cursor.execute('CREATE TABLE version (version INTEGER PRIMARY KEY)')
        cursor.execute('INSERT INTO version VALUES (?)', (7,))  # Telethon version 7
        
        # Create sessions table (Telethon format) - ONLY ONE ROW for main DC
        cursor.execute('''
            CREATE TABLE sessions (
                dc_id INTEGER PRIMARY KEY,
                server_address TEXT,
                port INTEGER,
                auth_key BLOB,
                takeout_id INTEGER
            )
        ''')
        
        # Insert ONLY the main DC auth key
        cursor.execute('''
            INSERT INTO sessions (dc_id, server_address, port, auth_key, takeout_id)
            VALUES (?, ?, ?, ?, NULL)
        ''', (dc_id, server_address, port, auth_key))
        
        # Create entities table (empty)
        cursor.execute('''
            CREATE TABLE entities (
                id INTEGER PRIMARY KEY,
                hash INTEGER NOT NULL,
                username TEXT,
                phone INTEGER,
                name TEXT,
                date INTEGER
            )
        ''')
        
        # Create sent_files table (empty)
        cursor.execute('''
            CREATE TABLE sent_files (
                md5_digest BLOB,
                file_size INTEGER,
                type INTEGER,
                id INTEGER,
                hash INTEGER,
                PRIMARY KEY (md5_digest, file_size, type)
            )
        ''')
        
        # Create update_state table
        cursor.execute('''
            CREATE TABLE update_state (
                id INTEGER PRIMARY KEY,
                pts INTEGER,
                qts INTEGER,
                date INTEGER,
                seq INTEGER
            )
        ''')
        
        conn.commit()
        conn.close()
        
        # Verify session by connecting
        # Use Telegram Desktop API credentials
        API_ID = 2040
        API_HASH = 'b18441a1ff607e10a989891a5462e627'
        
        client = TelegramClient(output_session_path, API_ID, API_HASH)
        await client.connect()
        
        if await client.is_user_authorized():
            me = await client.get_me()
            
            result = {
                'success': True,
                'message': 'Session imported successfully',
                'user': {
                    'id': me.id,
                    'username': me.username,
                    'first_name': me.first_name,
                    'last_name': me.last_name,
                    'phone': me.phone
                },
                'session_path': session_file
            }
            
            await client.disconnect()
            return result
        else:
            await client.disconnect()
            return {
                'success': False,
                'message': 'Session created but not authorized. Auth key may be invalid.'
            }
            
    except ImportError as e:
        return {
            'success': False,
            'message': f'Missing dependency: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'Error: {str(e)}'
        }


def import_session_sync(output_session_path: str = "data/session"):
    """Import session from Telegram Desktop - synchronous wrapper"""
    result = {
        'success': False,
        'message': '',
        'user': None
    }
    
    try:
        # Find Telegram Desktop
        tdata_path = find_telegram_desktop_tdata()
        if not tdata_path:
            result['message'] = 'Telegram Desktop not found'
            return result
        
        # Check tdata structure
        structure = check_tdata_structure(tdata_path)
        
        if not structure['can_import']:
            result['message'] = structure['message']
            return result
        
        # Import using appropriate method
        if structure['version'] in ['new_multi', 'old']:
            # Use telegram_tdata_decrypter for new structure
            return asyncio.run(create_telethon_session_from_tdata(tdata_path, output_session_path))
        else:
            result['message'] = 'Unknown tdata structure'
            return result
        
    except Exception as e:
        result['message'] = f'Error: {str(e)}'
    
    return result


def main():
    # Parse arguments
    output_path = "data/session"
    if len(sys.argv) > 1:
        output_path = sys.argv[1]
    
    # Run import
    result = import_session_sync(output_path)
    
    # Output JSON result
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
