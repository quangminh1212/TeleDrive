# Hướng dẫn sử dụng TeleDrive với kênh riêng tư (Private Channel)

## Điều kiện tiên quyết
1. Tài khoản Telegram của bạn **PHẢI** là thành viên của kênh riêng tư đó
2. Bạn cần có ID chính xác của kênh riêng tư

## Cách lấy ID của kênh riêng tư

### Cách 1: Sử dụng bot @userinfobot
1. Mở kênh riêng tư trên Telegram
2. Chuyển tiếp (forward) bất kỳ tin nhắn nào từ kênh tới bot [@userinfobot](https://t.me/userinfobot)
3. Bot sẽ trả về thông tin của kênh, bao gồm ID (thường có dạng `-1001234567890`)
4. Sao chép toàn bộ ID này (gồm cả dấu trừ) để sử dụng trong TeleDrive

### Cách 2: Thông qua Telegram Web
1. Đăng nhập vào [Telegram Web](https://web.telegram.org)
2. Mở kênh riêng tư trong trình duyệt
3. Trong thanh địa chỉ, URL sẽ có dạng: `web.telegram.org/a/#-1001234567890`
4. Lấy số sau dấu `#` (bao gồm cả dấu trừ)

### Cách 3: Sử dụng bot @getidsbot
1. Thêm [@getidsbot](https://t.me/getidsbot) vào kênh riêng tư (tạm thời)
2. Bot sẽ tự động hiển thị ID của kênh
3. Sau khi có ID, bạn có thể xóa bot khỏi kênh

## Cách sử dụng ID trong TeleDrive

1. Khởi động TeleDrive bằng lệnh `python teledrive_gui.py` hoặc chạy file `run.bat`
2. Đăng nhập vào tài khoản Telegram (tài khoản này phải là thành viên của kênh riêng tư)
3. Trong ô "Chat/Nhóm/Kênh ID", dán ID đã sao chép ở bước trước (VD: `-1001234567890`)
4. Nhấn "Lấy danh sách" để tải danh sách file từ kênh riêng tư

## Xử lý lỗi thường gặp

1. **Lỗi "Chat không tồn tại"**: 
   - Kiểm tra xem ID kênh đã chính xác chưa
   - Đảm bảo tài khoản của bạn đã tham gia kênh này

2. **Lỗi "Không đủ quyền"**: 
   - Đảm bảo tài khoản của bạn có quyền xem tin nhắn và tệp trong kênh

3. **Không thấy file nào**: 
   - Thử tăng số lượng tin nhắn cần quét (giá trị mặc định là 100)
   - Một số kênh có thể không chia sẻ file mà chỉ chia sẻ link 