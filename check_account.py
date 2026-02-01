import asyncio
import sys
sys.path.insert(0, 'app')
from telethon import TelegramClient

async def check():
    client = TelegramClient("data/session", 23692899, "b2d3cf878546c15f20b340a6b1b5f8d3")
    await client.connect()
    
    if not await client.is_user_authorized():
        print("NOT AUTHORIZED")
        return
    
    me = await client.get_me()
    print("Logged in as:", me.first_name)
    print("Phone:", me.phone)
    print("Username:", me.username)
    print("User ID:", me.id)
    
    await client.disconnect()

asyncio.run(check())
