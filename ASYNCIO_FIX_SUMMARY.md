# Asyncio Event Loop Fix Summary

## Vấn đề gặp phải
- Lỗi: "The asyncio event loop must not change after connection (see the FAQ for details)"
- Xảy ra khi gửi mã xác thực qua UI API
- Nguyên nhân: TelegramClient được tạo trong một event loop khác với event loop hiện tại

## Các giải pháp đã thử

### 1. Sửa ui_server.py ban đầu
- Thêm logging chi tiết
- Sử dụng `asyncio.run_coroutine_threadsafe` để chạy coroutines từ Flask thread
- Tạo event loop riêng cho asyncio operations
- **Kết quả**: Vẫn còn lỗi vì TelegramFileScanner trong engine.py cũng tạo client

### 2. Tạo UITelegramScanner độc lập
- Tạo file `ui_telegram_scanner.py` hoàn toàn độc lập
- Không phụ thuộc vào `engine.py`
- Tạo fresh TelegramClient trong current event loop mỗi lần
- **Kết quả**: Vẫn còn lỗi

### 3. Xóa session file
- Xóa `telegram_scanner_session.session` để tránh conflict
- **Kết quả**: Vẫn còn lỗi

## Trạng thái hiện tại
- ✅ Server khởi động thành công
- ✅ API test hoạt động
- ✅ API auth/status hoạt động
- ❌ API auth/send-code vẫn bị lỗi asyncio
- ✅ Logging chi tiết đã được thêm

## Files đã tạo/sửa
1. `ui_server.py` - Sửa để sử dụng event loop management
2. `ui_telegram_scanner.py` - Scanner độc lập cho UI
3. `test_asyncio_fix_detailed.py` - Test asyncio fix
4. `test_ui_api.py` - Test UI API
5. `run_ui_fixed.bat` - Script chạy UI server fixed

## Vấn đề còn lại
- Lỗi asyncio vẫn xảy ra khi gọi `client.send_code_request()`
- Có thể do Telethon library có vấn đề với Windows ProactorEventLoopPolicy
- Cần thử các giải pháp khác:
  - Sử dụng SelectorEventLoopPolicy thay vì ProactorEventLoopPolicy
  - Chạy TelegramClient trong thread riêng hoàn toàn
  - Sử dụng subprocess để tách biệt hoàn toàn

## Bước tiếp theo
1. Thử SelectorEventLoopPolicy
2. Thử chạy Telegram operations trong subprocess
3. Kiểm tra version của Telethon và asyncio compatibility
4. Có thể cần downgrade hoặc upgrade Telethon version
