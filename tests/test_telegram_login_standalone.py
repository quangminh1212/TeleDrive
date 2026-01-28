#!/usr/bin/env python3
"""
Test Telegram Login - Standalone
Kiểm tra đăng nhập Telegram độc lập, không phụ thuộc Telegram Desktop
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, PhoneNumberInvalidError
import config


class TelegramLoginTester:
    """Test Telegram login functionality"""
    
    def __init__(self):
        self.client = None
        self.session_file = "tests/test_session"
        self.imported_from_desktop = False
    
    async def try_import_from_desktop(self):
        """Thử import session từ Telegram Desktop"""
        print("\n" + "="*60)
        print("TEST 0: Import Session từ Telegram Desktop")
        print("="*60)
        
        try:
            from opentele.td import TDesktop
            from opentele.api import UseCurrentSession
        except ImportError:
            print("⚠️  opentele chưa cài đặt")
            print("   Cài đặt: pip install opentele")
            return False
        except Exception as e:
            print(f"⚠️  opentele không tương thích: {e}")
            return False
        
        # Tìm Telegram Desktop
        tdata_paths = [
            os.path.expandvars(r"%APPDATA%\Telegram Desktop\tdata"),
            os.path.expanduser("~/Library/Application Support/Telegram Desktop/tdata"),
            os.path.expanduser("~/.local/share/TelegramDesktop/tdata"),
        ]
        
        tdata_path = None
        for path in tdata_paths:
            if os.path.exists(path):
                tdata_path = path
                break
        
        if not tdata_path:
            print("⚠️  Không tìm thấy Telegram Desktop")
            return False
        
        print(f"✅ Tìm thấy Telegram Desktop: {tdata_path}")
        
        try:
            # Load TDesktop session
            print("📥 Đang load session...")
            tdesk = TDesktop(tdata_path)
            
            if not tdesk.isLoaded():
                print("⚠️  Telegram Desktop chưa đăng nhập")
                return False
            
            print("✅ Đã load session!")
            
            # Convert sang Telethon
            print("🔄 Đang chuyển đổi sang Telethon...")
            client = await tdesk.ToTelethon(
                session=self.session_file,
                flag=UseCurrentSession
            )
            
            await client.connect()
            
            if await client.is_user_authorized():
                me = await client.get_me()
                print("✅ Import thành công!")
                print(f"   User: {me.first_name} {me.last_name or ''}")
                print(f"   Username: @{me.username or 'N/A'}")
                print(f"   Phone: {me.phone or 'N/A'}")
                print(f"   ID: {me.id}")
                
                await client.disconnect()
                self.imported_from_desktop = True
                return True
            else:
                await client.disconnect()
                print("⚠️  Session không hợp lệ")
                return False
                
        except Exception as e:
            print(f"⚠️  Lỗi import: {e}")
            return False
        
    async def test_existing_session(self):
        """Test 1: Kiểm tra session hiện có"""
        print("\n" + "="*60)
        print("TEST 1: Kiểm tra Session Hiện Có")
        print("="*60)
        
        session_path = f"{self.session_file}.session"
        if not os.path.exists(session_path):
            print("❌ Không tìm thấy session file")
            print(f"   Path: {session_path}")
            return False
        
        print(f"✅ Tìm thấy session file: {session_path}")
        
        try:
            # Tạo client với session hiện có
            self.client = TelegramClient(
                self.session_file,
                int(config.API_ID),
                config.API_HASH
            )
            
            await self.client.connect()
            print("✅ Kết nối thành công")
            
            # Kiểm tra authorization
            if await self.client.is_user_authorized():
                me = await self.client.get_me()
                print("✅ Session hợp lệ!")
                print(f"   User: {me.first_name} {me.last_name or ''}")
                print(f"   Username: @{me.username or 'N/A'}")
                print(f"   Phone: {me.phone or 'N/A'}")
                print(f"   ID: {me.id}")
                return True
            else:
                print("❌ Session không hợp lệ (chưa authorized)")
                return False
                
        except Exception as e:
            print(f"❌ Lỗi: {e}")
            return False
        finally:
            if self.client:
                await self.client.disconnect()
    
    async def test_new_login(self, phone_number: str):
        """Test 2: Đăng nhập mới với số điện thoại"""
        print("\n" + "="*60)
        print("TEST 2: Đăng Nhập Mới")
        print("="*60)
        
        # Xóa session cũ nếu có
        session_path = f"{self.session_file}.session"
        if os.path.exists(session_path):
            os.remove(session_path)
            print(f"🗑️  Đã xóa session cũ: {session_path}")
        
        try:
            # Tạo client mới
            self.client = TelegramClient(
                self.session_file,
                int(config.API_ID),
                config.API_HASH
            )
            
            await self.client.connect()
            print("✅ Kết nối thành công")
            
            # Gửi mã xác thực
            print(f"\n📱 Gửi mã xác thực đến: {phone_number}")
            sent_code = await self.client.send_code_request(phone_number)
            print("✅ Đã gửi mã xác thực!")
            print(f"   Phone code hash: {sent_code.phone_code_hash[:20]}...")
            
            # Nhập mã xác thực
            code = input("\n🔑 Nhập mã xác thực từ Telegram: ")
            
            try:
                # Đăng nhập với mã
                print("\n🔐 Đang xác thực...")
                await self.client.sign_in(phone_number, code)
                print("✅ Đăng nhập thành công!")
                
            except SessionPasswordNeededError:
                # Cần 2FA
                print("\n🔐 Tài khoản có bật 2FA")
                password = input("🔑 Nhập mật khẩu 2FA: ")
                await self.client.sign_in(password=password)
                print("✅ Đăng nhập thành công với 2FA!")
            
            # Lấy thông tin user
            me = await self.client.get_me()
            print("\n✅ Thông tin tài khoản:")
            print(f"   User: {me.first_name} {me.last_name or ''}")
            print(f"   Username: @{me.username or 'N/A'}")
            print(f"   Phone: {me.phone or 'N/A'}")
            print(f"   ID: {me.id}")
            
            print(f"\n💾 Session đã được lưu: {session_path}")
            return True
            
        except PhoneCodeInvalidError:
            print("❌ Mã xác thực không đúng!")
            return False
        except PhoneNumberInvalidError:
            print("❌ Số điện thoại không hợp lệ!")
            return False
        except Exception as e:
            print(f"❌ Lỗi: {e}")
            return False
        finally:
            if self.client:
                await self.client.disconnect()
    
    async def test_api_credentials(self):
        """Test 3: Kiểm tra API credentials"""
        print("\n" + "="*60)
        print("TEST 3: Kiểm Tra API Credentials")
        print("="*60)
        
        # Kiểm tra API_ID
        if not hasattr(config, 'API_ID') or not config.API_ID:
            print("❌ API_ID không được cấu hình")
            return False
        
        try:
            api_id = int(config.API_ID)
            if api_id <= 0:
                print("❌ API_ID không hợp lệ")
                return False
            print(f"✅ API_ID: {api_id}")
        except ValueError:
            print("❌ API_ID phải là số")
            return False
        
        # Kiểm tra API_HASH
        if not hasattr(config, 'API_HASH') or not config.API_HASH:
            print("❌ API_HASH không được cấu hình")
            return False
        
        if len(config.API_HASH) != 32:
            print(f"⚠️  API_HASH có độ dài bất thường: {len(config.API_HASH)} (thường là 32)")
        
        print(f"✅ API_HASH: {config.API_HASH[:8]}...{config.API_HASH[-8:]}")
        
        # Thử kết nối
        try:
            test_client = TelegramClient(
                "tests/test_api_check",
                api_id,
                config.API_HASH
            )
            
            await test_client.connect()
            print("✅ Kết nối Telegram API thành công!")
            await test_client.disconnect()
            
            # Xóa session test
            test_session = "tests/test_api_check.session"
            if os.path.exists(test_session):
                os.remove(test_session)
            
            return True
            
        except Exception as e:
            print(f"❌ Không thể kết nối Telegram API: {e}")
            return False
    
    async def test_send_message(self):
        """Test 4: Gửi tin nhắn test (Saved Messages)"""
        print("\n" + "="*60)
        print("TEST 4: Gửi Tin Nhắn Test")
        print("="*60)
        
        session_path = f"{self.session_file}.session"
        if not os.path.exists(session_path):
            print("❌ Không có session. Vui lòng chạy test đăng nhập trước.")
            return False
        
        try:
            self.client = TelegramClient(
                self.session_file,
                int(config.API_ID),
                config.API_HASH
            )
            
            await self.client.connect()
            
            if not await self.client.is_user_authorized():
                print("❌ Session không hợp lệ")
                return False
            
            # Gửi tin nhắn đến Saved Messages
            print("📤 Gửi tin nhắn test đến Saved Messages...")
            message = await self.client.send_message(
                'me',
                '✅ TeleDrive Login Test - Thành công!\n\n'
                'Đây là tin nhắn test từ TeleDrive để xác nhận đăng nhập hoạt động.'
            )
            
            print("✅ Đã gửi tin nhắn thành công!")
            print(f"   Message ID: {message.id}")
            print(f"   Date: {message.date}")
            
            return True
            
        except Exception as e:
            print(f"❌ Lỗi: {e}")
            return False
        finally:
            if self.client:
                await self.client.disconnect()


async def main():
    """Main test function"""
    print("\n" + "="*60)
    print("🧪 TELEGRAM LOGIN TEST - STANDALONE")
    print("="*60)
    print("\nTest này kiểm tra đăng nhập Telegram độc lập,")
    print("có thể sử dụng session từ Telegram Desktop nếu có.\n")
    
    tester = TelegramLoginTester()
    
    # Test 0: Thử import từ Telegram Desktop
    print("\n🔍 Bước 0: Thử import từ Telegram Desktop...")
    desktop_ok = await tester.try_import_from_desktop()
    
    if desktop_ok:
        print("\n✅ Đã import session từ Telegram Desktop!")
        print("   Có thể bỏ qua các test đăng nhập khác.\n")
    
    # Test 3: Kiểm tra API credentials
    print("\n🔍 Bước 1: Kiểm tra cấu hình...")
    api_ok = await tester.test_api_credentials()
    
    if not api_ok:
        print("\n❌ API credentials không hợp lệ!")
        print("\n📝 Hướng dẫn:")
        print("1. Truy cập: https://my.telegram.org/apps")
        print("2. Tạo ứng dụng mới")
        print("3. Copy API_ID và API_HASH")
        print("4. Cập nhật vào config.py hoặc .env")
        return
    
    # Test 1: Kiểm tra session hiện có
    print("\n🔍 Bước 2: Kiểm tra session hiện có...")
    session_ok = await tester.test_existing_session()
    
    if session_ok:
        print("\n✅ Session hiện có hoạt động tốt!")
        if tester.imported_from_desktop:
            print("   (Session được import từ Telegram Desktop)")
        
        # Test 4: Gửi tin nhắn
        choice = input("\n❓ Bạn có muốn test gửi tin nhắn không? (y/n): ")
        if choice.lower() == 'y':
            await tester.test_send_message()
    else:
        print("\n⚠️  Không có session hợp lệ. Cần đăng nhập mới.")
        
        # Test 2: Đăng nhập mới
        choice = input("\n❓ Bạn có muốn đăng nhập mới không? (y/n): ")
        if choice.lower() == 'y':
            phone = input("\n📱 Nhập số điện thoại (với mã quốc gia, vd: +84987654321): ")
            login_ok = await tester.test_new_login(phone)
            
            if login_ok:
                print("\n✅ Đăng nhập thành công!")
                
                # Test 4: Gửi tin nhắn
                choice = input("\n❓ Bạn có muốn test gửi tin nhắn không? (y/n): ")
                if choice.lower() == 'y':
                    await tester.test_send_message()
    
    print("\n" + "="*60)
    print("🎉 TEST HOÀN TẤT!")
    print("="*60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test bị hủy bởi người dùng")
    except Exception as e:
        print(f"\n\n❌ Lỗi không mong đợi: {e}")
        import traceback
        traceback.print_exc()
