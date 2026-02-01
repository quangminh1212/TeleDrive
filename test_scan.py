import asyncio
import sys
sys.path.insert(0, 'app')
from telegram_storage import telegram_storage

async def test():
    print('Initializing...')
    result = await telegram_storage.initialize()
    print(f'Initialize result: {result}')
    
    if result:
        print('Scanning Saved Messages...')
        files = await telegram_storage.scan_saved_messages(limit=10)
        print(f'Found {len(files)} files')
        for f in files[:5]:
            fname = f.get('filename', 'unknown')
            print(f'  - {fname}')
    else:
        print('Failed to initialize!')
    
    await telegram_storage.close()

asyncio.run(test())
