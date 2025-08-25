#!/usr/bin/env python3
"""
Telegram Authentication Module for TeleDrive
Handles Telegram login authentication using phone number and verification code
"""

import asyncio
import hashlib
import json
import os
import time
from pathlib import Path
from typing import Optional, Dict, Any
from telethon import TelegramClient
from telethon.errors import PhoneCodeInvalidError, PhoneNumberInvalidError, SessionPasswordNeededError, PhoneCodeExpiredError
from telethon.tl.types import User as TelegramUser
import config
from db import db, User, get_or_create_user
from flask import current_app

# Import detailed logging
try:
    from log import (log_step, log_authentication_event, log_security_event,
                       log_error, log_performance_metric, get_logger)
    DETAILED_LOGGING_AVAILABLE = True
    logger = get_logger('auth')
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)

class TelegramAuthenticator:
    """Handle Telegram authentication for web login"""

    def __init__(self):
        self.client = None
        self.temp_sessions = {}  # Store temporary session data
        self.completed_sessions = {}  # Store completed sessions for race condition prevention
        # Get verification code timeout from config (default 20 minutes)
        self.session_timeout = getattr(config, 'VERIFICATION_CODE_TIMEOUT', 1200)
        # Instance ID for debugging
        self.instance_id = os.urandom(8).hex()
        # Clean up old session files on startup
        self._cleanup_old_session_files()
        print(f"[INIT] TelegramAuthenticator instance {self.instance_id} created")

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit with proper cleanup"""
        await self.close()
        return False

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

    async def send_code_request(self, phone_number: str, country_code: str = "+84", force_sms: bool = False) -> Dict[str, Any]:
        """Send verification code to phone number
        :param phone_number: phone without country code or full international
        :param country_code: like '+84'
        :param force_sms: attempt to force SMS delivery when supported
        """
        print(f"[SEND_CODE] Instance {self.instance_id} - Sending code to {phone_number[:3]}***{phone_number[-3:]}")
        print(f"[SEND_CODE] Instance {self.instance_id} - Current session count: {len(self.temp_sessions)}")

        if DETAILED_LOGGING_AVAILABLE:
            log_step("AUTH REQUEST", f"Sending verification code to {phone_number[:3]}***{phone_number[-3:]}")
            log_authentication_event("CODE_REQUEST_START", {
                'phone_masked': phone_number[:3] + '***' + phone_number[-3:],
                'country_code': country_code
            })

        try:
            # Normalize number: handle local '0' and ensure correct international format
            original_input = phone_number
            try:
                if phone_number.startswith('+'):
                    # If full international provided, fix accidental leading 0 after country code
                    if country_code and phone_number.startswith(country_code + '0'):
                        phone_number = country_code + phone_number[len(country_code)+1:]
                else:
                    # Local number: drop leading 0 when using international code
                    if country_code.startswith('+') and phone_number.startswith('0'):
                        phone_number = phone_number[1:]
                    phone_number = f"{country_code}{phone_number}"
            except Exception:
                # Fallback: best-effort formatting
                if not phone_number.startswith('+'):
                    phone_number = f"{country_code}{phone_number}"

            if DETAILED_LOGGING_AVAILABLE:
                log_step("PHONE FORMAT", f"Formatted phone: {phone_number[:3]}***{phone_number[-3:]}")
                if original_input != phone_number:
                    log_step("PHONE NORMALIZED", f"From input '{original_input}' with CC '{country_code}' -> '{phone_number[:3]}***{phone_number[-3:]}'")

            # Create a new client for each request to avoid event loop issues
            # Don't reuse self.client as it may be tied to a different event loop
            if DETAILED_LOGGING_AVAILABLE:
                log_step("CLIENT CREATE", "Creating new client for code request to avoid event loop conflicts...")

            # Create a new client with a unique session name for this request
            # Use phone number hash to avoid creating too many session files
            phone_hash = hashlib.md5(phone_number.encode()).hexdigest()[:8]
            request_session = f"code_req_{phone_hash}"
            client = TelegramClient(
                f"data/{request_session}",
                int(config.API_ID),
                config.API_HASH
            )

            try:
                # Connect the new client
                await client.connect()
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("CLIENT CONNECTED", "New code request client connected successfully")

                # Send code request
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("SEND CODE", "Sending code request to Telegram...")

                send_code_start_time = time.time()
                sent_code = await client.send_code_request(phone_number, force_sms=force_sms)
                send_code_end_time = time.time()


                # Basic stdout logging of delivery type for debugging even without detailed logging
                try:
                    delivery_type = getattr(sent_code, 'type', None)
                    next_type = getattr(sent_code, 'next_type', None)
                    timeout = getattr(sent_code, 'timeout', None)
                    print(f"[SEND_CODE] Delivery type: {delivery_type}")
                    if next_type is not None:
                        print(f"[SEND_CODE] Next type hint: {next_type}")
                    if timeout is not None:
                        print(f"[SEND_CODE] Code timeout (s): {timeout}")
                except Exception as _log_err:
                    print(f"[SEND_CODE] Could not log delivery details: {_log_err}")

                if DETAILED_LOGGING_AVAILABLE:
                    log_step("CODE SENT", f"Verification code sent successfully in {send_code_end_time - send_code_start_time:.2f}s")
                    log_step("SENT CODE DETAILS", f"Type: {type(sent_code)}, Phone code hash length: {len(sent_code.phone_code_hash) if sent_code.phone_code_hash else 'None'}")
                    log_authentication_event("CODE_REQUEST_SUCCESS", {
                        'phone_masked': phone_number[:3] + '***' + phone_number[-3:],
                        'send_duration_seconds': round(send_code_end_time - send_code_start_time, 2),
                        'phone_code_hash_length': len(sent_code.phone_code_hash) if sent_code.phone_code_hash else 0
                    })

                # Store session info temporarily with timestamp
                # Don't store the client object to avoid event loop issues
                session_id = os.urandom(16).hex()
                session_created_time = time.time()

                # Debug: Print session creation info
                print(f"[DEBUG] Creating session ID: {session_id}")
                print(f"[DEBUG] Phone code hash length: {len(sent_code.phone_code_hash)}")

                # Use longer timeout for session storage (10 minutes) but rely on Telegram API for code expiration
                session_storage_timeout = 600  # 10 minutes - just for cleanup, not for validation
                self.temp_sessions[session_id] = {
                    'phone_number': phone_number,
                    'phone_code_hash': sent_code.phone_code_hash,
                    'created_at': session_created_time,
                    'expires_at': session_created_time + session_storage_timeout,  # Extended for cleanup only
                    'send_code_duration': send_code_end_time - send_code_start_time,
                    'request_session': request_session  # Keep session name to reuse for verification
                }

                # Debug: Print after storing
                print(f"[DEBUG] Session stored. Total sessions: {len(self.temp_sessions)}")
                print(f"[DEBUG] All session IDs: {list(self.temp_sessions.keys())}")

                if DETAILED_LOGGING_AVAILABLE:
                    log_step("SESSION STORE", f"Session stored with ID: {session_id}, storage timeout: {session_storage_timeout} seconds ({session_storage_timeout/60:.1f} minutes)")
                    log_step("PHONE CODE HASH", f"Stored phone_code_hash: {sent_code.phone_code_hash[:10]}...{sent_code.phone_code_hash[-10:] if len(sent_code.phone_code_hash) > 20 else sent_code.phone_code_hash}")
                    log_step("SESSION DEBUG", f"Total sessions after store: {len(self.temp_sessions)}")
                    log_step("SESSION LIST", f"All session IDs: {list(self.temp_sessions.keys())}")

                return {
                    'success': True,
                    'session_id': session_id,
                    'phone_number': phone_number,
                    'message': 'Verification code sent successfully'
                }

            finally:
                # Always disconnect and cleanup the client
                try:
                    await client.disconnect()
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("CLIENT CLEANUP", "Code request client disconnected successfully")
                except Exception as cleanup_error:
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("CLIENT CLEANUP ERROR", f"Error disconnecting client: {cleanup_error}")

                # Defer session file cleanup until verification completes
                # We keep data/{request_session}.session so that verification can reuse
                # the same session context, improving reliability with Telegram API.
                # Cleanup will occur after verification or on error.

        except PhoneNumberInvalidError as e:
            if DETAILED_LOGGING_AVAILABLE:
                log_authentication_event("CODE_REQUEST_FAILED", {
                    'error': 'Invalid phone number format',
                    'phone_masked': phone_number[:3] + '***' + phone_number[-3:] if len(phone_number) > 6 else 'invalid'
                }, success=False)
                log_security_event("INVALID_PHONE_FORMAT", {
                    'phone_masked': phone_number[:3] + '***' + phone_number[-3:] if len(phone_number) > 6 else 'invalid'
                }, "WARNING")
            return {
                'success': False,
                'error': 'Invalid phone number format'
            }
        except Exception as e:
            if DETAILED_LOGGING_AVAILABLE:
                log_error(e, "send_code_request")
                log_authentication_event("CODE_REQUEST_ERROR", {
                    'error': str(e),
                    'phone_masked': phone_number[:3] + '***' + phone_number[-3:] if len(phone_number) > 6 else 'unknown'
                }, success=False)
            return {
                'success': False,
                'error': f'Failed to send verification code: {str(e)}'
            }

    async def verify_code(self, session_id: str, verification_code: str, password: str = None) -> Dict[str, Any]:
        """Verify the code and complete authentication"""
        import threading
        request_id = threading.current_thread().ident
        print(f"[VERIFY_CODE] Thread {request_id} - Instance {self.instance_id} - Verifying session: {session_id}")
        print(f"[VERIFY_CODE] Thread {request_id} - Instance {self.instance_id} - Current session count: {len(self.temp_sessions)}")
        print(f"[VERIFY_CODE] Thread {request_id} - Instance {self.instance_id} - Code length: {len(verification_code)}")

        # Check if this session is already being processed
        processing_key = f"{session_id}_processing"
        if hasattr(self, '_processing_sessions') and processing_key in self._processing_sessions:
            print(f"[VERIFY_CODE] Thread {request_id} - Session {session_id} is already being processed!")
            return {
                'success': False,
                'error': 'Verification already in progress. Please wait...',
                'already_processing': True
            }

        # Mark session as being processed
        if not hasattr(self, '_processing_sessions'):
            self._processing_sessions = set()
        self._processing_sessions.add(processing_key)
        print(f"[VERIFY_CODE] Thread {request_id} - Marked session {session_id} as processing")

        if DETAILED_LOGGING_AVAILABLE:
            log_step("VERIFY CODE", f"Verifying code for session: {session_id}")
            log_authentication_event("CODE_VERIFY_START", {
                'session_id': session_id,
                'code_length': len(verification_code)
            })

        # Use try-finally to ensure processing lock is always cleaned up
        try:
            # Clean up expired sessions first
            await self.cleanup_expired_sessions()

            # Check completed sessions first
            if session_id in self.completed_sessions:
                completed_info = self.completed_sessions[session_id]
                print(f"[DEBUG] Thread {request_id} - Session {session_id} was already completed at {completed_info.get('completed_at', 0)}")
                return {
                    'success': True,
                    'message': 'Verification already completed successfully',
                    'already_completed': True
                }

            # Debug: List all available sessions (always print for debugging timeout issue)
            print(f"[DEBUG] Thread {request_id} - Available sessions: {list(self.temp_sessions.keys())}")
            print(f"[DEBUG] Thread {request_id} - Completed sessions: {list(self.completed_sessions.keys())}")
            print(f"[DEBUG] Thread {request_id} - Looking for session: {session_id}")
            print(f"[DEBUG] Thread {request_id} - Session exists: {session_id in self.temp_sessions}")

            if DETAILED_LOGGING_AVAILABLE:
                log_step("DEBUG SESSIONS", f"Available sessions: {list(self.temp_sessions.keys())}")
                log_step("DEBUG TARGET", f"Looking for session: {session_id}")

            if session_id not in self.temp_sessions:
                if DETAILED_LOGGING_AVAILABLE:
                    log_authentication_event("CODE_VERIFY_FAILED", {
                        'error': 'Invalid or expired session',
                        'session_id': session_id,
                        'available_sessions': list(self.temp_sessions.keys()),
                        'available_count': len(self.temp_sessions)
                    }, success=False)
                    log_security_event("INVALID_SESSION_ACCESS", {
                        'session_id': session_id,
                        'available_sessions': list(self.temp_sessions.keys())
                    }, "WARNING")
                return {
                    'success': False,
                    'error': f'Session không tìm thấy. Session ID: {session_id[:8]}... Có thể session đã hết hạn hoặc server đã restart. Vui lòng yêu cầu mã mới.',
                    'session_expired': True
                }

            session_data = self.temp_sessions[session_id]

            # Check if session has expired with detailed logging
            current_time = time.time()
            expires_at = session_data.get('expires_at', 0)
            created_at = session_data.get('created_at', 0)
            session_age = current_time - created_at
            time_until_expiry = expires_at - current_time

            # Log session timing details for debugging
            if DETAILED_LOGGING_AVAILABLE:
                log_step("SESSION TIMING", f"Session age: {session_age:.2f}s, Time until expiry: {time_until_expiry:.2f}s")

            # Only check for very long expired sessions (over 10 minutes)
            # Let Telegram API handle normal code expiration
            if session_age > 600:  # 10 minutes - cleanup very old sessions
                if DETAILED_LOGGING_AVAILABLE:
                    log_authentication_event("CODE_VERIFY_FAILED", {
                        'error': 'Session too old (cleanup)',
                        'session_id': session_id,
                        'session_age_seconds': round(session_age, 2),
                        'created_at': created_at,
                        'current_time': current_time
                    }, success=False)

                await self.cleanup_session(session_id)
                return {
                    'success': False,
                    'error': 'Phiên xác thực đã quá cũ. Vui lòng yêu cầu mã mới.',
                    'session_expired': True,
                    'user_friendly_message': 'Phiên quá cũ - vui lòng lấy mã mới'
                }
            else:
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("SESSION STATUS", f"Session valid, proceeding with verification")

            session_data = self.temp_sessions[session_id]
            phone_number = session_data['phone_number']
            phone_code_hash = session_data['phone_code_hash']

            # Update last activity timestamp to show user is actively trying to verify
            verify_start_time = time.time()
            session_data['last_activity'] = verify_start_time

            if DETAILED_LOGGING_AVAILABLE:
                log_step("SESSION DATA", f"Retrieved session data for phone: {phone_number[:3]}***{phone_number[-3:]}")
                log_step("SESSION VALIDATION", f"Session created: {session_data.get('created_at', 0)}, Current time: {verify_start_time}")
                log_step("PHONE CODE HASH RETRIEVE", f"Retrieved phone_code_hash: {phone_code_hash[:10]}...{phone_code_hash[-10:] if len(phone_code_hash) > 20 else phone_code_hash}")
                log_step("TIMING", f"Time since session created: {verify_start_time - session_data.get('created_at', 0):.2f}s")

            # Create a new client for verification to avoid event loop issues
            # Don't reuse the stored client as it may be tied to a different event loop
            if DETAILED_LOGGING_AVAILABLE:
                log_step("CLIENT CREATE", "Creating new client for verification to avoid event loop conflicts...")

            # Create a new client with a unique session name for verification
            # Use a simpler session name to avoid potential issues
            verification_session = session_data.get('request_session', f"verify_{session_id[:8]}")
            client = TelegramClient(
                f"data/{verification_session}",
                int(config.API_ID),
                config.API_HASH
            )

            try:
                # Connect the new client
                await client.connect()
                if DETAILED_LOGGING_AVAILABLE:
                    log_step("CLIENT CONNECTED", "New verification client connected successfully")

                # Try to sign in with the code using the new client

                if DETAILED_LOGGING_AVAILABLE:
                    log_step("SIGN IN ATTEMPT", f"Phone: {phone_number[:3]}***{phone_number[-3:]}, Code length: {len(verification_code)}")
                    log_step("SIGN IN PARAMS", f"phone_code_hash: {phone_code_hash[:10]}...{phone_code_hash[-10:] if len(phone_code_hash) > 20 else phone_code_hash}")

                # Validate verification code format
                if not verification_code or not verification_code.isdigit():
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("CODE VALIDATION", f"Invalid code format: '{verification_code}' - must be numeric")
                    return {
                        'success': False,
                        'error': 'Mã xác thực phải là số. Vui lòng kiểm tra lại mã từ Telegram.',
                        'user_friendly_message': 'Mã xác thực không đúng định dạng'
                    }

                # Check code length (Telegram codes are typically 5-6 digits)
                if len(verification_code) < 4 or len(verification_code) > 6:
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("CODE LENGTH", f"Unusual code length: {len(verification_code)} digits")

                # Validate phone_code_hash
                if not phone_code_hash or len(phone_code_hash) < 10:
                    if DETAILED_LOGGING_AVAILABLE:
                        log_step("HASH VALIDATION", f"Invalid phone_code_hash: length {len(phone_code_hash) if phone_code_hash else 0}")
                    return {
                        'success': False,
                        'error': 'Phiên xác thực không hợp lệ. Vui lòng yêu cầu mã mới.',
                        'user_friendly_message': 'Phiên hết hạn - vui lòng lấy mã mới'
                    }

                sign_in_start_time = time.time()
                user = await client.sign_in(
                    phone=phone_number,
                    code=verification_code,
                    phone_code_hash=phone_code_hash
                )
                sign_in_end_time = time.time()

                if DETAILED_LOGGING_AVAILABLE:
                    log_step("SIGN IN SUCCESS", f"Authentication completed in {sign_in_end_time - sign_in_start_time:.2f}s")
            except SessionPasswordNeededError:

                # Two-factor authentication is enabled
                if not password:
                    # Clean up clients before returning
                    try:
                        await client.disconnect()
                    except:
                        pass
                    # Clean up verification session file
                    try:
                        session_file = f"data/{verification_session}.session"
                        if os.path.exists(session_file):
                            os.remove(session_file)
                    except:
                        pass
                    old_client = session_data.get('client')
                    if old_client:
                        try:
                            if old_client.is_connected():
                                await old_client.disconnect()
                        except:
                            pass
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

            # Mark session as completed before cleanup to prevent race conditions
            completion_time = time.time()
            session_data['completed'] = True
            session_data['completed_at'] = completion_time

            # Store in completed sessions for race condition prevention (keep for 5 minutes)
            self.completed_sessions[session_id] = {
                'completed_at': completion_time,
                'phone_number': phone_number,
                'user_id': db_user.id
            }
            print(f"[VERIFY_CODE] Thread {request_id} - Marked session {session_id} as completed")

            # Clean up temporary session and disconnect both clients
            old_client = session_data.get('client')
            del self.temp_sessions[session_id]

            # Disconnect the new verification client
            try:
                await client.disconnect()
            except Exception as e:
                pass  # Ignore disconnect errors

            # Clean up the old stored client if it exists
            if old_client:
                try:
                    if old_client.is_connected():
                        await old_client.disconnect()
                except Exception as e:
                    pass  # Ignore disconnect errors

            # Clean up the verification session file
            try:
                session_file = f"data/{verification_session}.session"
                if os.path.exists(session_file):
                    os.remove(session_file)
            except Exception as e:
                pass  # Ignore cleanup errors

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

        except PhoneCodeInvalidError as e:
            print(f"[ERROR] PhoneCodeInvalidError: {e}")
            print(f"[ERROR] Instance {self.instance_id} - Invalid verification code")
            print(f"[ERROR] Session ID: {session_id}, Code: {verification_code}")

            # Clean up verification client
            try:
                await client.disconnect()
            except:
                pass
            # Clean up verification session file
            try:
                session_file = f"data/{verification_session}.session"
                if os.path.exists(session_file):
                    os.remove(session_file)
            except:
                pass
            if DETAILED_LOGGING_AVAILABLE:
                log_authentication_event("CODE_VERIFY_FAILED", {
                    'error': 'Invalid verification code',
                    'session_id': session_id
                }, success=False)
            return {
                'success': False,
                'error': 'Mã xác thực không đúng. Vui lòng kiểm tra lại mã từ Telegram và đảm bảo nhập đúng 5-6 chữ số.',
                'user_friendly_message': 'Mã xác thực sai - vui lòng kiểm tra lại'
            }
        except PhoneCodeExpiredError as e:
            print(f"[ERROR] PhoneCodeExpiredError: {e}")
            print(f"[ERROR] Instance {self.instance_id} - Telegram code expired")
            print(f"[ERROR] Session ID: {session_id}, Code: {verification_code}")

            # Get session info for debugging
            session_data = self.temp_sessions.get(session_id, {})
            created_at = session_data.get('created_at', 0)
            current_time = time.time()
            session_age = current_time - created_at if created_at > 0 else 0
            send_code_duration = session_data.get('send_code_duration', 0)

            print(f"[ERROR] Session age: {session_age:.2f}s, Send code took: {send_code_duration:.2f}s")
            print(f"[ERROR] Session created at: {created_at}, Current time: {current_time}")
            print(f"[ERROR] Phone code hash: {session_data.get('phone_code_hash', 'N/A')[:20]}...")

            # Clean up verification client
            try:
                await client.disconnect()
            except:
                pass
            # Clean up verification session file
            try:
                session_file = f"data/{verification_session}.session"
                if os.path.exists(session_file):
                    os.remove(session_file)
            except:
                pass
            if DETAILED_LOGGING_AVAILABLE:
                log_step("CODE EXPIRED ANALYSIS", f"Session age: {session_age:.2f}s, Send code took: {send_code_duration:.2f}s")
                log_step("CODE EXPIRED DETAILS", f"Created at: {created_at}, Current: {current_time}, Phone code hash: {session_data.get('phone_code_hash', 'N/A')[:20]}...")

                log_authentication_event("CODE_VERIFY_FAILED", {
                    'error': 'Telegram verification code expired (from API)',
                    'session_id': session_id,
                    'session_age_seconds': round(session_age, 2),
                    'send_code_duration_seconds': round(send_code_duration, 2),
                    'created_at': created_at,
                    'current_time': current_time,
                    'phone_code_hash_length': len(session_data.get('phone_code_hash', '')),
                    'note': 'This is a Telegram API error, not our session timeout'
                }, success=False)

            # Clean up expired session
            if session_id in self.temp_sessions:
                await self.cleanup_session(session_id)
            return {
                'success': False,
                'error': 'Mã xác thực từ Telegram đã hết hạn. Mã thường chỉ có hiệu lực trong 2-5 phút. Vui lòng yêu cầu mã mới.',
                'code_expired': True,
                'user_friendly_message': 'Mã Telegram hết hạn - vui lòng lấy mã mới'
            }
        except Exception as e:
            print(f"[ERROR] General Exception: {e}")
            print(f"[ERROR] Exception type: {type(e).__name__}")
            print(f"[ERROR] Instance {self.instance_id} - General authentication error")
            print(f"[ERROR] Session ID: {session_id}, Code: {verification_code}")

            # Clean up verification client first
            try:
                await client.disconnect()
            except Exception as client_error:
                print(f"[ERROR] Client disconnect failed: {client_error}")

            # Clean up verification session file
            try:
                session_file = f"data/{verification_session}.session"
                if os.path.exists(session_file):
                    os.remove(session_file)
            except Exception as file_error:
                print(f"[ERROR] Session file cleanup failed: {file_error}")

            # Clean up session on any error
            if session_id in self.temp_sessions:
                try:
                    await self.cleanup_session(session_id)
                except Exception as cleanup_error:
                    print(f"[ERROR] Session cleanup failed: {cleanup_error}")

            if DETAILED_LOGGING_AVAILABLE:
                log_authentication_event("CODE_VERIFY_FAILED", {
                    'error': str(e),
                    'session_id': session_id
                }, success=False)

            return {
                'success': False,
                'error': f'Authentication failed: {str(e)}'
            }
        finally:
            # Always cleanup processing lock
            if hasattr(self, '_processing_sessions') and processing_key in self._processing_sessions:
                self._processing_sessions.remove(processing_key)
                print(f"[VERIFY_CODE] Thread {request_id} - Cleaned up processing lock for session {session_id}")

    def create_or_update_user(self, telegram_user: TelegramUser, phone_number: str) -> User:
        """Create or update user in database"""

        # Generate username from Telegram data
        username = telegram_user.username or f"user_{telegram_user.id}"
        email = f"{username}@telegram.local"

        # Check if user already exists by telegram_id (store as string)
        user = User.query.filter_by(telegram_id=str(telegram_user.id)).first()

        if not user:

            # Create new user
            user = User(
                username=username,
                email=email,
                telegram_id=str(telegram_user.id),  # Store as string for consistency
                phone_number=phone_number,
                first_name=telegram_user.first_name or '',
                last_name=telegram_user.last_name or '',
                is_active=True,
                role='user',
                auth_method='telegram'  # Set auth method to telegram
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

    async def cleanup_expired_sessions(self):
        """Clean up expired sessions asynchronously with detailed logging"""
        current_time = time.time()
        expired_sessions = []

        for session_id, session_data in self.temp_sessions.items():
            expires_at = session_data.get('expires_at', 0)
            created_at = session_data.get('created_at', 0)
            session_age = current_time - created_at

            if current_time > expires_at:
                expired_sessions.append(session_id)
                if DETAILED_LOGGING_AVAILABLE:
                    pass  # Session expired
            else:
                time_until_expiry = expires_at - current_time
                if DETAILED_LOGGING_AVAILABLE:
                    pass  # Session still valid

        # Clean up expired sessions properly
        if expired_sessions:
            for session_id in expired_sessions:
                await self.cleanup_session(session_id)
        else:
            if DETAILED_LOGGING_AVAILABLE:
                pass  # No expired sessions

        # Also cleanup old completed sessions (older than 5 minutes)
        expired_completed = []
        for session_id, completion_info in self.completed_sessions.items():
            completed_at = completion_info.get('completed_at', 0)
            if current_time - completed_at > 300:  # 5 minutes
                expired_completed.append(session_id)

        for session_id in expired_completed:
            del self.completed_sessions[session_id]
            print(f"[CLEANUP] Removed old completed session: {session_id}")

        if expired_completed:
            print(f"[CLEANUP] Cleaned up {len(expired_completed)} old completed sessions")

    async def cleanup_session(self, session_id: str):
        """Clean up temporary session with improved error handling"""
        if session_id in self.temp_sessions:
            # Since we no longer store client objects in session data,
            # we only need to remove the session from temp_sessions
            del self.temp_sessions[session_id]

            if DETAILED_LOGGING_AVAILABLE:
                log_step("SESSION CLEANUP", f"Removed session {session_id} from temp_sessions")

    def _cleanup_old_session_files(self):
        """Clean up old session files to prevent accumulation"""
        try:
            data_dir = Path("data")
            if not data_dir.exists():
                return

            current_time = time.time()
            cleaned_count = 0

            # Clean up session files older than 1 hour
            for session_file in data_dir.glob("*.session"):
                try:
                    # Check if file is older than 1 hour
                    file_age = current_time - session_file.stat().st_mtime
                    if file_age > 3600:  # 1 hour
                        session_file.unlink()
                        cleaned_count += 1
                except Exception as e:
                    pass  # Ignore file cleanup errors

            if cleaned_count > 0:
                pass  # Files cleaned up

        except Exception as e:
            pass  # Ignore cleanup errors

    async def close(self):
        """Close all connections and clean up with improved error handling"""
        # Clean up all temporary sessions first
        for session_id in list(self.temp_sessions.keys()):
            try:
                await self.cleanup_session(session_id)
            except Exception as e:
                pass  # Ignore cleanup errors

        # Clean up main client
        if self.client:
            try:
                if self.client.is_connected():
                    await asyncio.wait_for(self.client.disconnect(), timeout=10.0)
                else:
                    pass  # Already disconnected

            except asyncio.TimeoutError:
                pass  # Timeout disconnecting
            except Exception as e:
                pass  # Error disconnecting
            finally:
                self.client = None

        # Final cleanup of session files
        self._cleanup_old_session_files()

# Global authenticator instance
telegram_auth = TelegramAuthenticator()

def get_country_codes():
    """Get comprehensive list of country codes with country names"""
    return [
        # Most popular countries first
        ('+84', '+84 Vietnam'),
        ('+1', '+1 United States'),
        ('+86', '+86 China'),
        ('+91', '+91 India'),
        ('+44', '+44 United Kingdom'),
        ('+7', '+7 Russia'),
        ('+81', '+81 Japan'),
        ('+49', '+49 Germany'),
        ('+33', '+33 France'),
        ('+55', '+55 Brazil'),

        # Southeast Asia
        ('+62', '+62 Indonesia'),
        ('+66', '+66 Thailand'),
        ('+63', '+63 Philippines'),
        ('+60', '+60 Malaysia'),
        ('+65', '+65 Singapore'),
        ('+855', '+855 Cambodia'),
        ('+856', '+856 Laos'),
        ('+95', '+95 Myanmar'),
        ('+673', '+673 Brunei'),

        # East Asia
        ('+82', '+82 South Korea'),
        ('+852', '+852 Hong Kong'),
        ('+853', '+853 Macau'),
        ('+886', '+886 Taiwan'),
        ('+976', '+976 Mongolia'),
        ('+850', '+850 North Korea'),

        # South Asia
        ('+92', '+92 Pakistan'),
        ('+880', '+880 Bangladesh'),
        ('+94', '+94 Sri Lanka'),
        ('+977', '+977 Nepal'),
        ('+975', '+975 Bhutan'),
        ('+960', '+960 Maldives'),

        # Europe
        ('+39', '+39 Italy'),
        ('+34', '+34 Spain'),
        ('+31', '+31 Netherlands'),
        ('+48', '+48 Poland'),
        ('+90', '+90 Turkey'),
        ('+380', '+380 Ukraine'),
        ('+40', '+40 Romania'),
        ('+420', '+420 Czech Republic'),
        ('+30', '+30 Greece'),
        ('+351', '+351 Portugal'),
        ('+36', '+36 Hungary'),
        ('+46', '+46 Sweden'),
        ('+47', '+47 Norway'),
        ('+45', '+45 Denmark'),
        ('+358', '+358 Finland'),
        ('+41', '+41 Switzerland'),
        ('+43', '+43 Austria'),
        ('+32', '+32 Belgium'),
        ('+359', '+359 Bulgaria'),
        ('+385', '+385 Croatia'),
        ('+386', '+386 Slovenia'),
        ('+421', '+421 Slovakia'),
        ('+370', '+370 Lithuania'),
        ('+371', '+371 Latvia'),
        ('+372', '+372 Estonia'),
        ('+354', '+354 Iceland'),
        ('+353', '+353 Ireland'),
        ('+375', '+375 Belarus'),
        ('+374', '+374 Armenia'),
        ('+995', '+995 Georgia'),
        ('+994', '+994 Azerbaijan'),

        # Central Asia
        ('+998', '+998 Uzbekistan'),
        ('+996', '+996 Kyrgyzstan'),
        ('+992', '+992 Tajikistan'),
        ('+993', '+993 Turkmenistan'),

        # Middle East
        ('+98', '+98 Iran'),
        ('+964', '+964 Iraq'),
        ('+966', '+966 Saudi Arabia'),
        ('+971', '+971 UAE'),
        ('+972', '+972 Israel'),
        ('+961', '+961 Lebanon'),
        ('+962', '+962 Jordan'),
        ('+963', '+963 Syria'),
        ('+970', '+970 Palestine'),
        ('+965', '+965 Kuwait'),
        ('+973', '+973 Bahrain'),
        ('+974', '+974 Qatar'),
        ('+968', '+968 Oman'),
        ('+967', '+967 Yemen'),
        ('+93', '+93 Afghanistan'),

        # Africa
        ('+20', '+20 Egypt'),
        ('+27', '+27 South Africa'),
        ('+234', '+234 Nigeria'),
        ('+254', '+254 Kenya'),
        ('+233', '+233 Ghana'),
        ('+212', '+212 Morocco'),
        ('+213', '+213 Algeria'),
        ('+216', '+216 Tunisia'),
        ('+218', '+218 Libya'),
        ('+251', '+251 Ethiopia'),
        ('+256', '+256 Uganda'),
        ('+255', '+255 Tanzania'),
        ('+260', '+260 Zambia'),
        ('+263', '+263 Zimbabwe'),
        ('+264', '+264 Namibia'),
        ('+267', '+267 Botswana'),
        ('+268', '+268 Eswatini'),
        ('+266', '+266 Lesotho'),
        ('+230', '+230 Mauritius'),
        ('+248', '+248 Seychelles'),
        ('+261', '+261 Madagascar'),
        ('+262', '+262 Réunion'),
        ('+290', '+290 Saint Helena'),

        # Americas
        ('+52', '+52 Mexico'),
        ('+54', '+54 Argentina'),
        ('+56', '+56 Chile'),
        ('+57', '+57 Colombia'),
        ('+58', '+58 Venezuela'),
        ('+51', '+51 Peru'),
        ('+593', '+593 Ecuador'),
        ('+591', '+591 Bolivia'),
        ('+595', '+595 Paraguay'),
        ('+598', '+598 Uruguay'),
        ('+592', '+592 Guyana'),
        ('+597', '+597 Suriname'),
        ('+594', '+594 French Guiana'),
        ('+508', '+508 Saint Pierre and Miquelon'),
        ('+590', '+590 Guadeloupe'),
        ('+596', '+596 Martinique'),

        # Oceania
        ('+61', '+61 Australia'),
        ('+64', '+64 New Zealand'),
        ('+679', '+679 Fiji'),
        ('+685', '+685 Samoa'),
        ('+686', '+686 Kiribati'),
        ('+687', '+687 New Caledonia'),
        ('+688', '+688 Tuvalu'),
        ('+689', '+689 French Polynesia'),
        ('+690', '+690 Tokelau'),
        ('+691', '+691 Micronesia'),
        ('+692', '+692 Marshall Islands'),

        # Additional North American regions
        # Note: +1 already included above for US
    ]
