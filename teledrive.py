import os
import sys
import asyncio
from telethon import TelegramClient, events
from telethon.tl.types import DocumentAttributeFilename, MessageMediaDocument
import config

# Khởi tạo client Telegram
client = TelegramClient(config.SESSION_NAME, config.API_ID, config.API_HASH)

async def get_files_from_chat(chat_id, limit=100):
    """Lấy danh sách file từ một chat/channel/group với ID đã cho"""
    files_info = []

    async for message in client.iter_messages(chat_id, limit=limit):
        if message.media and isinstance(message.media, MessageMediaDocument):
            file_name = "Unknown"
            
            # Tìm tên file trong thuộc tính
            for attribute in message.media.document.attributes:
                if isinstance(attribute, DocumentAttributeFilename):
                    file_name = attribute.file_name
                    break
            
            # Tạo link tải file (yêu cầu đăng nhập)
            url = f"https://t.me/c/{str(chat_id).replace('-100', '')}/{message.id}"
            
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

async def download_file(chat_id, message_id, destination):
    """Tải file từ một tin nhắn cụ thể"""
    message = await client.get_messages(chat_id, ids=message_id)
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
    chat_id = input("Nhập Chat/Group/Channel ID (có thể là username như @tenchannel): ")
    
    # Lấy danh sách file
    print(f"Đang lấy danh sách file từ {chat_id}...")
    files = await get_files_from_chat(chat_id)
    
    # Hiển thị danh sách file
    print(f"\nĐã tìm thấy {len(files)} file:")
    for i, file in enumerate(files, 1):
        print(f"{i}. {file['file_name']} - {file['size']/1024/1024:.2f} MB - {file['download_url']}")
    
    # Tùy chọn tải file
    selection = input("\nNhập số thứ tự file muốn tải (để trống để thoát): ")
    if selection and selection.isdigit():
        idx = int(selection) - 1
        if 0 <= idx < len(files):
            destination = input("Nhập đường dẫn thư mục lưu file (mặc định: thư mục hiện tại): ")
            if not destination:
                destination = "."
            
            file = files[idx]
            await download_file(chat_id, file['message_id'], destination)
    
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main()) 