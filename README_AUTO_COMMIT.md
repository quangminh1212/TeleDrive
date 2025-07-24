# Tự động Commit

Đây là bộ script giúp tự động commit thay đổi trong dự án TeleDrive mà không cần phải thực hiện thủ công.

## Các file

1. **ac.ps1** - Script chính để theo dõi và tự động commit thay đổi
2. **start.bat** - Khởi động script tự động commit trong background
3. **stop.bat** - Dừng quá trình tự động commit
4. **setup.bat** - Thiết lập cấu hình Git (tên người dùng và email)

## Cách sử dụng

### Thiết lập ban đầu

1. Chạy file `setup.bat`
2. Nhập tên người dùng và email Git

### Bắt đầu tự động commit

1. Chạy file `start.bat`
2. Script sẽ chạy trong background và tự động commit khi phát hiện thay đổi

### Dừng tự động commit

1. Chạy file `stop.bat`

## Chi tiết

- Script kiểm tra thay đổi mỗi 30 giây
- Tự động commit sau ít nhất 1 phút kể từ lần commit trước
- Mỗi commit bao gồm thời gian và danh sách file thay đổi
- Hoạt động được ghi trong `auto_commit_log.txt`

## Lưu ý

- Yêu cầu Git được cài đặt trên hệ thống
- Mặc định chỉ commit mà không push 