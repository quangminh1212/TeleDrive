#!/usr/bin/env python3
"""
Script để bật/tắt dev mode nhanh chóng
"""

import os
import sys
import shutil
from pathlib import Path

def enable_dev_mode():
    """Bật dev mode"""
    print("🔧 Đang bật Dev Mode...")
    
    # Copy .env.dev to .env
    if Path(".env.dev").exists():
        shutil.copy(".env.dev", ".env")
        print("✅ Đã copy .env.dev -> .env")
    else:
        # Tạo .env với DEV_MODE=true
        with open(".env", "w", encoding="utf-8") as f:
            f.write("DEV_MODE=true\n")
        print("✅ Đã tạo .env với DEV_MODE=true")
    
    print("🎉 Dev Mode đã được BẬT!")
    print("   - Không cần đăng nhập")
    print("   - Quyền admin tự động")
    print("   - User: Developer")
    print("   - Khởi động lại ứng dụng để áp dụng")

def disable_dev_mode():
    """Tắt dev mode"""
    print("🔧 Đang tắt Dev Mode...")
    
    if Path(".env").exists():
        # Đọc .env và loại bỏ DEV_MODE
        with open(".env", "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        # Lọc bỏ dòng DEV_MODE
        filtered_lines = [line for line in lines if not line.startswith("DEV_MODE")]
        
        # Ghi lại file
        with open(".env", "w", encoding="utf-8") as f:
            f.writelines(filtered_lines)
        
        print("✅ Đã xóa DEV_MODE khỏi .env")
    
    print("🔒 Dev Mode đã được TẮT!")
    print("   - Yêu cầu đăng nhập")
    print("   - Kiểm tra quyền admin")
    print("   - Xác thực OTP")
    print("   - Khởi động lại ứng dụng để áp dụng")

def check_dev_mode():
    """Kiểm tra trạng thái dev mode"""
    if Path(".env").exists():
        with open(".env", "r", encoding="utf-8") as f:
            content = f.read()
            if "DEV_MODE=true" in content:
                print("🟢 Dev Mode: BẬT")
                return True
    
    print("🔴 Dev Mode: TẮT")
    return False

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("🔧 TeleDrive Dev Mode Manager")
        print()
        print("Cách sử dụng:")
        print("  python dev.py on     # Bật dev mode")
        print("  python dev.py off    # Tắt dev mode")
        print("  python dev.py status # Kiểm tra trạng thái")
        print()
        check_dev_mode()
        return
    
    command = sys.argv[1].lower()
    
    if command in ["on", "enable", "true", "1"]:
        enable_dev_mode()
    elif command in ["off", "disable", "false", "0"]:
        disable_dev_mode()
    elif command in ["status", "check", "info"]:
        check_dev_mode()
    else:
        print(f"❌ Lệnh không hợp lệ: {command}")
        print("Sử dụng: on, off, hoặc status")

if __name__ == "__main__":
    main()
