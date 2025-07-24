# TeleDrive - Tài liệu hệ thống thiết kế

## Giới thiệu

Đây là hướng dẫn về hệ thống thiết kế mới của TeleDrive, được cập nhật để mang lại giao diện tinh tế, hiện đại và dễ sử dụng hơn. Hệ thống được thiết kế theo triết lý "tối giản" với bảng màu hạn chế, khoảng cách nhất quán và trải nghiệm người dùng đồng bộ trên các thiết bị.

## Tính năng chính

- **Thiết kế tinh tế, ít màu sắc**: Sử dụng bảng màu đơn giản, tập trung vào trải nghiệm người dùng
- **Chế độ tối (Dark Mode)**: Hỗ trợ cả chế độ sáng và tối, tự động phát hiện thiết lập hệ thống
- **Responsive**: Tối ưu hóa cho mọi loại thiết bị từ điện thoại đến máy tính để bàn
- **Hệ thống Typography**: Font Inter hiện đại, dễ đọc với hệ thống kích thước nhất quán
- **Hệ thống Spacing**: Khoảng cách dựa trên đơn vị 0.25rem (4px) để đảm bảo giao diện nhất quán

## Cấu trúc CSS

```
static/css/
├── components/              # Các thành phần CSS riêng biệt
│   ├── file-display.css     # Hiển thị file và thư mục
│   ├── layout.css           # Bố cục chung
│   ├── responsive.css       # Responsive design
│   ├── spacing.css          # Hệ thống khoảng cách
│   ├── typography.css       # Hệ thống chữ
│   └── ui-elements.css      # Các thành phần UI
├── gdrive.css               # CSS cũ để tương thích
├── main.css                 # File import chính
├── mobile.css               # CSS cũ cho thiết bị di động
└── modern-theme.css         # Theme mới với các biến CSS
```

## Bảng màu

Bảng màu được thiết kế để đơn giản và nhất quán:

- **Màu chính**: `--primary: #4361ee` - Màu xanh dương chủ đạo
- **Màu nền**: `--bg-main: #ffffff` (Sáng) / `--bg-main: #0f172a` (Tối)
- **Màu chữ**: `--text-primary: #1e293b` (Sáng) / `--text-primary: #f1f5f9` (Tối)
- **Màu phụ**: `--text-secondary: #64748b` (Sáng) / `--text-secondary: #cbd5e1` (Tối)

## Hệ thống Typography

- Font chính: `Inter` (Google Fonts)
- Font dự phòng: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Kích thước cơ bản: 16px (1rem)
- Tỷ lệ tương phản: 1.2 (Minor Third)

## Hệ thống khoảng cách

Sử dụng đơn vị khoảng cách 0.25rem (4px) và nhân lên:

- `--space-1`: 0.25rem (4px)
- `--space-2`: 0.5rem (8px)
- `--space-4`: 1rem (16px)
- `--space-8`: 2rem (32px)
- Và còn nhiều giá trị khác...

## Responsive Breakpoints

- **xs**: < 576px (Điện thoại di động)
- **sm**: >= 576px (Điện thoại lớn)
- **md**: >= 768px (Máy tính bảng)
- **lg**: >= 992px (Laptop)
- **xl**: >= 1200px (Desktop)
- **xxl**: >= 1400px (Desktop lớn)

## Cách sử dụng

### 1. Chế độ tối (Dark Mode)

Dark Mode được kích hoạt bằng cách thêm class `dark-theme` vào thẻ `<body>`. Người dùng có thể bật/tắt bằng nút ở góc trên bên phải.

```html
<body class="dark-theme">
```

### 2. Typography

```html
<h1>Tiêu đề chính</h1>
<p class="text-lg">Đoạn văn bản lớn</p>
<p>Đoạn văn bản bình thường</p>
<p class="text-sm">Đoạn văn bản nhỏ</p>
```

### 3. Khoảng cách

```html
<div class="mb-4">Có margin bottom 1rem</div>
<div class="p-3">Có padding 0.75rem</div>
<div class="mt-2 pb-3">Có margin top 0.5rem và padding bottom 0.75rem</div>
```

### 4. Responsive

```html
<div class="d-none d-md-block">Chỉ hiển thị trên màn hình >= 768px</div>
<div class="d-md-none">Chỉ hiển thị trên màn hình < 768px</div>
```

## Tổng kết

Hệ thống thiết kế mới của TeleDrive được thiết kế để đơn giản, nhất quán và dễ bảo trì. Việc sử dụng các biến CSS cho phép dễ dàng thay đổi và mở rộng trong tương lai. 