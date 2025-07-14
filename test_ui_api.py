#!/usr/bin/env python3
"""
Test script để debug UI API
"""

import requests
import json

def test_api():
    base_url = "http://localhost:5003"
    
    print("🧪 Testing TeleDrive UI API")
    print("=" * 50)
    
    # Test 1: Basic API test
    print("1. Testing basic API...")
    try:
        response = requests.get(f"{base_url}/api/test")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Auth status
    print("\n2. Testing auth status...")
    try:
        response = requests.get(f"{base_url}/api/auth/status")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 3: Send code
    print("\n3. Testing send code...")
    try:
        data = {"phone_number": "+84936374950"}
        response = requests.post(
            f"{base_url}/api/auth/send-code",
            headers={"Content-Type": "application/json"},
            json=data
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 4: Get config phone
    print("\n4. Testing get config phone...")
    try:
        response = requests.get(f"{base_url}/api/config/phone")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    test_api()
