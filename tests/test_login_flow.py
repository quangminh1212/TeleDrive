#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script để kiểm tra toàn bộ login flow của TeleDrive
"""

import requests
import json
import sys
import time

def test_login_flow():
    """Test toàn bộ quy trình đăng nhập"""
    base_url = "http://localhost:5000"
    
    print("🧪 TeleDrive Login Flow Test")
    print("=" * 50)
    
    # Test 1: Kiểm tra trang setup (nếu chưa có admin)
    print("\n1️⃣ Kiểm tra trang setup...")
    try:
        response = requests.get(f"{base_url}/setup")
        if response.status_code == 200:
            print("✅ Trang setup accessible")
        elif response.status_code == 302:
            print("✅ Đã có admin user, redirect đến login")
        else:
            print(f"❌ Lỗi setup: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Không thể kết nối server: {e}")
        return False
    
    # Test 2: Kiểm tra trang login
    print("\n2️⃣ Kiểm tra trang login...")
    try:
        response = requests.get(f"{base_url}/login")
        if response.status_code == 200:
            print("✅ Trang login accessible")
        else:
            print(f"❌ Lỗi login page: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Lỗi kết nối login: {e}")
        return False
    
    # Test 3: Gửi OTP
    print("\n3️⃣ Test gửi OTP...")
    phone_number = "+84936374950"
    
    try:
        response = requests.post(
            f"{base_url}/send-otp",
            json={"phone_number": phone_number},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"✅ OTP gửi thành công: {data.get('message')}")
                
                # Extract OTP từ message (development mode)
                message = data.get('message', '')
                if 'Mã OTP đã được tạo:' in message:
                    otp_code = message.split('Mã OTP đã được tạo: ')[1].split(' ')[0]
                    print(f"🔐 OTP Code: {otp_code}")
                    
                    # Test 4: Verify OTP
                    print("\n4️⃣ Test verify OTP...")
                    time.sleep(1)  # Đợi 1 giây
                    
                    verify_response = requests.post(
                        f"{base_url}/verify-otp",
                        json={
                            "phone_number": phone_number,
                            "otp_code": otp_code,
                            "remember": False
                        },
                        headers={"Content-Type": "application/json"}
                    )
                    
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        if verify_data.get('success'):
                            print(f"✅ Verify OTP thành công: {verify_data.get('message')}")
                            print(f"🔗 Redirect URL: {verify_data.get('redirect')}")
                            
                            # Test 5: Truy cập dashboard
                            print("\n5️⃣ Test truy cập dashboard...")
                            
                            # Lấy cookies từ response
                            cookies = verify_response.cookies
                            
                            dashboard_response = requests.get(
                                f"{base_url}/",
                                cookies=cookies
                            )
                            
                            if dashboard_response.status_code == 200:
                                if "TeleDrive File Manager" in dashboard_response.text:
                                    print("✅ Dashboard accessible và hiển thị đúng")
                                    return True
                                else:
                                    print("❌ Dashboard không hiển thị đúng content")
                                    return False
                            else:
                                print(f"❌ Lỗi truy cập dashboard: {dashboard_response.status_code}")
                                return False
                        else:
                            print(f"❌ Verify OTP thất bại: {verify_data.get('message')}")
                            return False
                    else:
                        print(f"❌ Lỗi verify OTP: {verify_response.status_code}")
                        return False
                else:
                    print("❌ Không thể extract OTP code từ response")
                    return False
            else:
                print(f"❌ Gửi OTP thất bại: {data.get('message')}")
                return False
        else:
            print(f"❌ Lỗi gửi OTP: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Lỗi test OTP: {e}")
        return False

def test_invalid_scenarios():
    """Test các trường hợp lỗi"""
    base_url = "http://localhost:5000"
    
    print("\n🔍 Test các trường hợp lỗi...")
    print("-" * 30)
    
    # Test số điện thoại không tồn tại
    print("\n📱 Test số điện thoại không tồn tại...")
    try:
        response = requests.post(
            f"{base_url}/send-otp",
            json={"phone_number": "+84999999999"},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 404:
            data = response.json()
            if "chưa được đăng ký" in data.get('message', ''):
                print("✅ Đúng lỗi: Số điện thoại chưa được đăng ký")
            else:
                print(f"❌ Sai message: {data.get('message')}")
        else:
            print(f"❌ Sai status code: {response.status_code}")
    except Exception as e:
        print(f"❌ Lỗi test: {e}")
    
    # Test OTP sai
    print("\n🔐 Test OTP sai...")
    try:
        response = requests.post(
            f"{base_url}/verify-otp",
            json={
                "phone_number": "+84936374950",
                "otp_code": "000000",
                "remember": False
            },
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 400:
            data = response.json()
            if "không đúng" in data.get('message', ''):
                print("✅ Đúng lỗi: Mã OTP không đúng")
            else:
                print(f"❌ Sai message: {data.get('message')}")
        else:
            print(f"❌ Sai status code: {response.status_code}")
    except Exception as e:
        print(f"❌ Lỗi test: {e}")

if __name__ == "__main__":
    print("🚀 Bắt đầu test TeleDrive Login Flow...")
    print("📝 Đảm bảo server đang chạy tại http://localhost:5000")
    print()
    
    # Test main flow
    success = test_login_flow()
    
    if success:
        print("\n" + "=" * 50)
        print("🎉 TẤT CẢ TEST THÀNH CÔNG!")
        print("✅ Login flow hoạt động hoàn hảo")
        
        # Test error scenarios
        test_invalid_scenarios()
        
        print("\n" + "=" * 50)
        print("✅ HOÀN THÀNH TẤT CẢ TEST")
        sys.exit(0)
    else:
        print("\n" + "=" * 50)
        print("❌ CÓ LỖI TRONG LOGIN FLOW")
        sys.exit(1)
