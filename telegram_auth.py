#!/usr/bin/env python3
"""
Telegram Authentication Module for TeleDrive
Handles Telegram login authentication using phone number and verification code
"""

import asyncio
import json
import os
from typing import Optional, Dict, Any
from telethon import TelegramClient
from telethon.errors import PhoneCodeInvalidError, PhoneNumberInvalidError, SessionPasswordNeededError
from telethon.tl.types import User as TelegramUser
import config
from models import db, User, get_or_create_user
from flask import current_app

class TelegramAuthenticator:
    """Handle Telegram authentication for web login"""
    
    def __init__(self):
        self.client = None
        self.temp_sessions = {}  # Store temporary session data
        
    async def initialize_client(self, session_name: str = None):
        """Initialize Telegram client for authentication"""
        if not session_name:
            session_name = f"auth_session_{os.urandom(8).hex()}"
            
        try:
            self.client = TelegramClient(
                f"data/{session_name}",
                int(config.API_ID),
                config.API_HASH
            )
            await self.client.connect()
            return True
        except Exception as e:
            print(f"Error initializing Telegram client: {e}")
            return False
    
    async def send_code_request(self, phone_number: str, country_code: str = "+84") -> Dict[str, Any]:
        """Send verification code to phone number"""
        try:
            # Format phone number with country code
            if not phone_number.startswith('+'):
                phone_number = f"{country_code}{phone_number}"
            
            # Initialize client if not already done
            if not self.client:
                await self.initialize_client()
            
            # Send code request
            sent_code = await self.client.send_code_request(phone_number)
            
            # Store session info temporarily
            session_id = os.urandom(16).hex()
            self.temp_sessions[session_id] = {
                'phone_number': phone_number,
                'phone_code_hash': sent_code.phone_code_hash,
                'client': self.client
            }
            
            return {
                'success': True,
                'session_id': session_id,
                'phone_number': phone_number,
                'message': 'Verification code sent successfully'
            }
            
        except PhoneNumberInvalidError:
            return {
                'success': False,
                'error': 'Invalid phone number format'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to send verification code: {str(e)}'
            }
    
    async def verify_code(self, session_id: str, verification_code: str, password: str = None) -> Dict[str, Any]:
        """Verify the code and complete authentication"""
        try:
            if session_id not in self.temp_sessions:
                return {
                    'success': False,
                    'error': 'Invalid or expired session'
                }
            
            session_data = self.temp_sessions[session_id]
            client = session_data['client']
            phone_number = session_data['phone_number']
            phone_code_hash = session_data['phone_code_hash']
            
            try:
                # Try to sign in with the code
                user = await client.sign_in(
                    phone=phone_number,
                    code=verification_code,
                    phone_code_hash=phone_code_hash
                )
            except SessionPasswordNeededError:
                # Two-factor authentication is enabled
                if not password:
                    return {
                        'success': False,
                        'error': 'Two-factor authentication password required',
                        'requires_password': True
                    }
                
                # Sign in with password
                user = await client.sign_in(password=password)
            
            # Get user information
            telegram_user = await client.get_me()
            
            # Create or get user in database
            db_user = self.create_or_update_user(telegram_user, phone_number)
            
            # Clean up temporary session
            del self.temp_sessions[session_id]
            await client.disconnect()
            
            return {
                'success': True,
                'user': {
                    'id': db_user.id,
                    'username': db_user.username,
                    'telegram_id': telegram_user.id,
                    'first_name': telegram_user.first_name,
                    'last_name': telegram_user.last_name,
                    'phone': phone_number
                },
                'message': 'Authentication successful'
            }
            
        except PhoneCodeInvalidError:
            return {
                'success': False,
                'error': 'Invalid verification code'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Authentication failed: {str(e)}'
            }
    
    def create_or_update_user(self, telegram_user: TelegramUser, phone_number: str) -> User:
        """Create or update user in database"""
        # Generate username from Telegram data
        username = telegram_user.username or f"user_{telegram_user.id}"
        email = f"{username}@telegram.local"
        
        # Check if user already exists by telegram_id
        user = User.query.filter_by(telegram_id=telegram_user.id).first()
        
        if not user:
            # Create new user
            user = User(
                username=username,
                email=email,
                telegram_id=telegram_user.id,
                phone_number=phone_number,
                first_name=telegram_user.first_name or '',
                last_name=telegram_user.last_name or '',
                is_active=True,
                role='user'
            )
            db.session.add(user)
        else:
            # Update existing user
            user.phone_number = phone_number
            user.first_name = telegram_user.first_name or ''
            user.last_name = telegram_user.last_name or ''
            user.is_active = True
        
        db.session.commit()
        return user
    
    async def cleanup_session(self, session_id: str):
        """Clean up temporary session"""
        if session_id in self.temp_sessions:
            client = self.temp_sessions[session_id]['client']
            try:
                await client.disconnect()
            except:
                pass
            del self.temp_sessions[session_id]
    
    async def close(self):
        """Close all connections and clean up"""
        for session_id in list(self.temp_sessions.keys()):
            await self.cleanup_session(session_id)
        
        if self.client:
            try:
                await self.client.disconnect()
            except:
                pass

# Global authenticator instance
telegram_auth = TelegramAuthenticator()

def get_country_codes():
    """Get list of common country codes"""
    return [
        ('+84', 'Vietnam (+84)'),
        ('+1', 'United States (+1)'),
        ('+44', 'United Kingdom (+44)'),
        ('+86', 'China (+86)'),
        ('+91', 'India (+91)'),
        ('+81', 'Japan (+81)'),
        ('+82', 'South Korea (+82)'),
        ('+65', 'Singapore (+65)'),
        ('+60', 'Malaysia (+60)'),
        ('+66', 'Thailand (+66)'),
        ('+62', 'Indonesia (+62)'),
        ('+63', 'Philippines (+63)'),
        ('+7', 'Russia (+7)'),
        ('+49', 'Germany (+49)'),
        ('+33', 'France (+33)'),
        ('+39', 'Italy (+39)'),
        ('+34', 'Spain (+34)'),
        ('+55', 'Brazil (+55)'),
        ('+52', 'Mexico (+52)'),
        ('+61', 'Australia (+61)')
    ]
