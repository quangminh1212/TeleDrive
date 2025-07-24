# Hệ thống tự động commit đơn giản cho TeleDrive

Đây là bộ script giúp tự động commit thay đổi trong dự án TeleDrive một cách đơn giản và ổn định.

## Các file trong bộ công cụ

1. **SimpleAutoCommit.ps1** - Script PowerShell chính để theo dõi và tự động commit thay đổi
2. **StartSimpleAutoCommit.bat** - File batch để khởi động script tự động commit trong background
3. **StopSimpleAutoCommit.bat** - File batch để dừng quá trình tự động commit

## Cách sử dụng

### Bắt đầu tự động commit

Để bắt đầu quá trình tự động commit:

1. Chạy file `StartSimpleAutoCommit.bat` bằng cách nhấp đúp vào nó
2. Script sẽ chạy trong background và tự động commit mỗi khi phát hiện thay đổi

### Dừng tự động commit

Khi bạn muốn dừng quá trình tự động commit:

1. Chạy file `StopSimpleAutoCommit.bat`
2. Tất cả các tiến trình tự động commit sẽ được dừng lại

## Chi tiết hoạt động

- Script kiểm tra thay đổi trong dự án mỗi 30 giây
- Nếu có thay đổi, script sẽ tự động commit ngay lập tức
- Mỗi commit sẽ bao gồm thời gian
- Tất cả hoạt động được ghi lại trong file `auto_commit_log.txt`

## Lưu ý

- Script yêu cầu Git được cài đặt trên hệ thống
- Script sẽ chỉ commit mà không push lên remote repository
- Để tự động push, bạn cần chỉnh sửa file `SimpleAutoCommit.ps1` 