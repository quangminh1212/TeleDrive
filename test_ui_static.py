#!/usr/bin/env python3
"""
Test script để kiểm tra UI static files
Đảm bảo tất cả CSS, JS, và assets đều load được
"""

import requests
import sys
import time
import subprocess
import threading
from pathlib import Path

def start_server():
    """Khởi động UI server trong background"""
    try:
        process = subprocess.Popen(
            [sys.executable, "ui_server.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=Path.cwd()
        )
        return process
    except Exception as e:
        print(f"❌ Không thể khởi động server: {e}")
        return None

def test_static_files():
    """Test các static files"""
    base_url = "http://127.0.0.1:5003"
    
    # Danh sách files cần test
    test_files = [
        "/",                    # Trang chính
        "/css/style.css",       # CSS file
        "/js/app.js",          # JavaScript file  
        "/assets/logo.png",    # Logo image
    ]
    
    results = {}
    
    print("🔍 Testing static files...")
    print("=" * 50)
    
    for file_path in test_files:
        url = base_url + file_path
        try:
            response = requests.get(url, timeout=5)
            status = response.status_code
            size = len(response.content)
            
            if status == 200:
                print(f"✅ {file_path:<20} - {status} ({size:,} bytes)")
                results[file_path] = "OK"
            else:
                print(f"❌ {file_path:<20} - {status}")
                results[file_path] = f"ERROR {status}"
                
        except requests.exceptions.RequestException as e:
            print(f"❌ {file_path:<20} - Connection Error: {e}")
            results[file_path] = f"CONNECTION ERROR"
    
    return results

def main():
    """Main function"""
    print("🚀 UI STATIC FILES TEST")
    print("=" * 50)
    
    # Khởi động server
    print("🔧 Starting UI server...")
    server_process = start_server()
    
    if not server_process:
        print("❌ Không thể khởi động server!")
        return False
    
    try:
        # Đợi server khởi động
        print("⏳ Waiting for server to start...")
        time.sleep(3)
        
        # Test static files
        results = test_static_files()
        
        # Tổng kết
        print("\n" + "=" * 50)
        print("📊 SUMMARY:")
        
        success_count = sum(1 for result in results.values() if result == "OK")
        total_count = len(results)
        
        if success_count == total_count:
            print(f"🎉 ALL TESTS PASSED! ({success_count}/{total_count})")
            print("✅ UI static files are working correctly")
            return True
        else:
            print(f"⚠️ SOME TESTS FAILED! ({success_count}/{total_count})")
            print("❌ Some static files are not loading properly")
            
            # Chi tiết lỗi
            print("\n🔍 Failed files:")
            for file_path, result in results.items():
                if result != "OK":
                    print(f"   - {file_path}: {result}")
            return False
            
    finally:
        # Dừng server
        print("\n🔧 Stopping server...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
        print("✅ Server stopped")

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
