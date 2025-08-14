#!/usr/bin/env python3
"""
Simple Test Suite for TeleDrive (Windows Compatible)
ASCII-only version for Windows console compatibility
"""

import sys
import os
import requests
import tempfile
import time
import json
sys.path.append('source')

BASE_URL = "http://127.0.0.1:3000"

class SimpleTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.test_files = []
        self.errors = []
        self.warnings = []
        
    def log_error(self, test_name, error):
        """Log an error"""
        self.errors.append(f"FAIL: {test_name}: {error}")
        print(f"FAIL: {test_name}: {error}")
    
    def log_warning(self, test_name, warning):
        """Log a warning"""
        self.warnings.append(f"WARN: {test_name}: {warning}")
        print(f"WARN: {test_name}: {warning}")
    
    def log_success(self, test_name, details=""):
        """Log a success"""
        print(f"PASS: {test_name}{': ' + details if details else ''}")
    
    def setup_session(self):
        """Setup authenticated session"""
        try:
            self.session.get(f"{BASE_URL}/dev/auto-login")
            response = self.session.get(f"{BASE_URL}/api/csrf-token")
            if response.status_code == 200:
                self.csrf_token = response.json()['csrf_token']
                return True
        except:
            pass
        return False
    
    def test_server_connectivity(self):
        """Test basic server connectivity"""
        print("\n[CHECK] TESTING SERVER CONNECTIVITY")
        print("=" * 50)
        
        try:
            response = self.session.get(f"{BASE_URL}/", timeout=10)
            if response.status_code in [200, 302]:
                self.log_success("Server connectivity", f"Status: {response.status_code}")
                return True
            else:
                self.log_error("Server connectivity", f"Unexpected status: {response.status_code}")
                return False
        except Exception as e:
            self.log_error("Server connectivity", str(e))
            return False
    
    def test_authentication_system(self):
        """Test authentication system"""
        print("\n[CHECK] TESTING AUTHENTICATION SYSTEM")
        print("=" * 50)
        
        try:
            # Test auto-login
            response = self.session.get(f"{BASE_URL}/dev/auto-login")
            if response.status_code in [200, 302]:
                self.log_success("Auto-login endpoint")
            else:
                self.log_error("Auto-login endpoint", f"Status: {response.status_code}")
                return False
            
            # Test CSRF token generation
            response = self.session.get(f"{BASE_URL}/api/csrf-token")
            if response.status_code == 200:
                csrf_data = response.json()
                if 'csrf_token' in csrf_data and len(csrf_data['csrf_token']) > 50:
                    self.log_success("CSRF token generation", f"Length: {len(csrf_data['csrf_token'])}")
                    self.csrf_token = csrf_data['csrf_token']
                    return True
                else:
                    self.log_error("CSRF token generation", "Invalid token format")
                    return False
            else:
                self.log_error("CSRF token generation", f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_error("Authentication system", str(e))
            return False
    
    def test_file_upload(self):
        """Test basic file upload"""
        print("\n[CHECK] TESTING FILE UPLOAD")
        print("=" * 50)
        
        try:
            # Create simple test file
            content = "Simple test file content for upload testing"
            filename = "simple_test.txt"
            
            with open(filename, 'w') as f:
                f.write(content)
            
            self.test_files.append(filename)
            
            # Upload file
            files = {'files': open(filename, 'rb')}
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
                        self.log_success("File upload", f"Size: {uploaded_files[0]['size']} bytes")
                        return True
                    else:
                        self.log_error("File upload", "No files in response")
                        return False
                else:
                    self.log_error("File upload", result.get('error', 'Unknown error'))
                    return False
            else:
                self.log_error("File upload", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_error("File upload", str(e))
            return False
    
    def test_file_download(self):
        """Test file download"""
        print("\n[CHECK] TESTING FILE DOWNLOAD")
        print("=" * 50)
        
        try:
            # Get file list first
            response = self.session.get(f"{BASE_URL}/api/get_files")
            if response.status_code == 200:
                files_data = response.json()
                files_list = files_data.get('files', [])
                
                if files_list:
                    # Test downloading first file
                    file_info = files_list[0]
                    filename = file_info.get('filename') or file_info.get('name')
                    if filename:
                        download_response = self.session.get(f"{BASE_URL}/download/{filename}")
                        
                        if download_response.status_code == 200:
                            content_length = len(download_response.content)
                            self.log_success("File download", f"{content_length} bytes")
                            return True
                        else:
                            self.log_error("File download", f"HTTP {download_response.status_code}")
                            return False
                    else:
                        self.log_error("File download", "No filename in file info")
                        return False
                else:
                    self.log_warning("File download", "No files available for download")
                    return True
            else:
                self.log_error("File download", "Could not get file list")
                return False
        except Exception as e:
            self.log_error("File download", str(e))
            return False
    
    def test_api_endpoints(self):
        """Test API endpoints"""
        print("\n[CHECK] TESTING API ENDPOINTS")
        print("=" * 50)
        
        endpoints = [
            ("/api/get_files", "File listing API"),
            ("/api/csrf-token", "CSRF token API"),
            ("/api/scan_status", "Scan status API"),
            ("/api/get_channels", "Channels API"),
        ]
        
        success_count = 0
        for endpoint, description in endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}")
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        self.log_success(description, "Valid JSON response")
                        success_count += 1
                    except:
                        self.log_warning(description, "Non-JSON response")
                elif response.status_code == 404:
                    self.log_warning(description, "Endpoint not found")
                else:
                    self.log_error(description, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_error(description, str(e))
        
        return success_count >= 3  # At least 3 out of 4 should work
    
    def test_web_pages(self):
        """Test web pages"""
        print("\n[CHECK] TESTING WEB PAGES")
        print("=" * 50)
        
        pages = [
            ("/", "Main page"),
            ("/settings", "Settings page"),
            ("/scan", "Scan page"),
            ("/search", "Search page"),
        ]
        
        success_count = 0
        for url, description in pages:
            try:
                response = self.session.get(f"{BASE_URL}{url}")
                
                if response.status_code == 200:
                    content_length = len(response.content)
                    if content_length > 1000:
                        self.log_success(description, f"{content_length} bytes")
                        success_count += 1
                    else:
                        self.log_warning(description, f"Small page size: {content_length} bytes")
                elif response.status_code == 302:
                    self.log_success(description, "Redirect (expected)")
                    success_count += 1
                else:
                    self.log_error(description, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_error(description, str(e))
        
        return success_count >= 3  # At least 3 out of 4 should work
    
    def cleanup(self):
        """Clean up test files"""
        print("\n[CLEANUP] CLEANING UP TEST FILES")
        print("=" * 50)
        
        for file_path in self.test_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"REMOVED: {file_path}")
            except Exception as e:
                print(f"WARNING: Could not remove {file_path}: {e}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("[TEST] SIMPLE TELEDRIVE TEST SUITE")
        print("=" * 60)
        
        if not self.setup_session():
            print("FAIL: Could not setup authenticated session")
            return False
        
        tests = [
            ("Server Connectivity", self.test_server_connectivity),
            ("Authentication System", self.test_authentication_system),
            ("File Upload", self.test_file_upload),
            ("File Download", self.test_file_download),
            ("API Endpoints", self.test_api_endpoints),
            ("Web Pages", self.test_web_pages),
        ]
        
        results = []
        for test_name, test_func in tests:
            try:
                result = test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"FAIL: {test_name} failed with exception: {e}")
                results.append((test_name, False))
        
        # Summary
        print("\n" + "=" * 60)
        print("[REPORT] TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for test_name, result in results:
            status = "PASS" if result else "FAIL"
            print(f"{status}: {test_name}")
        
        print(f"\nOverall: {passed}/{total} tests passed ({(passed/total*100):.1f}%)")
        
        self.cleanup()
        
        if passed == total:
            print("\n[SUCCESS] ALL TESTS PASSED!")
            return True
        elif passed >= total * 0.8:  # 80% pass rate
            print(f"\n[WARNING] Most tests passed ({passed}/{total})")
            return True
        else:
            print(f"\n[FAIL] Too many tests failed ({total-passed}/{total})")
            return False

if __name__ == "__main__":
    test_suite = SimpleTestSuite()
    success = test_suite.run_all_tests()
    
    if success:
        print("\n[COMPLETE] SIMPLE TESTING COMPLETED SUCCESSFULLY")
        exit(0)
    else:
        print("\n[COMPLETE] SIMPLE TESTING FOUND ISSUES")
        exit(1)
