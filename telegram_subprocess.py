#!/usr/bin/env python3
"""
Telegram Subprocess Handler
Chạy Telegram operations trong subprocess riêng để tránh lỗi asyncio event loop
"""

import asyncio
import sys
import json
import traceback
from datetime import datetime

def log_detailed(step, message, level="INFO"):
    """Detailed logging function"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"[{timestamp}] {step}: {message}"
    
    if level == "ERROR":
        print(f"❌ {log_msg}", file=sys.stderr)
    elif level == "WARNING":
        print(f"⚠️ {log_msg}", file=sys.stderr)
    else:
        print(f"ℹ️ {log_msg}", file=sys.stderr)

async def send_code_subprocess(phone_number):
    """Send verification code in subprocess"""
    log_detailed("SUBPROCESS_SEND_CODE", f"Starting send code for: {phone_number}")
    
    try:
        from telethon import TelegramClient
        from telethon.errors import PhoneNumberInvalidError
        from config import CONFIG
        
        # Set event loop policy for Windows
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            log_detailed("SUBPROCESS_SEND_CODE", "Set SelectorEventLoopPolicy")
        
        # Create client
        client = TelegramClient(
            CONFIG['telegram']['session_name'],
            CONFIG['telegram']['api_id'],
            CONFIG['telegram']['api_hash']
        )
        
        log_detailed("SUBPROCESS_SEND_CODE", "Created TelegramClient")
        
        # Connect and send code
        await client.connect()
        log_detailed("SUBPROCESS_SEND_CODE", "Connected to Telegram")
        
        sent_code = await client.send_code_request(phone_number)
        log_detailed("SUBPROCESS_SEND_CODE", "Code sent successfully")
        
        await client.disconnect()
        log_detailed("SUBPROCESS_SEND_CODE", "Disconnected from Telegram")
        
        return {
            "success": True,
            "phone_code_hash": sent_code.phone_code_hash
        }
        
    except PhoneNumberInvalidError:
        log_detailed("SUBPROCESS_SEND_CODE", "Invalid phone number", "ERROR")
        return {"success": False, "error": "Số điện thoại không hợp lệ"}
    except Exception as e:
        log_detailed("SUBPROCESS_SEND_CODE", f"Error: {e}", "ERROR")
        log_detailed("SUBPROCESS_SEND_CODE", f"Traceback: {traceback.format_exc()}", "ERROR")
        return {"success": False, "error": str(e)}

async def verify_code_subprocess(phone_number, code, phone_code_hash):
    """Verify code in subprocess"""
    log_detailed("SUBPROCESS_VERIFY_CODE", f"Starting verify code for: {phone_number}")
    
    try:
        from telethon import TelegramClient
        from telethon.errors import PhoneCodeInvalidError, PhoneCodeExpiredError, SessionPasswordNeededError
        from config import CONFIG
        
        # Set event loop policy for Windows
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            log_detailed("SUBPROCESS_VERIFY_CODE", "Set SelectorEventLoopPolicy")
        
        # Create client
        client = TelegramClient(
            CONFIG['telegram']['session_name'],
            CONFIG['telegram']['api_id'],
            CONFIG['telegram']['api_hash']
        )
        
        log_detailed("SUBPROCESS_VERIFY_CODE", "Created TelegramClient")
        
        # Connect and verify code
        await client.connect()
        log_detailed("SUBPROCESS_VERIFY_CODE", "Connected to Telegram")
        
        try:
            user = await client.sign_in(phone_number, code, phone_code_hash=phone_code_hash)
            log_detailed("SUBPROCESS_VERIFY_CODE", "Sign in successful")
            
            user_data = {
                "first_name": getattr(user, 'first_name', ''),
                "last_name": getattr(user, 'last_name', ''),
                "phone": getattr(user, 'phone', ''),
                "username": getattr(user, 'username', '')
            }
            
            await client.disconnect()
            log_detailed("SUBPROCESS_VERIFY_CODE", "Disconnected from Telegram")
            
            return {
                "success": True,
                "requires_2fa": False,
                "user": user_data
            }
            
        except SessionPasswordNeededError:
            await client.disconnect()
            log_detailed("SUBPROCESS_VERIFY_CODE", "2FA required")
            return {
                "success": True,
                "requires_2fa": True,
                "user": None
            }
        
    except PhoneCodeInvalidError:
        log_detailed("SUBPROCESS_VERIFY_CODE", "Invalid code", "ERROR")
        return {"success": False, "error": "Mã xác thực không đúng"}
    except PhoneCodeExpiredError:
        log_detailed("SUBPROCESS_VERIFY_CODE", "Code expired", "ERROR")
        return {"success": False, "error": "Mã xác thực đã hết hạn"}
    except Exception as e:
        log_detailed("SUBPROCESS_VERIFY_CODE", f"Error: {e}", "ERROR")
        return {"success": False, "error": str(e)}

async def check_auth_status_subprocess():
    """Check auth status in subprocess"""
    log_detailed("SUBPROCESS_AUTH_STATUS", "Checking auth status")
    
    try:
        from telethon import TelegramClient
        from config import CONFIG
        
        # Set event loop policy for Windows
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            log_detailed("SUBPROCESS_AUTH_STATUS", "Set SelectorEventLoopPolicy")
        
        # Create client
        client = TelegramClient(
            CONFIG['telegram']['session_name'],
            CONFIG['telegram']['api_id'],
            CONFIG['telegram']['api_hash']
        )
        
        log_detailed("SUBPROCESS_AUTH_STATUS", "Created TelegramClient")
        
        # Connect and check auth
        await client.connect()
        log_detailed("SUBPROCESS_AUTH_STATUS", "Connected to Telegram")
        
        if await client.is_user_authorized():
            user = await client.get_me()
            log_detailed("SUBPROCESS_AUTH_STATUS", "User is authorized")
            
            user_data = {
                "first_name": getattr(user, 'first_name', ''),
                "last_name": getattr(user, 'last_name', ''),
                "phone": getattr(user, 'phone', ''),
                "username": getattr(user, 'username', '')
            }
            
            await client.disconnect()
            log_detailed("SUBPROCESS_AUTH_STATUS", "Disconnected from Telegram")
            
            return {
                "authenticated": True,
                "user": user_data
            }
        else:
            await client.disconnect()
            log_detailed("SUBPROCESS_AUTH_STATUS", "User not authorized")
            return {"authenticated": False, "user": None}
        
    except Exception as e:
        log_detailed("SUBPROCESS_AUTH_STATUS", f"Error: {e}", "ERROR")
        return {"authenticated": False, "user": None, "error": str(e)}

async def main():
    """Main function for subprocess"""
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No command provided"}))
        return
    
    command = sys.argv[1]
    
    try:
        if command == "send_code":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Phone number required"}))
                return
            phone_number = sys.argv[2]
            result = await send_code_subprocess(phone_number)
            print(json.dumps(result))
            
        elif command == "verify_code":
            if len(sys.argv) < 5:
                print(json.dumps({"success": False, "error": "Phone, code, and hash required"}))
                return
            phone_number = sys.argv[2]
            code = sys.argv[3]
            phone_code_hash = sys.argv[4]
            result = await verify_code_subprocess(phone_number, code, phone_code_hash)
            print(json.dumps(result))
            
        elif command == "auth_status":
            result = await check_auth_status_subprocess()
            print(json.dumps(result))
            
        else:
            print(json.dumps({"success": False, "error": f"Unknown command: {command}"}))
            
    except Exception as e:
        log_detailed("MAIN", f"Error: {e}", "ERROR")
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    asyncio.run(main())
