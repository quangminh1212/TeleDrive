#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Telegram OTP Service
Dịch vụ gửi mã OTP qua Telegram sử dụng Telethon
"""

import asyncio
import logging
from typing import Optional, Tuple
from telethon import TelegramClient
from telethon.errors import (
    PhoneNumberInvalidError,
    FloodWaitError,
    NotFoundError,
    PeerIdInvalidError
)
from src.config import config
from src.models.otp import OTPManager, format_phone_number, validate_phone_number

# Setup logging
logger = logging.getLogger(__name__)

class TelegramOTPService:
    """Service gửi OTP qua Telegram"""
    
    def __init__(self):
        self.client = None
        self._initialized = False
    
    async def initialize(self):
        """Khởi tạo Telegram client"""
        if self._initialized:
            return True
            
        try:
            self.client = TelegramClient(
                config.telegram.session_name,
                config.telegram.api_id,
                config.telegram.api_hash
            )

            await self.client.start(phone=config.telegram.phone_number)
            self._initialized = True
            logger.info("Telegram OTP Service đã được khởi tạo")
            return True
            
        except Exception as e:
            logger.error(f"Lỗi khởi tạo Telegram client: {e}")
            return False
    
    async def send_otp_to_user(self, phone_number: str) -> Tuple[bool, str]:
        """Gửi mã OTP đến user qua Telegram"""
        try:
            # Validate số điện thoại
            is_valid, result = validate_phone_number(phone_number)
            if not is_valid:
                return False, result
            
            formatted_phone = result
            
            # Khởi tạo client nếu chưa có
            if not self._initialized:
                init_success = await self.initialize()
                if not init_success:
                    return False, "Không thể kết nối Telegram"
            
            # Tạo mã OTP
            otp_code = OTPManager.create_otp(formatted_phone)
            
            # Tạo tin nhắn OTP
            message = self._create_otp_message(otp_code)
            
            # Gửi tin nhắn đến user
            success = await self._send_message_to_phone(formatted_phone, message)
            
            if success:
                return True, "Mã OTP đã được gửi đến Telegram của bạn"
            else:
                return False, "Không thể gửi mã OTP. Vui lòng kiểm tra số điện thoại"
                
        except Exception as e:
            logger.error(f"Lỗi gửi OTP: {e}")
            return False, f"Lỗi hệ thống: {str(e)}"
    
    async def _send_message_to_phone(self, phone_number: str, message: str) -> bool:
        """Gửi tin nhắn đến số điện thoại qua Telegram"""
        try:
            # Tìm user theo số điện thoại
            try:
                user = await self.client.get_entity(phone_number)
            except (NotFoundError, PeerIdInvalidError, ValueError):
                # Thử tìm bằng cách khác
                try:
                    # Tìm trong danh bạ
                    contacts = await self.client.get_contacts()
                    user = None
                    for contact in contacts:
                        if hasattr(contact, 'phone') and contact.phone:
                            contact_phone = '+' + contact.phone
                            if contact_phone == phone_number:
                                user = contact
                                break
                    
                    if not user:
                        logger.warning(f"Không tìm thấy user với số {phone_number}")
                        return False
                        
                except Exception as e:
                    logger.error(f"Lỗi tìm user: {e}")
                    return False
            
            # Gửi tin nhắn
            await self.client.send_message(user, message)
            logger.info(f"Đã gửi OTP đến {phone_number}")
            return True
            
        except FloodWaitError as e:
            logger.warning(f"Rate limit: phải chờ {e.seconds} giây")
            return False
        except Exception as e:
            logger.error(f"Lỗi gửi tin nhắn: {e}")
            return False
    
    def _create_otp_message(self, otp_code: str) -> str:
        """Tạo nội dung tin nhắn OTP"""
        return f"""🔐 **TeleDrive - Mã xác thực**

Mã OTP của bạn là: **{otp_code}**

⏰ Mã có hiệu lực trong 5 phút
🔒 Không chia sẻ mã này với bất kỳ ai

Nếu bạn không yêu cầu mã này, vui lòng bỏ qua tin nhắn."""
    
    async def close(self):
        """Đóng kết nối Telegram"""
        if self.client and self._initialized:
            await self.client.disconnect()
            self._initialized = False
            logger.info("Đã đóng kết nối Telegram OTP Service")

# Singleton instance
_telegram_otp_service = None

async def get_telegram_otp_service() -> TelegramOTPService:
    """Lấy instance của TelegramOTPService"""
    global _telegram_otp_service
    if _telegram_otp_service is None:
        _telegram_otp_service = TelegramOTPService()
        await _telegram_otp_service.initialize()
    return _telegram_otp_service

async def send_otp_async(phone_number: str) -> Tuple[bool, str]:
    """Helper function để gửi OTP (async)"""
    service = await get_telegram_otp_service()
    return await service.send_otp_to_user(phone_number)

def send_otp_sync(phone_number: str) -> Tuple[bool, str]:
    """Helper function để gửi OTP (sync)"""
    try:
        # Kiểm tra xem có event loop đang chạy không
        try:
            loop = asyncio.get_running_loop()
            # Nếu có event loop đang chạy, sử dụng thread pool
            import concurrent.futures
            import threading

            def run_in_thread():
                # Tạo event loop mới trong thread riêng
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    return new_loop.run_until_complete(send_otp_async(phone_number))
                finally:
                    new_loop.close()

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_in_thread)
                return future.result(timeout=30)  # 30 second timeout

        except RuntimeError:
            # Không có event loop đang chạy, tạo mới
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(send_otp_async(phone_number))
            finally:
                loop.close()

    except Exception as e:
        logger.error(f"Lỗi gửi OTP sync: {e}")
        return False, f"Lỗi hệ thống: {str(e)}"

# Alternative: Sử dụng bot thay vì client (nếu cần)
class TelegramBotOTPService:
    """Service gửi OTP qua Telegram Bot (alternative approach)"""
    
    def __init__(self, bot_token: str):
        self.bot_token = bot_token
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
    
    async def send_otp_via_bot(self, chat_id: str, otp_code: str) -> bool:
        """Gửi OTP qua Telegram Bot API"""
        import aiohttp
        
        message = f"""🔐 **TeleDrive - Mã xác thực**

Mã OTP của bạn là: **{otp_code}**

⏰ Mã có hiệu lực trong 5 phút
🔒 Không chia sẻ mã này với bất kỳ ai"""
        
        url = f"{self.base_url}/sendMessage"
        data = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'Markdown'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=data) as response:
                    if response.status == 200:
                        logger.info(f"Đã gửi OTP qua bot đến chat_id: {chat_id}")
                        return True
                    else:
                        logger.error(f"Lỗi gửi OTP qua bot: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"Lỗi gửi OTP qua bot: {e}")
            return False

# Cleanup function
async def cleanup_telegram_otp_service():
    """Dọn dẹp service khi tắt ứng dụng"""
    global _telegram_otp_service
    if _telegram_otp_service:
        await _telegram_otp_service.close()
        _telegram_otp_service = None
