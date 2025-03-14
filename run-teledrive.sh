#!/bin/bash

echo "==================================="
echo "=== KHỞI ĐỘNG TELEDRIVE SERVER ==="
echo "==================================="
echo ""

# Kiểm tra xem node đã được cài đặt chưa
if ! command -v node &> /dev/null; then
    echo "[LỖI] Không tìm thấy Node.js! Vui lòng cài đặt Node.js từ https://nodejs.org/"
    echo ""
    exit 1
fi

# Kiểm tra phiên bản node
NODE_VERSION=$(node -v | cut -d '.' -f 1 | cut -d 'v' -f 2)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "[CẢNH BÁO] Phiên bản Node.js quá cũ ($(node -v))"
    echo "Khuyến nghị nâng cấp lên Node.js v14 trở lên."
    echo ""
    read -p "Bạn vẫn muốn tiếp tục? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    echo ""
fi

# Kiểm tra các thư mục cần thiết
[ ! -d "data" ] && mkdir -p data
[ ! -d "uploads" ] && mkdir -p uploads
[ ! -d "logs" ] && mkdir -p logs

# Kiểm tra file .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[THÔNG BÁO] Đang tạo file .env từ .env.example..."
        cp .env.example .env
    else
        echo "[LỖI] Không tìm thấy file .env hoặc .env.example!"
        echo "Vui lòng tạo file .env với nội dung sau:"
        echo ""
        echo "# Token bot Telegram"
        echo "BOT_TOKEN=your_bot_token_here"
        echo ""
        echo "# Port cho web server"
        echo "PORT=3008"
        echo ""
        echo "# Giới hạn kích thước file (bytes, 20MB = 20971520)"
        echo "MAX_FILE_SIZE=20971520"
        echo ""
        exit 1
    fi
fi

# Kiểm tra xem đã cài đặt các gói cần thiết chưa
if [ ! -d "node_modules" ]; then
    echo "[THÔNG BÁO] Đang cài đặt các gói phụ thuộc..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[LỖI] Không thể cài đặt các gói phụ thuộc!"
        exit 1
    fi
    echo "Đã cài đặt các gói phụ thuộc thành công."
    echo ""
fi

# Đồng bộ file trước khi khởi động
echo "[THÔNG BÁO] Đang đồng bộ file từ thư mục uploads..."
node sync-files.js
echo ""

# Khởi động ứng dụng
echo "[THÔNG BÁO] Khởi động TeleDrive server..."
echo ""
echo "Mở trình duyệt và truy cập http://localhost:3008"
echo "Nhấn Ctrl+C để dừng server."
echo ""
node start-app.js 