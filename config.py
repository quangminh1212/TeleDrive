"""
Cấu hình cho Telegram File Scanner
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Telegram API credentials
# Lấy từ https://my.telegram.org/apps
API_ID = os.getenv('TELEGRAM_API_ID')
API_HASH = os.getenv('TELEGRAM_API_HASH')
PHONE_NUMBER = os.getenv('TELEGRAM_PHONE')

# Session file name
SESSION_NAME = 'telegram_scanner_session'

# Output settings
OUTPUT_DIR = 'output'
CSV_FILENAME = 'telegram_files.csv'
JSON_FILENAME = 'telegram_files.json'
EXCEL_FILENAME = 'telegram_files.xlsx'

# Scanning settings
MAX_MESSAGES = None  # None = scan all messages, hoặc đặt số để giới hạn
BATCH_SIZE = 100  # Số message xử lý mỗi lần

# File types to scan
SCAN_DOCUMENTS = True
SCAN_PHOTOS = True
SCAN_VIDEOS = True
SCAN_AUDIO = True
SCAN_VOICE = True
SCAN_STICKERS = True
SCAN_ANIMATIONS = True

# Download settings
GENERATE_DOWNLOAD_LINKS = True
INCLUDE_FILE_PREVIEW = False
