# TeleDrive - Test Case Checklist

## 1. Cấu hình & Khởi tạo
- [ ] Đọc config từ config.json, .env, validate giá trị hợp lệ
- [ ] Sync .env sang config.json, kiểm tra lỗi thiếu trường, sai format
- [ ] Lưu config, kiểm tra lỗi ghi file, quyền ghi
- [ ] Khởi tạo logging chi tiết, kiểm tra file log tạo đúng

## 2. Database & Model
- [ ] Kết nối database, tạo bảng, kiểm tra lỗi kết nối
- [ ] Tạo user, file, folder, scan session, share link
- [ ] Kiểm tra unique, nullable, default value các trường
- [ ] Backup, restore database, kiểm tra integrity
- [ ] Migration từ JSON/CSV sang database
- [ ] Thống kê số lượng bản ghi, kiểm tra size, last modified

## 3. Authentication & Permission
- [ ] Đăng ký user mới, kiểm tra validate username, email, password
- [ ] Đăng nhập, kiểm tra session, remember me, sai mật khẩu
- [ ] Đổi mật khẩu, kiểm tra xác nhận, validate độ mạnh
- [ ] Quên mật khẩu, gửi email reset, token hợp lệ/hết hạn
- [ ] Phân quyền: admin, user, guest, kiểm tra truy cập route
- [ ] Đăng xuất, kiểm tra session bị xóa

## 4. API & Route Backend
- [ ] / (dashboard): trả về 200, require login
- [ ] /settings: trả về 200, require login
- [ ] /scan: trả về 200, require login
- [ ] /search: trả về 200, require login
- [ ] /api/save_settings: POST, lưu config, trả về success/error
- [ ] /api/start_scan: POST, bắt đầu scan, trả về progress
- [ ] /api/stop_scan: POST, dừng scan, kiểm tra trạng thái
- [ ] /api/get_files: GET, trả về danh sách file
- [ ] /download/<filename>: tải file, kiểm tra quyền, file tồn tại
- [ ] /api/delete_file: POST, xóa file, kiểm tra quyền, file không tồn tại
- [ ] /api/files/<id>/rename: POST, đổi tên file, validate tên
- [ ] /api/files/<id>/tags: POST, cập nhật tag, validate tag
- [ ] /api/files/<id>/move: POST, di chuyển file, kiểm tra folder đích
- [ ] /api/files/bulk: POST, thao tác bulk, kiểm tra nhiều file
- [ ] /api/upload: POST, upload file, kiểm tra size, loại file
- [ ] /api/search: GET, tìm kiếm file, kiểm tra filter, sort
- [ ] /api/search/suggestions: GET, gợi ý tìm kiếm
- [ ] /api/folders: GET/POST/DELETE, tạo/xóa folder, validate tên, quyền
- [ ] /login, /register, /logout, /profile, /change_password: kiểm tra flow auth
- [ ] /api/files/<id>/share: POST, tạo link chia sẻ, kiểm tra quyền, password
- [ ] /api/files/<id>/shares: GET, lấy danh sách share link
- [ ] /api/shares/<id>: DELETE, xóa share link
- [ ] /share/<token>: truy cập file chia sẻ, kiểm tra password, expire
- [ ] /share/<token>/download: tải file chia sẻ, kiểm tra quyền, giới hạn

## 5. Scan Engine & Telegram
- [ ] Khởi tạo Telegram client, kiểm tra API_ID, API_HASH, PHONE
- [ ] Scan public channel, kiểm tra lấy entity, quét file
- [ ] Scan private channel, join bằng invite link, kiểm tra quyền
- [ ] Lưu metadata file, kiểm tra các trường: tên, size, type, date
- [ ] Lưu kết quả ra output, kiểm tra format JSON, CSV, Excel
- [ ] Xử lý lỗi Telegram: rate limit, invalid session, expired link
- [ ] Đóng client, kiểm tra cleanup session

## 6. Frontend (JS/UI)
- [ ] Load dashboard, kiểm tra hiển thị file, folder, stats
- [ ] Tìm kiếm realtime, kiểm tra debounce, filter, sort
- [ ] Upload file, kiểm tra drag & drop, size, loại file, lỗi upload
- [ ] Preview file: image, video, audio, PDF, text, JSON, CSV, Excel
- [ ] Xóa, đổi tên, di chuyển, tag file từ UI, kiểm tra cập nhật realtime
- [ ] Bulk select, thao tác nhiều file, kiểm tra trạng thái
- [ ] Tạo, đổi tên, xóa folder từ UI, kiểm tra breadcrumb
- [ ] Chia sẻ file, tạo link, copy, kiểm tra truy cập link
- [ ] Đăng nhập, đăng ký, đổi mật khẩu từ UI, kiểm tra validate
- [ ] Thông báo lỗi, toast, loading, progress bar
- [ ] Responsive: kiểm tra trên mobile, tablet, desktop
- [ ] Đổi theme, kiểm tra dark/light mode

## 7. Logging & Error Handling
- [ ] Ghi log chi tiết từng bước, kiểm tra file log tạo đúng
- [ ] Log API call, thao tác file, thay đổi config, lỗi hệ thống
- [ ] Log error, kiểm tra trace, context, phân loại log
- [ ] Log realtime qua WebSocket, kiểm tra hiển thị UI

## 8. Security & Edge Case
- [ ] SQL injection, XSS, CSRF, kiểm tra input, form, API
- [ ] Truy cập route không đủ quyền, kiểm tra redirect/login
- [ ] Upload file độc hại, kiểm tra validate, từ chối file lạ
- [ ] Đổi mật khẩu yếu, kiểm tra validate, từ chối
- [ ] Truy cập file/folder đã xóa, kiểm tra lỗi trả về
- [ ] Truy cập link chia sẻ hết hạn, vượt giới hạn download/view
- [ ] Thử brute-force password link chia sẻ, kiểm tra lock
- [ ] Lỗi kết nối Telegram, database, kiểm tra thông báo rõ ràng

## 9. CLI & Batch Script
- [ ] Chạy setup.bat, kiểm tra cài đặt dependencies
- [ ] Chạy config.bat, kiểm tra menu, sync, validate config
- [ ] Chạy run.bat, kiểm tra workflow tự động, validate config trước khi scan
- [ ] Chạy main.py, kiểm tra quét private channel, join link, scan, lưu output
- [ ] Kiểm tra output file: JSON, CSV, Excel, simple JSON

## 10. Khác
- [ ] Kiểm tra backup, restore, repair database từ script
- [ ] Kiểm tra migration dữ liệu cũ sang database
- [ ] Kiểm tra các trường hợp lỗi hiếm gặp, exception không mong muốn
- [ ] Kiểm tra hiệu năng: scan nhiều file, upload/download lớn
- [ ] Kiểm tra tài liệu hướng dẫn, README, cấu hình mẫu

---

*Có thể dùng checklist này để viết test tự động (pytest, Selenium, Postman...) hoặc kiểm thử thủ công từng chức năng.* 