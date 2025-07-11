"""
Cấu hình cho Telegram File Scanner
"""
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def load_config():
    """Load configuration from config.json"""
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Không tìm thấy config.json, sử dụng cấu hình mặc định")
        return {}
    except json.JSONDecodeError:
        print("Lỗi đọc config.json, sử dụng cấu hình mặc định")
        return {}

def save_config(config):
    """Save configuration to config.json"""
    try:
        with open('config.json', 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Lỗi lưu config.json: {e}")
        return False

def update_config_from_env():
    """Update config.json with values from .env if they exist"""
    config = load_config()

    # Update telegram credentials from .env
    api_id = os.getenv('TELEGRAM_API_ID')
    api_hash = os.getenv('TELEGRAM_API_HASH')
    phone = os.getenv('TELEGRAM_PHONE')

    if api_id and api_hash and phone:
        if 'telegram' not in config:
            config['telegram'] = {}
        config['telegram']['api_id'] = api_id
        config['telegram']['api_hash'] = api_hash
        config['telegram']['phone_number'] = phone
        save_config(config)

    return config

# Load configuration
CONFIG = update_config_from_env()

# Telegram API credentials - Ưu tiên từ .env, sau đó từ config.json
API_ID = os.getenv('TELEGRAM_API_ID') or CONFIG.get('telegram', {}).get('api_id')
API_HASH = os.getenv('TELEGRAM_API_HASH') or CONFIG.get('telegram', {}).get('api_hash')
PHONE_NUMBER = os.getenv('TELEGRAM_PHONE') or CONFIG.get('telegram', {}).get('phone_number')

# Session file name
SESSION_NAME = CONFIG.get('telegram', {}).get('session_name', 'telegram_scanner_session')

# Output settings
OUTPUT_DIR = CONFIG.get('output', {}).get('directory', 'output')
CSV_FILENAME = CONFIG.get('output', {}).get('formats', {}).get('csv', {}).get('filename', 'telegram_files.csv')
JSON_FILENAME = CONFIG.get('output', {}).get('formats', {}).get('json', {}).get('filename', 'telegram_files.json')
EXCEL_FILENAME = CONFIG.get('output', {}).get('formats', {}).get('excel', {}).get('filename', 'telegram_files.xlsx')

# Output format settings
CSV_ENABLED = CONFIG.get('output', {}).get('formats', {}).get('csv', {}).get('enabled', True)
JSON_ENABLED = CONFIG.get('output', {}).get('formats', {}).get('json', {}).get('enabled', True)
EXCEL_ENABLED = CONFIG.get('output', {}).get('formats', {}).get('excel', {}).get('enabled', True)

# Scanning settings
MAX_MESSAGES = CONFIG.get('scanning', {}).get('max_messages')
BATCH_SIZE = CONFIG.get('scanning', {}).get('batch_size', 100)

# File types to scan
file_types = CONFIG.get('scanning', {}).get('file_types', {})
SCAN_DOCUMENTS = file_types.get('documents', True)
SCAN_PHOTOS = file_types.get('photos', True)
SCAN_VIDEOS = file_types.get('videos', True)
SCAN_AUDIO = file_types.get('audio', True)
SCAN_VOICE = file_types.get('voice', True)
SCAN_STICKERS = file_types.get('stickers', True)
SCAN_ANIMATIONS = file_types.get('animations', True)

# Download settings
download_settings = CONFIG.get('download', {})
GENERATE_DOWNLOAD_LINKS = download_settings.get('generate_links', True)
INCLUDE_FILE_PREVIEW = download_settings.get('include_preview', False)
AUTO_DOWNLOAD = download_settings.get('auto_download', False)
DOWNLOAD_DIR = download_settings.get('download_directory', 'downloads')

# Display settings
display_settings = CONFIG.get('display', {})
SHOW_PROGRESS = display_settings.get('show_progress', True)
SHOW_FILE_DETAILS = display_settings.get('show_file_details', True)
LANGUAGE = display_settings.get('language', 'vi')
DATE_FORMAT = display_settings.get('date_format', 'DD/MM/YYYY HH:mm:ss')

# Filter settings
filter_settings = CONFIG.get('filters', {})
MIN_FILE_SIZE = filter_settings.get('min_file_size', 0)
MAX_FILE_SIZE = filter_settings.get('max_file_size')
FILE_EXTENSIONS = filter_settings.get('file_extensions', [])
EXCLUDE_EXTENSIONS = filter_settings.get('exclude_extensions', [])
DATE_FROM = filter_settings.get('date_from')
DATE_TO = filter_settings.get('date_to')
