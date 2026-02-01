"""
Script đăng nhập lại Telegram
Chạy: python311\python.exe telegram_login.py
"""
import asyncio
import sys
sys.path.insert(0, 'app')
from telethon import TelegramClient
from pathlib import Path

API_ID = 23692899
API_HASH = 'b2d3cf878546c15f20b340a6b1b5f8d3'

async def login():
    session_path = 'data/session'
    client = TelegramClient(session_path, API_ID, API_HASH)
    
    await client.connect()
    
    if await client.is_user_authorized():
        me = await client.get_me()
        print(f'✅ Đã đăng nhập: {me.first_name} ({me.phone})')
        await client.disconnect()
        return
    
    print('📱 Đăng nhập Telegram')
    print('=' * 40)
    
    phone = input('Nhập số điện thoại (vd: +84123456789): ').strip()
    
    try:
        await client.send_code_request(phone)
        code = input('Nhập mã OTP từ Telegram: ').strip()
        
        try:
            await client.sign_in(phone, code)
        except Exception as e:
            if 'password' in str(e).lower() or '2fa' in str(e).lower():
                password = input('Nhập mật khẩu 2FA: ').strip()
                await client.sign_in(password=password)
            else:
                raise e
        
        me = await client.get_me()
        print(f'✅ Đăng nhập thành công: {me.first_name}')
        
    except Exception as e:
        print(f'❌ Lỗi: {e}')
    finally:
        await client.disconnect()

if __name__ == '__main__':
    asyncio.run(login())
