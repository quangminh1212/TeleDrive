# TeleDrive - Trình quản lý file Telegram

Ứng dụng đơn giản giúp liệt kê và tải file từ các nhóm/kênh Telegram.

## Cài đặt

1. Cài đặt các thư viện cần thiết:
```
pip install -r requirements.txt
```

2. Chạy ứng dụng:
   - Phiên bản dòng lệnh:
   ```
   python teledrive.py
   ```
   - Phiên bản giao diện đồ họa (khuyên dùng):
   ```
   python teledrive_gui.py
   ```

## Hướng dẫn sử dụng

1. Khi chạy lần đầu, bạn sẽ được yêu cầu nhập số điện thoại để đăng nhập vào tài khoản Telegram.
2. Nhập mã xác minh được gửi đến Telegram của bạn.
3. Sau khi đăng nhập, bạn có thể nhập username hoặc ID của nhóm/kênh Telegram.
4. Ứng dụng sẽ liệt kê tất cả các file có trong nhóm/kênh đó.
5. Bạn có thể chọn file để tải về máy.

## Lưu ý

- Bạn cần là thành viên của nhóm/kênh để có thể xem và tải file.
- Link tải trực tiếp yêu cầu đăng nhập vào Telegram.
- Ứng dụng sử dụng API ID và API Hash từ file `config.py`.

## Lấy ID của nhóm/kênh

### Đối với kênh công khai:
- Bạn có thể sử dụng username (ví dụ: @tenchannel)
- Nhớ nhập kèm dấu @ phía trước

### Đối với kênh riêng tư:
1. **Cách 1:** Chuyển tiếp một tin nhắn từ nhóm đó đến @userinfobot
   - Bot sẽ trả về ID của kênh (dạng -1001234567890)
   - Sao chép toàn bộ ID này (bao gồm cả dấu trừ) để sử dụng trong ứng dụng

2. **Cách 2:** Thông qua Telegram Web
   - Mở kênh trong [Telegram Web](https://web.telegram.org)
   - URL sẽ có dạng: web.telegram.org/a/#-1001234567890
   - Lấy số sau dấu #

> **Quan trọng:** Tài khoản Telegram của bạn PHẢI là thành viên của kênh riêng tư để có thể truy cập file!

Chi tiết hơn có thể xem trong tập tin `private_channel_guide.md` 