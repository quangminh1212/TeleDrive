#!/usr/bin/env python3
"""
Comprehensive Test Suite for TeleDrive
Tests all features thoroughly to detect any hidden issues
"""

import sys
import os
import requests
import tempfile
import time
import json
import random
import string
from pathlib import Path
sys.path.append('source')

BASE_URL = "http://127.0.0.1:3000"

class TeleDriveTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.test_files = []
        self.errors = []
        self.warnings = []
        
    def log_error(self, test_name, error):
        """Log an error"""
        self.errors.append(f"[FAIL] {test_name}: {error}")
        print(f"[FAIL] {test_name}: {error}")
    
    def log_warning(self, test_name, warning):
        """Log a warning"""
        self.warnings.append(f"[WARN] {test_name}: {warning}")
        print(f"[WARN] {test_name}: {warning}")
    
    def log_success(self, test_name, details=""):
        """Log a success"""
        print(f"[PASS] {test_name}{': ' + details if details else ''}")
    
    def test_server_connectivity(self):
        """Test basic server connectivity"""
        print("\n[CHECK] TESTING SERVER CONNECTIVITY")
        print("=" * 50)
        
        try:
            # Test basic connection
            response = self.session.get(f"{BASE_URL}/", timeout=10)
            if response.status_code in [200, 302]:
                self.log_success("Server connectivity", f"Status: {response.status_code}")
            else:
                self.log_error("Server connectivity", f"Unexpected status: {response.status_code}")
            
            # Test response time
            start_time = time.time()
            self.session.get(f"{BASE_URL}/", timeout=5)
            response_time = time.time() - start_time
            
            if response_time < 1.0:
                self.log_success("Response time", f"{response_time:.3f}s")
            elif response_time < 3.0:
                self.log_warning("Response time", f"{response_time:.3f}s (slow)")
            else:
                self.log_error("Response time", f"{response_time:.3f}s (too slow)")
                
        except Exception as e:
            self.log_error("Server connectivity", str(e))
    
    def test_authentication_system(self):
        """Test authentication system thoroughly"""
        print("\n[CHECK] TESTING AUTHENTICATION SYSTEM")
        print("=" * 50)
        
        try:
            # Test auto-login
            response = self.session.get(f"{BASE_URL}/dev/auto-login")
            if response.status_code in [200, 302]:
                self.log_success("Auto-login endpoint")
            else:
                self.log_error("Auto-login endpoint", f"Status: {response.status_code}")
            
            # Test CSRF token generation
            response = self.session.get(f"{BASE_URL}/api/csrf-token")
            if response.status_code == 200:
                csrf_data = response.json()
                if 'csrf_token' in csrf_data and len(csrf_data['csrf_token']) > 50:
                    self.log_success("CSRF token generation", f"Length: {len(csrf_data['csrf_token'])}")
                    self.csrf_token = csrf_data['csrf_token']
                else:
                    self.log_error("CSRF token generation", "Invalid token format")
            else:
                self.log_error("CSRF token generation", f"Status: {response.status_code}")
            
            # Test session persistence
            response1 = self.session.get(f"{BASE_URL}/")
            response2 = self.session.get(f"{BASE_URL}/")
            
            if response1.status_code == response2.status_code:
                self.log_success("Session persistence")
            else:
                self.log_warning("Session persistence", "Inconsistent responses")
                
        except Exception as e:
            self.log_error("Authentication system", str(e))
    
    def test_file_upload_comprehensive(self):
        """Test file upload with various scenarios"""
        print("\n[CHECK] TESTING FILE UPLOAD (COMPREHENSIVE)")
        print("=" * 50)
        
        test_cases = [
            ("small_text.txt", "Small text file content", "text/plain"),
            ("medium_data.json", json.dumps({"test": "data", "numbers": list(range(100))}), "application/json"),
            ("special_chars_файл.txt", "Content with special characters: àáâãäåæçèéêë", "text/plain"),
            ("empty_file.txt", "", "text/plain"),
            ("large_text.txt", "Large content\n" * 1000, "text/plain")
        ]
        
        for filename, content, content_type in test_cases:
            try:
                # Create test file
                test_file_path = f"test_{filename}"
                with open(test_file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.test_files.append(test_file_path)
                
                # Upload file
                files = {'files': open(test_file_path, 'rb')}
                data = {'csrf_token': self.csrf_token}
                headers = {'X-CSRFToken': self.csrf_token}
                
                response = self.session.post(
                    f"{BASE_URL}/api/upload",
                    files=files,
                    data=data,
                    headers=headers
                )
                
                files['files'].close()
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        uploaded_files = result.get('files', [])
                        if uploaded_files:
                            self.log_success(f"Upload {filename}", f"Size: {uploaded_files[0]['size']} bytes")
                        else:
                            self.log_error(f"Upload {filename}", "No files in response")
                    else:
                        self.log_error(f"Upload {filename}", result.get('error', 'Unknown error'))
                else:
                    self.log_error(f"Upload {filename}", f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_error(f"Upload {filename}", str(e))
    
    def test_file_download_comprehensive(self):
        """Test file download functionality"""
        print("\n[CHECK] TESTING FILE DOWNLOAD (COMPREHENSIVE)")
        print("=" * 50)
        
        try:
            # Get file list first
            response = self.session.get(f"{BASE_URL}/api/get_files")
            if response.status_code == 200:
                files_data = response.json()
                files_list = files_data.get('files', [])
                
                if files_list:
                    # Test downloading first few files
                    for i, file_info in enumerate(files_list[:5]):
                        filename = file_info.get('filename') or file_info.get('name')
                        if filename:
                            download_response = self.session.get(f"{BASE_URL}/download/{filename}")
                            
                            if download_response.status_code == 200:
                                content_length = len(download_response.content)
                                expected_size = file_info.get('file_size') or file_info.get('size', 0)
                                
                                if content_length == expected_size:
                                    self.log_success(f"Download {filename}", f"{content_length} bytes")
                                else:
                                    self.log_warning(f"Download {filename}", 
                                                   f"Size mismatch: got {content_length}, expected {expected_size}")
                            else:
                                self.log_error(f"Download {filename}", f"HTTP {download_response.status_code}")
                else:
                    self.log_warning("File download test", "No files available for download")
            else:
                self.log_error("File download test", "Could not get file list")
                
        except Exception as e:
            self.log_error("File download test", str(e))
    
    def test_api_endpoints(self):
        """Test all API endpoints"""
        print("\n[CHECK] TESTING API ENDPOINTS")
        print("=" * 50)
        
        endpoints = [
            ("/api/get_files", "GET", "File listing API"),
            ("/api/csrf-token", "GET", "CSRF token API"),
            ("/api/scan_status", "GET", "Scan status API"),
            ("/api/get_channels", "GET", "Channels API"),
        ]
        
        for endpoint, method, description in endpoints:
            try:
                if method == "GET":
                    response = self.session.get(f"{BASE_URL}{endpoint}")
                else:
                    response = self.session.post(f"{BASE_URL}{endpoint}")
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        self.log_success(description, f"Valid JSON response")
                    except:
                        self.log_warning(description, "Non-JSON response")
                elif response.status_code == 404:
                    self.log_warning(description, "Endpoint not found")
                else:
                    self.log_error(description, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_error(description, str(e))
    
    def test_web_pages(self):
        """Test all web pages"""
        print("\n[CHECK] TESTING WEB PAGES")
        print("=" * 50)
        
        pages = [
            ("/", "Main page"),
            ("/settings", "Settings page"),
            ("/scan", "Scan page"),
            ("/search", "Search page"),
        ]
        
        for url, description in pages:
            try:
                response = self.session.get(f"{BASE_URL}{url}")
                
                if response.status_code == 200:
                    content_length = len(response.content)
                    if content_length > 1000:  # Reasonable page size
                        self.log_success(description, f"{content_length} bytes")
                    else:
                        self.log_warning(description, f"Small page size: {content_length} bytes")
                elif response.status_code == 302:
                    self.log_success(description, "Redirect (expected)")
                else:
                    self.log_error(description, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_error(description, str(e))
    
    def test_error_handling(self):
        """Test error handling"""
        print("\n[CHECK] TESTING ERROR HANDLING")
        print("=" * 50)
        
        error_tests = [
            ("/nonexistent", "404 handling"),
            ("/api/upload", "POST without CSRF", {"method": "post"}),
            ("/download/nonexistent.txt", "Download nonexistent file"),
        ]
        
        for url, description, *args in error_tests:
            try:
                kwargs = args[0] if args else {}
                method = kwargs.get('method', 'get')
                
                if method == 'post':
                    response = self.session.post(f"{BASE_URL}{url}")
                else:
                    response = self.session.get(f"{BASE_URL}{url}")
                
                if response.status_code in [400, 403, 404, 500]:
                    self.log_success(description, f"Proper error: {response.status_code}")
                else:
                    self.log_warning(description, f"Unexpected status: {response.status_code}")
                    
            except Exception as e:
                self.log_error(description, str(e))
    
    def test_security_features(self):
        """Test security features"""
        print("\n[CHECK] TESTING SECURITY FEATURES")
        print("=" * 50)
        
        try:
            # Test CSRF protection
            response = self.session.post(f"{BASE_URL}/api/upload", 
                                       files={'files': ('test.txt', 'content')})
            
            if response.status_code in [400, 403]:
                self.log_success("CSRF protection", "Blocked request without token")
            else:
                self.log_warning("CSRF protection", f"Unexpected status: {response.status_code}")
            
            # Test file extension validation
            malicious_files = [
                ('test.exe', 'Executable file'),
                ('test.php', 'PHP script'),
                ('test.js', 'JavaScript file'),
            ]
            
            for filename, description in malicious_files:
                test_file_path = f"test_{filename}"
                with open(test_file_path, 'w') as f:
                    f.write("test content")
                
                self.test_files.append(test_file_path)
                
                files = {'files': open(test_file_path, 'rb')}
                data = {'csrf_token': self.csrf_token}
                headers = {'X-CSRFToken': self.csrf_token}
                
                response = self.session.post(
                    f"{BASE_URL}/api/upload",
                    files=files,
                    data=data,
                    headers=headers
                )
                
                files['files'].close()
                
                if response.status_code == 400 or (response.status_code == 200 and not response.json().get('success')):
                    self.log_success(f"File validation ({filename})", "Blocked dangerous file")
                else:
                    self.log_warning(f"File validation ({filename})", "Dangerous file not blocked")
                    
        except Exception as e:
            self.log_error("Security features", str(e))
    
    def test_database_operations(self):
        """Test database operations"""
        print("\n[CHECK] TESTING DATABASE OPERATIONS")
        print("=" * 50)
        
        try:
            # Test file listing with different parameters
            params_tests = [
                ({}, "Default parameters"),
                ({"page": 1, "per_page": 5}, "Pagination"),
                ({"page": 999}, "Invalid page"),
            ]
            
            for params, description in params_tests:
                response = self.session.get(f"{BASE_URL}/api/get_files", params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'files' in data:
                        self.log_success(f"Database query ({description})", f"{len(data['files'])} files")
                    else:
                        self.log_warning(f"Database query ({description})", "No files key in response")
                else:
                    self.log_error(f"Database query ({description})", f"HTTP {response.status_code}")
                    
        except Exception as e:
            self.log_error("Database operations", str(e))
    
    def cleanup(self):
        """Clean up test files"""
        print("\n[CLEANUP] CLEANING UP TEST FILES")
        print("=" * 50)
        
        for file_path in self.test_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"[PASS] Removed: {file_path}")
            except Exception as e:
                print(f"[WARN] Could not remove {file_path}: {e}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("[TEST] COMPREHENSIVE TELEDRIVE TEST SUITE")
        print("=" * 60)
        
        self.test_server_connectivity()
        self.test_authentication_system()
        self.test_file_upload_comprehensive()
        self.test_file_download_comprehensive()
        self.test_api_endpoints()
        self.test_web_pages()
        self.test_error_handling()
        self.test_security_features()
        self.test_database_operations()
        
        # Summary
        print("\n" + "=" * 60)
        print("[REPORT] TEST SUMMARY")
        print("=" * 60)
        
        if not self.errors and not self.warnings:
            print("[SUCCESS] ALL TESTS PASSED - NO ISSUES FOUND!")
        else:
            if self.errors:
                print(f"[FAIL] ERRORS FOUND: {len(self.errors)}")
                for error in self.errors:
                    print(f"   {error}")
            
            if self.warnings:
                print(f"[WARN] WARNINGS: {len(self.warnings)}")
                for warning in self.warnings:
                    print(f"   {warning}")
        
        self.cleanup()
        
        return len(self.errors) == 0

if __name__ == "__main__":
    test_suite = TeleDriveTestSuite()
    success = test_suite.run_all_tests()
    
    if success:
        print("\n[PASS] COMPREHENSIVE TEST COMPLETED SUCCESSFULLY")
    else:
        print("\n[FAIL] COMPREHENSIVE TEST FOUND ISSUES")
        exit(1)
