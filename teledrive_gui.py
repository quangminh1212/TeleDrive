import os
import sys
import asyncio
import threading
from datetime import datetime
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from telethon import TelegramClient, events
from telethon.tl.types import DocumentAttributeFilename, MessageMediaDocument
import config

# Khởi tạo client Telegram
client = None

class TeleDriveApp:
    def __init__(self, root):
        self.root = root
        self.root.title("TeleDrive - Telegram File Manager")
        self.root.geometry("900x600")
        
        # Biến lưu trữ thông tin file
        self.files = []
        self.chat_id = tk.StringVar()
        self.file_limit = tk.StringVar(value="100")
        self.status = tk.StringVar(value="Chưa kết nối")
        self.search_text = tk.StringVar()
        self.current_download = None
        
        # Tạo giao diện
        self._create_widgets()
        
        # Kết nối tới Telegram
        self.connect_thread = threading.Thread(target=self._connect_telegram)
        self.connect_thread.daemon = True
        self.connect_thread.start()
    
    def _create_widgets(self):
        # Khung chính
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Khung trạng thái
        status_frame = ttk.Frame(main_frame)
        status_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(status_frame, text="Trạng thái:").pack(side=tk.LEFT)
        ttk.Label(status_frame, textvariable=self.status).pack(side=tk.LEFT, padx=5)
        
        # Khung nhập ID chat
        input_frame = ttk.Frame(main_frame)
        input_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(input_frame, text="Chat/Nhóm/Kênh ID:").pack(side=tk.LEFT)
        ttk.Entry(input_frame, textvariable=self.chat_id, width=30).pack(side=tk.LEFT, padx=5)
        
        ttk.Label(input_frame, text="Số lượng:").pack(side=tk.LEFT, padx=5)
        ttk.Entry(input_frame, textvariable=self.file_limit, width=10).pack(side=tk.LEFT, padx=5)
        
        ttk.Button(input_frame, text="Lấy danh sách", command=self._get_files).pack(side=tk.LEFT, padx=5)
        
        # Khung tìm kiếm
        search_frame = ttk.Frame(main_frame)
        search_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(search_frame, text="Tìm kiếm:").pack(side=tk.LEFT)
        ttk.Entry(search_frame, textvariable=self.search_text, width=30).pack(side=tk.LEFT, padx=5)
        ttk.Button(search_frame, text="Tìm", command=self._filter_files).pack(side=tk.LEFT, padx=5)
        ttk.Button(search_frame, text="Xóa bộ lọc", command=self._clear_filter).pack(side=tk.LEFT, padx=5)
        
        # Khung danh sách file
        list_frame = ttk.Frame(main_frame)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Tạo Treeview để hiển thị danh sách file
        columns = ("id", "filename", "size", "date")
        self.file_tree = ttk.Treeview(list_frame, columns=columns, show="headings")
        
        # Định nghĩa các tiêu đề
        self.file_tree.heading("id", text="ID")
        self.file_tree.heading("filename", text="Tên file")
        self.file_tree.heading("size", text="Kích thước")
        self.file_tree.heading("date", text="Ngày tạo")
        
        # Định nghĩa chiều rộng cột
        self.file_tree.column("id", width=80)
        self.file_tree.column("filename", width=350)
        self.file_tree.column("size", width=100)
        self.file_tree.column("date", width=150)
        
        # Thêm thanh cuộn
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.file_tree.yview)
        self.file_tree.configure(yscroll=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.file_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Khung nút tải xuống
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X)
        
        ttk.Button(button_frame, text="Tải file đã chọn", command=self._download_selected).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Tải tất cả", command=self._download_all).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Sao chép link", command=self._copy_link).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Thoát", command=self._on_exit).pack(side=tk.RIGHT, padx=5)
    
    def _connect_telegram(self):
        global client
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def connect():
            try:
                client = TelegramClient(config.SESSION_NAME, config.API_ID, config.API_HASH)
                await client.start()
                self.status.set("Đã kết nối")
            except Exception as e:
                self.status.set(f"Lỗi kết nối: {str(e)}")
                messagebox.showerror("Lỗi kết nối", str(e))
        
        loop.run_until_complete(connect())
    
    def _get_files(self):
        if not client:
            messagebox.showwarning("Cảnh báo", "Đang kết nối tới Telegram, vui lòng thử lại sau.")
            return
        
        chat_id = self.chat_id.get().strip()
        if not chat_id:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập ID chat/nhóm/kênh.")
            return
        
        try:
            limit = int(self.file_limit.get())
            if limit <= 0:
                limit = 100
        except ValueError:
            limit = 100
        
        # Xóa dữ liệu cũ
        for item in self.file_tree.get_children():
            self.file_tree.delete(item)
        
        self.files = []
        self.status.set("Đang lấy danh sách file...")
        
        # Tạo thread để lấy danh sách file
        thread = threading.Thread(target=self._fetch_files, args=(chat_id, limit))
        thread.daemon = True
        thread.start()
    
    def _fetch_files(self, chat_id, limit):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def fetch():
            try:
                self.files = await self._get_files_from_chat(chat_id, limit)
                
                # Cập nhật UI trong main thread
                self.root.after(0, self._update_file_list)
            except Exception as e:
                self.root.after(0, lambda: self.status.set(f"Lỗi: {str(e)}"))
                self.root.after(0, lambda: messagebox.showerror("Lỗi", str(e)))
        
        loop.run_until_complete(fetch())
    
    async def _get_files_from_chat(self, chat_id, limit=100):
        files_info = []
        
        async for message in client.iter_messages(chat_id, limit=limit):
            if message.media and isinstance(message.media, MessageMediaDocument):
                file_name = "Unknown"
                
                # Tìm tên file trong thuộc tính
                for attribute in message.media.document.attributes:
                    if isinstance(attribute, DocumentAttributeFilename):
                        file_name = attribute.file_name
                        break
                
                # Tạo link tải file
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
    
    def _update_file_list(self):
        # Xóa dữ liệu cũ
        for item in self.file_tree.get_children():
            self.file_tree.delete(item)
        
        # Thêm dữ liệu mới
        for file in self.files:
            size_str = self._format_size(file['size'])
            date_str = file['date'].strftime("%d/%m/%Y %H:%M")
            
            self.file_tree.insert("", tk.END, values=(
                file['message_id'],
                file['file_name'],
                size_str,
                date_str
            ))
        
        self.status.set(f"Đã tìm thấy {len(self.files)} file")
    
    def _filter_files(self):
        search_text = self.search_text.get().lower()
        if not search_text:
            self._update_file_list()
            return
        
        # Xóa dữ liệu cũ
        for item in self.file_tree.get_children():
            self.file_tree.delete(item)
        
        # Lọc và thêm dữ liệu mới
        filtered_files = [file for file in self.files if search_text in file['file_name'].lower()]
        
        for file in filtered_files:
            size_str = self._format_size(file['size'])
            date_str = file['date'].strftime("%d/%m/%Y %H:%M")
            
            self.file_tree.insert("", tk.END, values=(
                file['message_id'],
                file['file_name'],
                size_str,
                date_str
            ))
        
        self.status.set(f"Đã tìm thấy {len(filtered_files)} file khớp với tìm kiếm")
    
    def _clear_filter(self):
        self.search_text.set("")
        self._update_file_list()
    
    def _download_selected(self):
        if not client:
            messagebox.showwarning("Cảnh báo", "Đang kết nối tới Telegram, vui lòng thử lại sau.")
            return
        
        selected_items = self.file_tree.selection()
        if not selected_items:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn ít nhất một file để tải.")
            return
        
        # Chọn thư mục lưu file
        download_dir = filedialog.askdirectory(title="Chọn thư mục lưu file")
        if not download_dir:
            return
        
        # Lấy ID message của các file đã chọn
        selected_ids = []
        for item in selected_items:
            message_id = self.file_tree.item(item, 'values')[0]
            selected_ids.append(int(message_id))
        
        # Tìm file tương ứng
        selected_files = [file for file in self.files if file['message_id'] in selected_ids]
        
        # Tạo thread để tải file
        thread = threading.Thread(
            target=self._download_files, 
            args=(selected_files, download_dir)
        )
        thread.daemon = True
        thread.start()
    
    def _download_all(self):
        if not client:
            messagebox.showwarning("Cảnh báo", "Đang kết nối tới Telegram, vui lòng thử lại sau.")
            return
        
        if not self.files:
            messagebox.showwarning("Cảnh báo", "Không có file nào để tải.")
            return
        
        # Chọn thư mục lưu file
        download_dir = filedialog.askdirectory(title="Chọn thư mục lưu file")
        if not download_dir:
            return
        
        # Tạo thread để tải file
        thread = threading.Thread(
            target=self._download_files, 
            args=(self.files, download_dir)
        )
        thread.daemon = True
        thread.start()
    
    def _download_files(self, files, destination):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def download():
            chat_id = self.chat_id.get().strip()
            for i, file in enumerate(files):
                self.root.after(0, lambda: self.status.set(f"Đang tải {i+1}/{len(files)}: {file['file_name']}"))
                await self._download_file(chat_id, file['message_id'], destination)
            
            self.root.after(0, lambda: self.status.set(f"Đã tải xong {len(files)} file"))
            self.root.after(0, lambda: messagebox.showinfo("Hoàn tất", f"Đã tải xong {len(files)} file"))
        
        loop.run_until_complete(download())
    
    async def _download_file(self, chat_id, message_id, destination):
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
            await client.download_media(message, save_path)
            return save_path
        return None
    
    def _copy_link(self):
        selected_items = self.file_tree.selection()
        if not selected_items:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn một file để sao chép link.")
            return
        
        # Lấy message ID của file đã chọn
        message_id = int(self.file_tree.item(selected_items[0], 'values')[0])
        
        # Tìm file tương ứng
        selected_file = next((file for file in self.files if file['message_id'] == message_id), None)
        
        if selected_file:
            self.root.clipboard_clear()
            self.root.clipboard_append(selected_file['download_url'])
            self.status.set(f"Đã sao chép link của file {selected_file['file_name']}")
    
    def _on_exit(self):
        if client:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(client.disconnect())
        self.root.destroy()
    
    def _format_size(self, size_bytes):
        # Chuyển đổi kích thước từ bytes sang định dạng dễ đọc
        sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        if size_bytes == 0:
            return "0B"
        
        i = 0
        while size_bytes >= 1024 and i < len(sizes) - 1:
            size_bytes /= 1024
            i += 1
        
        return f"{size_bytes:.2f} {sizes[i]}"

# Khởi tạo ứng dụng
def main():
    root = tk.Tk()
    app = TeleDriveApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()