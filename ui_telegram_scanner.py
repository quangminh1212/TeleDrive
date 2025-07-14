#!/usr/bin/env python3
"""
UI Telegram Scanner - Standalone version for UI server
Không phụ thuộc vào engine.py để tránh lỗi asyncio event loop
"""

import asyncio
import json
import os
import traceback
from datetime import datetime
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import (
    PhoneCodeInvalidError, PhoneNumberInvalidError, SessionPasswordNeededError,
    PhoneCodeExpiredError, PhoneCodeHashEmptyError, PasswordHashInvalidError
)

def log_detailed(step, message, level="INFO"):
    """Detailed logging function"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"[{timestamp}] {step}: {message}"
    
    if level == "ERROR":
        print(f"❌ {log_msg}")
    elif level == "WARNING":
        print(f"⚠️ {log_msg}")
    else:
        print(f"ℹ️ {log_msg}")

class UITelegramScanner:
    """Standalone Telegram Scanner for UI - No engine.py dependency"""

    def __init__(self):
        log_detailed("UI_SCANNER_INIT", "Initializing standalone UI Telegram Scanner...")
        
        self.client = None
        self.phone_code_hash = None
        self.is_authenticated = False
        self.user_info = None
        self.channels = []
        self.current_scan = None
        
        # Load channels if exist
        self.load_channels()
        
        log_detailed("UI_SCANNER_INIT", "UI Telegram Scanner initialized")
        
    async def get_auth_status(self):
        """Get authentication status"""
        log_detailed("AUTH_STATUS", "Checking authentication status...")
        
        try:
            # Check if already authenticated
            if self.is_authenticated and self.user_info:
                log_detailed("AUTH_STATUS", "User already authenticated from cache")
                return {
                    "authenticated": True,
                    "user": {
                        "first_name": getattr(self.user_info, 'first_name', ''),
                        "last_name": getattr(self.user_info, 'last_name', ''),
                        "phone": getattr(self.user_info, 'phone', ''),
                        "username": getattr(self.user_info, 'username', '')
                    }
                }

            # Create fresh client in current event loop
            log_detailed("AUTH_STATUS", "Creating fresh Telegram client...")
            await self._create_fresh_client()

            log_detailed("AUTH_STATUS", "Connecting to Telegram...")
            await self.client.connect()

            log_detailed("AUTH_STATUS", "Checking if user is authorized...")
            if await self.client.is_user_authorized():
                log_detailed("AUTH_STATUS", "User is authorized, getting user info...")
                self.user_info = await self.client.get_me()
                self.is_authenticated = True
                
                user_data = {
                    "first_name": getattr(self.user_info, 'first_name', ''),
                    "last_name": getattr(self.user_info, 'last_name', ''),
                    "phone": getattr(self.user_info, 'phone', ''),
                    "username": getattr(self.user_info, 'username', '')
                }
                
                log_detailed("AUTH_STATUS", f"Authentication successful for user: {user_data.get('first_name', 'Unknown')}")
                return {
                    "authenticated": True,
                    "user": user_data
                }
            else:
                log_detailed("AUTH_STATUS", "User is not authorized")

        except Exception as e:
            log_detailed("AUTH_STATUS", f"Auth status check failed: {e}", "ERROR")
            log_detailed("AUTH_STATUS", f"Traceback: {traceback.format_exc()}", "ERROR")

        log_detailed("AUTH_STATUS", "User not authenticated")
        return {"authenticated": False, "user": None}

    async def send_code(self, phone_number):
        """Send verification code to phone number"""
        log_detailed("SEND_CODE", f"Sending verification code to: {phone_number}")
        
        try:
            # Create fresh client in current event loop
            log_detailed("SEND_CODE", "Creating fresh Telegram client...")
            await self._create_fresh_client()

            log_detailed("SEND_CODE", "Connecting to Telegram...")
            await self.client.connect()

            log_detailed("SEND_CODE", f"Sending verification code to {phone_number}...")
            sent_code = await self.client.send_code_request(phone_number)
            self.phone_code_hash = sent_code.phone_code_hash

            log_detailed("SEND_CODE", "Verification code sent successfully")
            return {
                "success": True,
                "phone_code_hash": self.phone_code_hash
            }

        except PhoneNumberInvalidError:
            log_detailed("SEND_CODE", "Invalid phone number", "ERROR")
            return {"success": False, "error": "Số điện thoại không hợp lệ"}
        except Exception as e:
            log_detailed("SEND_CODE", f"Send code failed: {e}", "ERROR")
            log_detailed("SEND_CODE", f"Traceback: {traceback.format_exc()}", "ERROR")
            return {"success": False, "error": f"Lỗi gửi mã: {str(e)}"}

    async def verify_code(self, phone_number, code, phone_code_hash):
        """Verify the received code"""
        log_detailed("VERIFY_CODE", f"Verifying code for: {phone_number}")
        
        try:
            if not self.client:
                log_detailed("VERIFY_CODE", "Client not initialized", "ERROR")
                return {"success": False, "error": "Client not initialized"}

            # Sign in with code
            try:
                log_detailed("VERIFY_CODE", "Attempting to sign in with code...")
                user = await self.client.sign_in(phone_number, code, phone_code_hash=phone_code_hash)
                self.user_info = user
                self.is_authenticated = True

                user_data = {
                    "first_name": getattr(user, 'first_name', ''),
                    "last_name": getattr(user, 'last_name', ''),
                    "phone": getattr(user, 'phone', ''),
                    "username": getattr(user, 'username', '')
                }

                log_detailed("VERIFY_CODE", f"Sign in successful for: {user_data.get('first_name', 'Unknown')}")
                return {
                    "success": True,
                    "requires_2fa": False,
                    "user": user_data
                }

            except SessionPasswordNeededError:
                log_detailed("VERIFY_CODE", "2FA required")
                return {
                    "success": True,
                    "requires_2fa": True,
                    "user": None
                }

        except PhoneCodeInvalidError:
            log_detailed("VERIFY_CODE", "Invalid verification code", "ERROR")
            return {"success": False, "error": "Mã xác thực không đúng"}
        except PhoneCodeExpiredError:
            log_detailed("VERIFY_CODE", "Verification code expired", "ERROR")
            return {"success": False, "error": "Mã xác thực đã hết hạn"}
        except Exception as e:
            log_detailed("VERIFY_CODE", f"Code verification failed: {e}", "ERROR")
            log_detailed("VERIFY_CODE", f"Traceback: {traceback.format_exc()}", "ERROR")
            return {"success": False, "error": f"Lỗi xác thực: {str(e)}"}

    async def verify_2fa(self, password):
        """Verify 2FA password"""
        log_detailed("VERIFY_2FA", "Verifying 2FA password...")
        
        try:
            if not self.client:
                log_detailed("VERIFY_2FA", "Client not initialized", "ERROR")
                return {"success": False, "error": "Client not initialized"}

            user = await self.client.sign_in(password=password)
            self.user_info = user
            self.is_authenticated = True

            user_data = {
                "first_name": getattr(user, 'first_name', ''),
                "last_name": getattr(user, 'last_name', ''),
                "phone": getattr(user, 'phone', ''),
                "username": getattr(user, 'username', '')
            }

            log_detailed("VERIFY_2FA", f"2FA verification successful for: {user_data.get('first_name', 'Unknown')}")
            return {
                "success": True,
                "user": user_data
            }

        except PasswordHashInvalidError:
            log_detailed("VERIFY_2FA", "Invalid password", "ERROR")
            return {"success": False, "error": "Mật khẩu không đúng"}
        except Exception as e:
            log_detailed("VERIFY_2FA", f"2FA verification failed: {e}", "ERROR")
            log_detailed("VERIFY_2FA", f"Traceback: {traceback.format_exc()}", "ERROR")
            return {"success": False, "error": f"Lỗi xác thực 2FA: {str(e)}"}

    async def logout(self):
        """Logout and disconnect"""
        log_detailed("LOGOUT", "Logging out...")
        
        try:
            if self.client:
                await self.client.log_out()
                await self.client.disconnect()

            self.client = None
            self.user_info = None
            self.is_authenticated = False
            self.phone_code_hash = None

            log_detailed("LOGOUT", "Logout successful")
            return {"success": True}

        except Exception as e:
            log_detailed("LOGOUT", f"Logout failed: {e}", "ERROR")
            return {"success": False, "error": str(e)}

    async def _create_fresh_client(self):
        """Create a fresh Telegram client in current event loop"""
        try:
            # Close existing client if any
            if self.client:
                try:
                    await self.client.disconnect()
                    log_detailed("CLIENT_FRESH", "Disconnected existing client")
                except:
                    pass
            
            # Load config
            from config import CONFIG
            
            # Create new client in current event loop
            self.client = TelegramClient(
                CONFIG['telegram']['session_name'],
                CONFIG['telegram']['api_id'],
                CONFIG['telegram']['api_hash']
            )
            
            log_detailed("CLIENT_FRESH", "Created fresh Telegram client")
            
        except Exception as e:
            log_detailed("CLIENT_FRESH", f"Failed to create fresh client: {e}", "ERROR")
            raise

    def get_channels(self):
        """Get list of channels"""
        return {"channels": self.channels}
    
    def get_channel_files(self, channel_id):
        """Get files for a specific channel"""
        # This would typically load from saved results
        # For now, return empty list
        return {"files": []}
    
    def save_channels(self):
        """Save channels to file"""
        try:
            channels_file = os.path.join('output', 'channels.json')
            os.makedirs('output', exist_ok=True)
            
            with open(channels_file, 'w', encoding='utf-8') as f:
                json.dump(self.channels, f, indent=2, ensure_ascii=False)
                
            log_detailed("SAVE_CHANNELS", f"Saved {len(self.channels)} channels")
        except Exception as e:
            log_detailed("SAVE_CHANNELS", f"Failed to save channels: {e}", "ERROR")
    
    def load_channels(self):
        """Load channels from file"""
        try:
            channels_file = os.path.join('output', 'channels.json')
            if os.path.exists(channels_file):
                with open(channels_file, 'r', encoding='utf-8') as f:
                    self.channels = json.load(f)
                log_detailed("LOAD_CHANNELS", f"Loaded {len(self.channels)} channels")
            else:
                self.channels = []
                log_detailed("LOAD_CHANNELS", "No existing channels file found")
        except Exception as e:
            log_detailed("LOAD_CHANNELS", f"Failed to load channels: {e}", "ERROR")
            self.channels = []
