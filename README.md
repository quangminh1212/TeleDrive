# TeleDrive

TeleDrive là ứng dụng cho phép sử dụng Telegram làm dịch vụ lưu trữ đám mây, tương tự như Google Drive.

## Tính năng

- Đăng nhập bằng Telegram
- Upload file lên Telegram
- Xem và tải xuống file
- Giao diện người dùng thân thiện
- Hỗ trợ dark/light mode
- Responsive design cho mobile
- **Mới**: Tích hợp với Telegram Desktop cho đăng nhập nhanh chóng

## Yêu cầu

- Node.js 16+ hoặc Docker
- Telegram Desktop (tùy chọn, để đăng nhập nhanh)

## Cài đặt và sử dụng

TeleDrive cung cấp một file thực thi duy nhất (`runapp.bat`) để quản lý tất cả các chức năng:

### Hiển thị trợ giúp

```
runapp help
```

### Cài đặt ban đầu

```
runapp setup
```

### Chạy ứng dụng

```
runapp run
```

### Chạy ở chế độ development

```
runapp dev
```

### Sử dụng Docker

```
runapp docker start    # Khởi động container
runapp docker stop     # Dừng container
runapp docker restart  # Khởi động lại container
runapp docker logs     # Xem logs
```

## Cấu hình Telegram API

TeleDrive cung cấp hai phương pháp để kết nối với Telegram:

1. **Sử dụng Telegram API trực tiếp** (được khuyến nghị): Kết nối trực tiếp với tài khoản Telegram của bạn, tự động đồng bộ file
2. **Sử dụng Telegram Bot**: Kết nối thông qua một bot Telegram, yêu cầu ít cấu hình hơn nhưng có một số hạn chế

Bạn cần cập nhật file `.env` với các thông tin liên quan đến phương pháp bạn chọn:

```env
# Phương pháp 1: Sử dụng Telegram API trực tiếp
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890

# Phương pháp 2: Sử dụng Telegram Bot
BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ
TELEGRAM_CHAT_ID=-1001234567890

# Cấu hình chung
USE_TELEGRAM_DESKTOP=true  # Bật tính năng đăng nhập với Telegram Desktop
USE_WEB_CLIENT_UPLOAD=true # Bật tính năng upload qua Web Client
```

## Cách lấy thông tin Telegram API

### Phương pháp 1: Sử dụng Telegram API trực tiếp (Khuyến nghị)

#### 1. Đăng ký và lấy API ID và API Hash:

1. **Truy cập trang đăng ký ứng dụng**:
   - Mở trình duyệt và truy cập: https://my.telegram.org
   - Đăng nhập với số điện thoại Telegram của bạn
   - Bạn sẽ nhận được mã xác nhận trong ứng dụng Telegram, nhập mã này vào trang web

2. **Tạo ứng dụng mới**:
   - Sau khi đăng nhập, chọn "API development tools"
   - Điền thông tin ứng dụng (có thể điền thông tin đơn giản):
     * App title: TeleDrive
     * Short name: teledrive
     * Platform: Desktop
     * Description: Personal file storage application
   - Nhấn "Create application"

3. **Lấy thông tin API**:
   - Sau khi tạo ứng dụng, bạn sẽ thấy thông tin API ID và API Hash
   - **API ID**: Số gồm nhiều chữ số (ví dụ: 1234567)
   - **API Hash**: Chuỗi ký tự dài (ví dụ: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6)

4. **Cập nhật file .env**:
   - Mở file `.env` trong thư mục gốc của ứng dụng
   - Thêm thông tin API ID và API Hash vừa lấy được:
     ```
     TELEGRAM_API_ID=1234567
     TELEGRAM_API_HASH=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
     ```

#### 2. Đăng nhập vào Telegram API:

1. **Khởi động lại ứng dụng**:
   - Khởi động lại server:
     ```
     npm start
     ```

2. **Đăng nhập vào Telegram API trên ứng dụng**:
   - Truy cập ứng dụng tại http://localhost:3000
   - Nhấn vào nút "API Đăng nhập" (sẽ xuất hiện sau khi bạn đã cấu hình API ID và API Hash)
   - Một cửa sổ mới sẽ mở ra để đăng nhập Telegram API

3. **Hoàn thành quy trình đăng nhập Telegram API**:
   - Nhập số điện thoại Telegram của bạn (bao gồm mã quốc gia, không có số 0 đầu)
   - Nhấn "Gửi mã xác nhận"
   - Kiểm tra ứng dụng Telegram trên điện thoại để lấy mã xác nhận
   - Nhập mã xác nhận vào cửa sổ đăng nhập
   - Nếu tài khoản của bạn có bảo mật hai lớp, bạn cần nhập mật khẩu hai lớp

### Phương pháp 2: Sử dụng Telegram Bot

#### 1. Tạo Bot Telegram và lấy Bot Token:

1. **Tạo Bot mới**:
   - Mở Telegram và tìm kiếm [@BotFather](https://t.me/BotFather)
   - Gửi lệnh `/newbot`
   - Nhập tên hiển thị cho bot (ví dụ: TeleDrive Bot)
   - Nhập username cho bot (phải kết thúc bằng "bot", ví dụ: teledrive_bot)

2. **Lấy Bot Token**:
   - BotFather sẽ gửi cho bạn một token dài (VD: `123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ`)
   - Copy token và thêm vào file `.env`:
     ```
     BOT_TOKEN=123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ
     ```

#### 2. Lấy Chat/Channel ID và thêm Bot vào chat:

##### Tạo channel hoặc group trên Telegram:
1. Tạo một group hoặc channel riêng tư trên Telegram để lưu trữ file

##### Lấy Chat/Channel ID (chọn một trong các cách sau):

**Cách 1: Sử dụng bot @username_to_id_bot**
1. Tìm và chat với bot [@username_to_id_bot](https://t.me/username_to_id_bot) trên Telegram
2. Chuyển tiếp (forward) một tin nhắn từ channel/group của bạn tới bot này
3. Bot sẽ cho bạn ID của channel/group

**Cách 2: Sử dụng bot @RawDataBot**
1. Thêm [@RawDataBot](https://t.me/RawDataBot) vào group/channel của bạn
2. Bot sẽ hiển thị thông tin chi tiết, bao gồm "chat": {"id": XXXX}
3. Ghi nhớ số ID (có thể là số âm nếu là group/channel)
4. Xóa bot khỏi nhóm sau khi lấy được ID

**Cách 3: Từ Telegram Web**
1. Mở [Telegram Web](https://web.telegram.org)
2. Mở group/channel cần lấy ID
3. URL sẽ có dạng: `https://web.telegram.org/a/#-1234567890`
4. Số sau dấu # chính là ID (-1234567890)

##### Thêm Bot vào Channel/Group:

**Thêm vào Group:**
1. Mở group trên Telegram
2. Nhấn vào tên group ở trên cùng để mở thông tin
3. Chọn "Add members" hoặc "Add participant"
4. Tìm kiếm tên bot của bạn và thêm vào

**Thêm vào Channel:**
1. Mở channel trên Telegram
2. Nhấn vào tên channel ở trên cùng
3. Chọn "Administrators"
4. Nhấn "Add Admin"
5. Tìm kiếm tên bot của bạn và thêm vào

##### Cập nhật file .env với Chat ID:
```
TELEGRAM_CHAT_ID=-1001234567890  # Thay bằng ID bạn vừa lấy được
```

## Đăng nhập Telegram

### Cách 1: Đăng nhập thủ công
Khi chạy ứng dụng lần đầu, bạn sẽ được yêu cầu nhập số điện thoại và mã xác thực để đăng nhập vào Telegram.

### Cách 2: Đăng nhập tự động với Telegram Desktop
TeleDrive có thể sử dụng Telegram Desktop đã đăng nhập sẵn để tăng tốc quá trình đăng nhập:

1. Đảm bảo Telegram Desktop đã được cài đặt và đăng nhập trên máy tính của bạn
2. Mở file `.env` và thêm các dòng sau:
   ```
   USE_TELEGRAM_DESKTOP=true
   # TELEGRAM_DESKTOP_PATH= (tùy chọn, để trống để tự động phát hiện)
   ```
3. Khi chạy TeleDrive, ứng dụng sẽ tự động phát hiện và sử dụng tài khoản Telegram Desktop.

## Cấu trúc thư mục tinh gọn

```
TeleDrive/
├── public/              # Static files
│   ├── css/             # CSS styles
│   ├── js/              # JavaScript files
│   └── index.html       # Main HTML file
├── src/                 # Mã nguồn
├── uploads/             # Temporary uploads directory (tự động tạo)
├── .env                 # Cấu hình môi trường
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
├── server.js            # Node.js server
├── package.json         # Dependencies and scripts
└── runapp.bat           # Main executable script (duy nhất)
```

## Lưu ý quan trọng

1. **Bảo mật thông tin API**: Không chia sẻ API ID, API Hash hoặc Bot Token với người khác
2. **Phiên đăng nhập**: Sau khi đăng nhập thành công, phiên làm việc sẽ được lưu trong thư mục `.telegram-sessions`
3. **Tần suất đăng nhập**: Bạn chỉ cần đăng nhập một lần, trừ khi bạn xóa thư mục `.telegram-sessions` hoặc đăng xuất
4. **Dịch vụ miễn phí**: Việc sử dụng Telegram API là miễn phí và không ảnh hưởng đến tài khoản Telegram của bạn
5. **Quyền Bot**: Đảm bảo bot có quyền gửi tin nhắn trong group/channel nếu bạn sử dụng phương pháp Bot

## Đóng góp

Các pull request được chào đón. Đối với những thay đổi lớn, vui lòng mở issue trước để thảo luận về những gì bạn muốn thay đổi.

## License

[MIT](https://choosealicense.com/licenses/mit/)