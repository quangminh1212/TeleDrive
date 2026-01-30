"""Show all messages in Saved Messages"""
import asyncio
import sys
sys.path.insert(0, 'app')

from telethon import TelegramClient
import config
from pathlib import Path

async def test():
    print("=== ALL SAVED MESSAGES ===")
    
    session_file = Path("data/session_import.session")
    if not session_file.exists():
        session_file = Path("data/session.session")
    
    session_name = str(session_file).replace('.session', '')
    client = TelegramClient(session_name, int(config.API_ID), config.API_HASH)
    
    try:
        await client.connect()
        if not await client.is_user_authorized():
            print("Not authorized!")
            return
        
        me = await client.get_me()
        print(f"User: {me.first_name}\n")
        
        async for msg in client.iter_messages('me', limit=50):
            print(f"--- Message ID: {msg.id} ---")
            print(f"Date: {msg.date}")
            print(f"Has media: {bool(msg.media)}")
            if msg.media:
                print(f"Media type: {type(msg.media).__name__}")
            if msg.text:
                text = msg.text[:100] + "..." if len(msg.text) > 100 else msg.text
                print(f"Text: {text}")
            print()
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(test())
