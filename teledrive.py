import os
import sys
import asyncio
from telethon import TelegramClient, events
from telethon.tl.types import DocumentAttributeFilename, MessageMediaDocument
from telethon.errors import ChatAdminRequiredError, ChannelPrivateError
import config

# Khởi tạo client Telegram
client = TelegramClient(config.SESSION_NAME, config.API_ID, config.API_HASH)

async def get_files_from_chat(chat_entity, limit=100):
    """Lấy danh sách file từ một chat/channel/group với entity đã cho"""
    files_info = []

    async for message in client.iter_messages(chat_entity, limit=limit):
        if message.media and isinstance(message.media, MessageMediaDocument):
            file_name = "Unknown"
            
            # Tìm tên file trong thuộc tính
            for attribute in message.media.document.attributes:
                if isinstance(attribute, DocumentAttributeFilename):
                    file_name = attribute.file_name
                    break
            
            # Lấy chat ID
            chat_id = 0
            if hasattr(chat_entity, 'id'):
                chat_id = chat_entity.id
            
            # Tạo link tải file (yêu cầu đăng nhập)
            chat_id_str = str(chat_id)
            if chat_id_str.startswith('-100'):
                chat_id_str = chat_id_str[4:]
            url = f"https://t.me/c/{chat_id_str}/{message.id}"
            
            # Thông tin file
            file_info = {
                "message_id": message.id,
                "file_name": file_name,
                "size": message.media.document.size,  # kích thước file (bytes)
                "download_url": url,
                "date": message.date
            }
            
            files_info.append(file_info)
    
    return files_info

async def download_file(chat_entity, message_id, destination):
    """Tải file từ một tin nhắn cụ thể"""
    message = await client.get_messages(chat_entity, ids=message_id)
    if message and message.media and isinstance(message.media, MessageMediaDocument):
        # Lấy tên file
        file_name = "downloaded_file"
        for attribute in message.media.document.attributes:
            if isinstance(attribute, DocumentAttributeFilename):
                file_name = attribute.file_name
                break
        
        # Đường dẫn lưu file
        save_path = os.path.join(destination, file_name)
        
        # Tải file
        print(f"Đang tải {file_name}...")
        await client.download_media(message, save_path)
        print(f"Đã tải xong: {save_path}")
        return save_path
    return None

async def main():
    # Kết nối tới Telegram
    await client.start()
    
    print("Đã đăng nhập thành công!")
    
    # Nhận chat_id từ người dùng
    chat_id_input = input("Nhập Chat/Group/Channel ID (có thể là username như @tenchannel hoặc ID như -1001234567890): ")
    
    # Xử lý chat_id
    try:
        # Chuẩn hóa chat_id
        if chat_id_input.isdigit() or (chat_id_input.startswith('-') and chat_id_input[1:].isdigit()):
            # Đây là ID số
            chat_id = int(chat_id_input)
        elif chat_id_input.startswith('@'):
            # Đây là username, giữ nguyên
            chat_id = chat_id_input
        else:
            # Có thể đây là username nhưng thiếu @
            chat_id = '@' + chat_id_input
        
        # Thử lấy entity của chat
        try:
            chat_entity = await client.get_entity(chat_id)
            print(f"Đã tìm thấy: {getattr(chat_entity, 'title', 'Chat')} (ID: {chat_entity.id})")
        except ValueError as e:
            print(f"Lỗi: Không tìm thấy chat. {str(e)}")
            await client.disconnect()
            return
        except ChannelPrivateError:
            print("Lỗi: Kênh này là riêng tư và bạn không phải là thành viên. Vui lòng tham gia kênh trước.")
            await client.disconnect()
            return
        except ChatAdminRequiredError:
            print("Lỗi: Bạn cần có quyền admin để truy cập kênh này.")
            await client.disconnect()
            return
        
        # Lấy danh sách file
        limit = int(input("Số lượng tin nhắn cần quét (mặc định: 100): ") or "100")
        print(f"Đang lấy danh sách file từ {getattr(chat_entity, 'title', chat_id)}...")
        files = await get_files_from_chat(chat_entity, limit)
        
        if not files:
            print("Không tìm thấy file nào trong chat/nhóm/kênh này.")
            await client.disconnect()
            return
        
        # Hiển thị danh sách file
        print(f"\nĐã tìm thấy {len(files)} file:")
        for i, file in enumerate(files, 1):
            size_mb = file['size']/1024/1024
            date_str = file['date'].strftime("%d/%m/%Y %H:%M")
            print(f"{i}. {file['file_name']} - {size_mb:.2f} MB - {date_str} - {file['download_url']}")
        
        # Tùy chọn tải file
        print("\nLựa chọn:")
        print("1. Tải một file cụ thể")
        print("2. Tải tất cả file")
        print("3. Thoát")
        choice = input("Nhập lựa chọn của bạn (1-3): ")
        
        if choice == "1":
            selection = input("Nhập số thứ tự file muốn tải: ")
            if selection.isdigit():
                idx = int(selection) - 1
                if 0 <= idx < len(files):
                    destination = input("Nhập đường dẫn thư mục lưu file (mặc định: thư mục hiện tại): ") or "."
                    file = files[idx]
                    await download_file(chat_entity, file['message_id'], destination)
                else:
                    print("Số thứ tự không hợp lệ!")
        elif choice == "2":
            destination = input("Nhập đường dẫn thư mục lưu file (mặc định: thư mục hiện tại): ") or "."
            for i, file in enumerate(files):
                print(f"Đang tải file {i+1}/{len(files)}")
                await download_file(chat_entity, file['message_id'], destination)
            print(f"Đã tải xong {len(files)} file.")
    
    except Exception as e:
        print(f"Lỗi: {str(e)}")
    
    finally:
        # Đóng kết nối
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main()) 