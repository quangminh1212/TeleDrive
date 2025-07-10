# Hướng dẫn đóng góp cho TeleDrive

Cảm ơn bạn đã quan tâm đến việc đóng góp cho dự án TeleDrive! Đây là hướng dẫn giúp bạn có thể đóng góp một cách hiệu quả nhất.

## Quy trình đóng góp

1. Fork repository
2. Tạo branch mới cho tính năng/sửa lỗi của bạn (`git checkout -b feature/amazing-feature`)
3. Commit các thay đổi (`git commit -m 'Thêm tính năng tuyệt vời'`)
4. Push đến branch (`git push origin feature/amazing-feature`)
5. Mở Pull Request

## Tiêu chuẩn mã nguồn

- Đảm bảo mã nguồn của bạn tuân theo tiêu chuẩn định dạng của dự án
- Sử dụng TypeScript với kiểu dữ liệu rõ ràng
- Viết test cho các tính năng mới (nếu có thể)
- Đảm bảo tất cả các test đều pass
- Tự review code của bạn trước khi gửi PR

## Báo lỗi

Khi báo cáo lỗi, vui lòng cung cấp:

- Mô tả chi tiết về lỗi
- Các bước để tái tạo lỗi
- Môi trường phát triển của bạn (hệ điều hành, phiên bản Node.js, v.v.)
- Screenshot nếu có thể

## Đề xuất tính năng mới

Khi đề xuất tính năng mới:

- Mô tả tính năng một cách chi tiết
- Giải thích lý do tại sao tính năng này nên được thêm vào
- Đề xuất cách thực hiện nếu có thể

## Nguyên tắc ứng xử

- Tôn trọng những người đóng góp khác
- Chấp nhận các phản hồi và góp ý một cách xây dựng
- Tập trung vào vấn đề, không phải người

## Cấu trúc dự án

```
teledrive/
  ├── src/
  │   ├── config/          # Cấu hình ứng dụng
  │   ├── controllers/     # Xử lý request/response
  │   ├── middleware/      # Middleware Express
  │   ├── models/          # MongoDB models
  │   ├── routes/          # API routes
  │   ├── services/        # Business logic
  │   ├── utils/           # Utility functions
  │   └── index.ts         # Entry point
  ├── uploads/             # Thư mục tạm cho file upload
  ├── logs/                # Log files
  ├── tests/               # Unit tests
  ├── .env                 # Environment variables
  ├── package.json         # Dependencies
  └── tsconfig.json        # TypeScript config
```

## Các lĩnh vực đóng góp

Chúng tôi đặc biệt chào đón các đóng góp trong các lĩnh vực sau:

- Tối ưu hóa hiệu suất
- Cải thiện bảo mật
- Thêm các tính năng mới
- Fix bug
- Viết tài liệu và hướng dẫn
- Cải thiện UX/UI

## Liên hệ

Nếu bạn có thắc mắc, vui lòng liên hệ chúng tôi qua [email] hoặc [issue tracker]. 