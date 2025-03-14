#!/bin/bash

# TeleDrive - Script chạy ứng dụng
# Phiên bản tối ưu

# Kiểm tra Node.js
echo "Đang kiểm tra Node.js..."
if ! command -v node &> /dev/null; then
  echo "[LỖI] Node.js chưa được cài đặt!"
  echo "Vui lòng cài đặt Node.js từ https://nodejs.org/"
  exit 1
fi

# Kiểm tra các gói npm
if [ ! -d "node_modules" ]; then
  echo "Đang cài đặt các gói phụ thuộc..."
  npm install
  if [ $? -ne 0 ]; then
    echo "[LỖI] Không thể cài đặt các gói phụ thuộc!"
    exit 1
  fi
fi

# Kiểm tra file .env
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "Đang tạo file .env từ .env.example..."
    cp .env.example .env
    echo "[CẢNH BÁO] Vui lòng chỉnh sửa file .env để cấu hình BOT_TOKEN."
  else
    echo "[LỖI] Không tìm thấy file .env hoặc .env.example!"
    echo "Vui lòng tạo file .env với nội dung:"
    echo "BOT_TOKEN=your_telegram_bot_token"
    echo "PORT=3010"
    echo "MAX_FILE_SIZE=20971520"
    echo "TEMP_DIR=temp"
    echo "DATA_DIR=data"
    exit 1
  fi
fi

# Đảm bảo thư mục tồn tại
mkdir -p uploads temp data logs

echo "==============================="
echo "      TeleDrive - Khởi động"
echo "==============================="
echo ""
echo "1. Chạy TeleDrive với bot"
echo "2. Chạy TeleDrive không có bot"
echo "3. Dọn dẹp uploads (Gửi file lên Telegram)"
echo "4. Chạy với proxy (nếu có vấn đề kết nối)"
echo "5. Thoát"
echo ""

read -p "Chọn một tùy chọn (1-5): " choice

case $choice in
  1)
    clear
    echo "Đang khởi động TeleDrive..."
    node index.js
    ;;
  2)
    clear
    echo "Đang khởi động TeleDrive (không có bot)..."
    node index.js no-bot
    ;;
  3)
    clear
    echo "Đang dọn dẹp uploads..."
    node index.js clean
    ;;
  4)
    clear
    echo "Chọn loại proxy:"
    echo "1. Free Telegram proxy (https://api.telegram.org)"
    echo "2. Nhập địa chỉ proxy tùy chỉnh"
    echo ""
    read -p "Chọn một tùy chọn (1-2): " proxy_choice
    
    if [ "$proxy_choice" == "1" ]; then
      echo "Đang khởi động với proxy mặc định..."
      node index.js --proxy https://api.telegram.org
    elif [ "$proxy_choice" == "2" ]; then
      read -p "Nhập địa chỉ proxy (ví dụ: https://your-proxy.com): " custom_proxy
      echo "Đang khởi động với proxy tùy chỉnh..."
      node index.js --proxy "$custom_proxy"
    else
      echo "Lựa chọn không hợp lệ!"
      sleep 2
      clear
      exec $0
    fi
    ;;
  5)
    exit 0
    ;;
  *)
    echo "Lựa chọn không hợp lệ!"
    sleep 2
    clear
    exec $0
    ;;
esac

read -p "Nhấn Enter để thoát..." 