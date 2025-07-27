# TeleDrive - Hướng dẫn sử dụng

![TeleDrive Logo](../static/images/logo.png)

> **TeleDrive** - Quản lý file Telegram với giao diện Google Drive.

## 📋 Mục lục

- [Giới thiệu](#giới-thiệu)
- [Cài đặt](#cài-đặt)
- [Đăng nhập](#đăng-nhập)
- [Quét file Telegram](#quét-file-telegram)
- [Quản lý file](#quản-lý-file)
- [Tải xuống và xem trước](#tải-xuống-và-xem-trước)
- [Tìm kiếm file](#tìm-kiếm-file)
- [Phần quản trị](#phần-quản-trị)
- [Câu hỏi thường gặp](#câu-hỏi-thường-gặp)
- [Xử lý sự cố](#xử-lý-sự-cố)

## 📚 Giới thiệu

TeleDrive là ứng dụng web cho phép bạn quản lý các file từ Telegram với giao diện giống Google Drive. Các tính năng chính:

- 🔍 **Tìm kiếm mạnh mẽ**: Tìm nhanh file trong các kênh Telegram
- 👁️ **Xem trước file**: Xem trước hình ảnh, video, văn bản, PDF
- 📱 **Tương thích di động**: Thiết kế responsive, hoạt động tốt trên mọi thiết bị
- 🔐 **Bảo mật**: Xác thực OTP, bảo vệ dữ liệu

## 🛠️ Cài đặt

### Yêu cầu hệ thống

- Python 3.8 trở lên
- Tài khoản Telegram và API credentials
- Trình duyệt hiện đại (Chrome, Firefox, Edge, Safari)

### Cài đặt từ mã nguồn

1. Clone repository:
   ```bash
   git clone https://github.com/quangminh1212/TeleDrive.git
   cd TeleDrive
   ```

2. Tạo và kích hoạt môi trường ảo:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. Cài đặt các phụ thuộc:
   ```bash
   pip install -r requirements.txt
   ```

4. Sao chép file cấu hình mẫu:
   ```bash
   cp .env-example .env
   ```

5. Chỉnh sửa file `.env` để thiết lập các thông số:
   - `TELEGRAM_API_ID`: API ID từ my.telegram.org
   - `TELEGRAM_API_HASH`: API Hash từ my.telegram.org
   - `SECRET_KEY`: Khóa bí mật cho ứng dụng

6. Khởi động ứng dụng:
   ```bash
   python main.py
   ```

7. Truy cập ứng dụng tại `http://localhost:3000`

## 🔐 Đăng nhập

Bạn cần đăng nhập để truy cập TeleDrive. Ứng dụng hỗ trợ xác thực qua OTP (One-time Password) gửi qua Telegram.

### Quy trình đăng nhập

1. Truy cập trang đăng nhập tại `http://localhost:3000/login`
2. Nhập số điện thoại đã đăng ký với Telegram của bạn (định dạng: +84XXXXXXXXX)
3. Nhấn "Gửi mã OTP"
4. Kiểm tra tin nhắn trên Telegram, bạn sẽ nhận được mã OTP
5. Nhập mã OTP vào form và nhấn "Xác nhận"

### Thiết lập lần đầu

Khi lần đầu tiên chạy TeleDrive, bạn sẽ được chuyển hướng tới trang thiết lập:

1. Nhập thông tin tài khoản quản trị
2. Thiết lập thông số Telegram API
3. Cấu hình các tùy chọn hệ thống

## 📂 Quét file Telegram

### Quét kênh và nhóm

1. Từ dashboard, nhấn vào nút "Quét Telegram" trong menu bên trái
2. Chọn một trong các tùy chọn:
   - **Quét kênh công khai**: Nhập username kênh (vd: @example)
   - **Quét kênh riêng tư**: Dán link mời từ kênh
   - **Quét tin nhắn cá nhân**: Chọn "Tin nhắn của tôi"

3. Thiết lập các tùy chọn quét:
   - **Giới hạn tin nhắn**: Số lượng tin nhắn tối đa cần quét
   - **Loại file**: Chọn các loại file cần quét (Hình ảnh, Tài liệu, Video, v.v.)
   - **Khoảng thời gian**: Giới hạn thời gian quét (Tùy chọn)

4. Nhấn "Bắt đầu quét" và đợi quá trình hoàn tất

### Kết quả quét

Sau khi quá trình quét hoàn tất, bạn sẽ thấy:

- Tổng số file đã quét
- Phân loại file theo loại
- Tổng dung lượng file
- Biểu đồ phân tích

Kết quả quét được lưu lại như một "Phiên quét" và có thể truy cập lại bất cứ lúc nào.

## 📁 Quản lý file

### Xem file

- **Chế độ lưới (mặc định)**: Hiển thị file dưới dạng lưới với hình thu nhỏ
- **Chế độ danh sách**: Hiển thị thông tin chi tiết về mỗi file

### Sắp xếp file

Nhấn vào tiêu đề cột hoặc sử dụng menu sắp xếp để sắp xếp theo:
- Tên file
- Kích thước
- Ngày sửa đổi
- Loại file

### Lọc file

Sử dụng thanh bên để lọc file theo:
- Loại file (Hình ảnh, Video, Tài liệu, v.v.)
- Ngày (Hôm nay, Tuần này, Tháng này)
- Kích thước (Nhỏ, Vừa, Lớn)

### Thao tác với file

Nhấn chuột phải vào một file hoặc sử dụng menu tùy chọn để:
- Tải xuống
- Xem trước
- Chia sẻ link
- Sao chép link

## 🖼️ Tải xuống và xem trước

### Xem trước file

TeleDrive hỗ trợ xem trước nhiều định dạng file:

- **Hình ảnh**: Xem trực tiếp trong trình duyệt
- **Video**: Phát video trực tiếp
- **PDF**: Xem PDF trực tiếp
- **Văn bản**: Xem nội dung văn bản
- **Audio**: Phát âm thanh trực tiếp

Để xem trước một file, nhấp vào biểu tượng "Xem trước" hoặc nhấp đúp vào file.

### Tải xuống file

Có nhiều cách để tải xuống file:

1. Nhấp vào biểu tượng "Tải xuống" bên cạnh file
2. Nhấp chuột phải vào file và chọn "Tải xuống"
3. Trong chế độ xem trước, nhấn nút "Tải xuống" ở góc trên bên phải

### Link chia sẻ

Để tạo link chia sẻ:
1. Nhấp chuột phải vào file
2. Chọn "Tạo link chia sẻ"
3. Chọn tùy chọn chia sẻ (Công khai hoặc Có mật khẩu)
4. Sao chép link được tạo

## 🔍 Tìm kiếm file

### Tìm kiếm cơ bản

1. Nhập từ khóa vào ô tìm kiếm ở đầu trang
2. Nhấn Enter hoặc nhấp vào biểu tượng kính lúp
3. Kết quả sẽ hiển thị phù hợp với từ khóa

### Tìm kiếm nâng cao

Nhấp vào "Tìm kiếm nâng cao" để mở tùy chọn tìm kiếm chi tiết:

- **Loại file**: Chọn một hoặc nhiều loại file
- **Khoảng thời gian**: Chọn khoảng thời gian
- **Kích thước**: Chọn khoảng kích thước file
- **Phiên quét**: Chọn phiên quét cụ thể
- **Từ khóa loại trừ**: Loại trừ kết quả có chứa từ khóa này

## 🛠️ Phần quản trị

Chỉ tài khoản admin mới có thể truy cập phần quản trị.

### Quản lý người dùng

1. Truy cập "Quản trị > Người dùng"
2. Xem danh sách người dùng
3. Thao tác:
   - Thêm người dùng mới
   - Chỉnh sửa thông tin
   - Vô hiệu hóa tài khoản
   - Đặt lại mật khẩu

### Cài đặt hệ thống

Truy cập "Quản trị > Cài đặt" để quản lý:

- Cài đặt Telegram API
- Cài đặt bảo mật
- Tùy chọn quét và lưu trữ
- Tùy chọn hiệu suất

### Nhật ký hệ thống

Truy cập "Quản trị > Nhật ký" để xem:

- Lịch sử đăng nhập
- Hoạt động quét
- Cảnh báo bảo mật
- Lỗi hệ thống

## ❓ Câu hỏi thường gặp

**Q: Làm thế nào để thêm nhiều tài khoản Telegram?**
A: Hiện tại TeleDrive hỗ trợ một tài khoản Telegram mỗi lần. Bạn có thể đăng xuất và đăng nhập với tài khoản khác.

**Q: TeleDrive có lưu trữ file từ Telegram không?**
A: TeleDrive không lưu trữ các file mà chỉ quản lý metadata và liên kết. File vẫn được lưu trữ trên Telegram.

**Q: Tôi có thể quét các kênh mà tôi không phải là thành viên không?**
A: Không, bạn chỉ có thể quét các kênh mà tài khoản Telegram của bạn đã tham gia.

**Q: Có giới hạn kích thước file không?**
A: Giới hạn kích thước file tuân theo quy định của Telegram, hiện là 2GB mỗi file.

**Q: Dữ liệu được lưu ở đâu?**
A: Metadata file được lưu trong cơ sở dữ liệu của TeleDrive. File gốc vẫn nằm trên máy chủ Telegram.

## 🔧 Xử lý sự cố

### Sự cố đăng nhập

- **Không nhận được OTP**: Kiểm tra kết nối internet và xác nhận số điện thoại Telegram
- **Lỗi xác thực**: Đảm bảo API credentials chính xác trong file .env

### Lỗi khi quét

- **Lỗi kết nối**: Kiểm tra kết nối internet và cấu hình API Telegram
- **Quá trình quét bị gián đoạn**: Có thể do giới hạn của Telegram, thử giảm số lượng tin nhắn cần quét

### Vấn đề về hiệu suất

- **Tải trang chậm**: Giảm số lượng file hiển thị mỗi trang
- **Tìm kiếm chậm**: Sử dụng bộ lọc để thu hẹp phạm vi tìm kiếm

### Liên hệ hỗ trợ

Nếu bạn gặp sự cố không thể giải quyết, vui lòng liên hệ:
- **Email hỗ trợ**: support@teledrive.com
- **Telegram**: @TeleDriveSupport
- **GitHub Issues**: https://github.com/quangminh1212/TeleDrive/issues

---

*Tài liệu này được cập nhật lần cuối vào Tháng 1, 2024.* 