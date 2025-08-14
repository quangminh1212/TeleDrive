#!/usr/bin/env python3
"""
Advanced Edge Case Tests for TeleDrive
Tests edge cases and potential hidden issues
"""

import sys
import os
import requests
import tempfile
import time
import json
import random
import string
import threading
from pathlib import Path
sys.path.append('source')

BASE_URL = "http://127.0.0.1:3000"

class AdvancedTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.test_files = []
        self.errors = []
        self.warnings = []
        
    def log_error(self, test_name, error):
        self.errors.append(f"❌ {test_name}: {error}")
        print(f"❌ {test_name}: {error}")
    
    def log_warning(self, test_name, warning):
        self.warnings.append(f"⚠️ {test_name}: {warning}")
        print(f"⚠️ {test_name}: {warning}")
    
    def log_success(self, test_name, details=""):
        print(f"✅ {test_name}{': ' + details if details else ''}")
    
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
    
    def test_concurrent_uploads(self):
        """Test concurrent file uploads"""
        print("\n🔍 TESTING CONCURRENT UPLOADS")
        print("=" * 50)
        
        def upload_file(file_id):
            try:
                content = f"Concurrent test file {file_id}\n" * 100
                filename = f"concurrent_test_{file_id}.txt"
                
                with open(filename, 'w') as f:
                    f.write(content)
                
                self.test_files.append(filename)
                
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
                    return result.get('success', False)
                return False
                
            except Exception as e:
                print(f"Concurrent upload {file_id} error: {e}")
                return False
        
        # Test 5 concurrent uploads
        threads = []
        results = []
        
        for i in range(5):
            thread = threading.Thread(target=lambda i=i: results.append(upload_file(i)))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        successful_uploads = sum(1 for r in results if r)
        if successful_uploads >= 4:  # Allow 1 failure due to race conditions
            self.log_success("Concurrent uploads", f"{successful_uploads}/5 successful")
        else:
            self.log_warning("Concurrent uploads", f"Only {successful_uploads}/5 successful")
    
    def test_large_file_upload(self):
        """Test large file upload"""
        print("\n🔍 TESTING LARGE FILE UPLOAD")
        print("=" * 50)
        
        try:
            # Create 50MB file
            large_content = "Large file test content\n" * (50 * 1024 * 1024 // 25)
            filename = "large_test_file.txt"
            
            with open(filename, 'w') as f:
                f.write(large_content)
            
            self.test_files.append(filename)
            file_size = os.path.getsize(filename)
            
            files = {'files': open(filename, 'rb')}
            data = {'csrf_token': self.csrf_token}
            headers = {'X-CSRFToken': self.csrf_token}
            
            start_time = time.time()
            response = self.session.post(
                f"{BASE_URL}/api/upload",
                files=files,
                data=data,
                headers=headers,
                timeout=120  # 2 minute timeout
            )
            upload_time = time.time() - start_time
            
            files['files'].close()
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.log_success("Large file upload", f"{file_size} bytes in {upload_time:.2f}s")
                else:
                    self.log_error("Large file upload", result.get('error', 'Unknown error'))
            else:
                self.log_error("Large file upload", f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_error("Large file upload", str(e))
    
    def test_special_characters_filenames(self):
        """Test files with special characters in names"""
        print("\n🔍 TESTING SPECIAL CHARACTER FILENAMES")
        print("=" * 50)
        
        special_names = [
            "файл_с_русскими_символами.txt",
            "文件_中文_测试.txt", 
            "tệp_tiếng_việt.txt",
            "file with spaces.txt",
            "file-with-dashes.txt",
            "file_with_underscores.txt",
            "file.with.dots.txt",
            "file(with)parentheses.txt",
            "file[with]brackets.txt",
            "file{with}braces.txt",
        ]
        
        for original_name in special_names:
            try:
                content = f"Test content for {original_name}"
                
                with open(original_name, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.test_files.append(original_name)
                
                files = {'files': open(original_name, 'rb')}
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
                        self.log_success(f"Special filename: {original_name}")
                    else:
                        self.log_warning(f"Special filename: {original_name}", result.get('error'))
                else:
                    self.log_error(f"Special filename: {original_name}", f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_error(f"Special filename: {original_name}", str(e))
    
    def test_api_rate_limiting(self):
        """Test API rate limiting"""
        print("\n🔍 TESTING API RATE LIMITING")
        print("=" * 50)
        
        try:
            # Make rapid requests to test rate limiting
            rapid_requests = 0
            rate_limited = False
            
            for i in range(20):  # Try 20 rapid requests
                response = self.session.get(f"{BASE_URL}/api/get_files")
                
                if response.status_code == 429:  # Too Many Requests
                    rate_limited = True
                    break
                elif response.status_code == 200:
                    rapid_requests += 1
                else:
                    break
                
                time.sleep(0.1)  # Small delay
            
            if rate_limited:
                self.log_success("Rate limiting", "Properly blocked excessive requests")
            elif rapid_requests >= 15:
                self.log_warning("Rate limiting", "No rate limiting detected")
            else:
                self.log_error("Rate limiting", f"Unexpected behavior after {rapid_requests} requests")
                
        except Exception as e:
            self.log_error("Rate limiting test", str(e))
    
    def test_database_stress(self):
        """Test database under stress"""
        print("\n🔍 TESTING DATABASE STRESS")
        print("=" * 50)
        
        try:
            # Test rapid file listing requests
            start_time = time.time()
            successful_queries = 0
            
            for i in range(50):
                response = self.session.get(f"{BASE_URL}/api/get_files")
                if response.status_code == 200:
                    successful_queries += 1
                time.sleep(0.05)  # 50ms between requests
            
            total_time = time.time() - start_time
            avg_response_time = total_time / 50
            
            if successful_queries >= 45:  # Allow some failures
                self.log_success("Database stress test", 
                               f"{successful_queries}/50 queries, avg {avg_response_time:.3f}s")
            else:
                self.log_warning("Database stress test", 
                               f"Only {successful_queries}/50 queries successful")
                
        except Exception as e:
            self.log_error("Database stress test", str(e))
    
    def test_memory_usage(self):
        """Test for memory leaks"""
        print("\n🔍 TESTING MEMORY USAGE")
        print("=" * 50)
        
        try:
            import psutil
            import os
            
            # Get server process (approximate)
            server_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if 'python' in proc.info['name'].lower() and 'app.py' in ' '.join(proc.info['cmdline']):
                        server_processes.append(proc)
                except:
                    continue
            
            if server_processes:
                proc = server_processes[0]
                initial_memory = proc.memory_info().rss / 1024 / 1024  # MB
                
                # Make many requests
                for i in range(100):
                    self.session.get(f"{BASE_URL}/api/get_files")
                    if i % 10 == 0:
                        time.sleep(0.1)
                
                final_memory = proc.memory_info().rss / 1024 / 1024  # MB
                memory_increase = final_memory - initial_memory
                
                if memory_increase < 50:  # Less than 50MB increase
                    self.log_success("Memory usage", f"Increase: {memory_increase:.1f}MB")
                else:
                    self.log_warning("Memory usage", f"High increase: {memory_increase:.1f}MB")
            else:
                self.log_warning("Memory usage", "Could not find server process")
                
        except ImportError:
            self.log_warning("Memory usage", "psutil not available")
        except Exception as e:
            self.log_error("Memory usage test", str(e))
    
    def test_error_recovery(self):
        """Test error recovery mechanisms"""
        print("\n🔍 TESTING ERROR RECOVERY")
        print("=" * 50)
        
        try:
            # Test invalid JSON in request
            response = self.session.post(
                f"{BASE_URL}/api/upload",
                data="invalid json",
                headers={'Content-Type': 'application/json', 'X-CSRFToken': self.csrf_token}
            )
            
            if response.status_code in [400, 405]:
                self.log_success("Invalid JSON handling")
            else:
                self.log_warning("Invalid JSON handling", f"Status: {response.status_code}")
            
            # Test after error - should still work
            response = self.session.get(f"{BASE_URL}/api/get_files")
            if response.status_code == 200:
                self.log_success("Recovery after error")
            else:
                self.log_error("Recovery after error", f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_error("Error recovery test", str(e))
    
    def cleanup(self):
        """Clean up test files"""
        print("\n🧹 CLEANING UP TEST FILES")
        print("=" * 50)
        
        for file_path in self.test_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"✅ Removed: {file_path}")
            except Exception as e:
                print(f"⚠️ Could not remove {file_path}: {e}")
    
    def run_all_tests(self):
        """Run all advanced tests"""
        print("🧪 ADVANCED EDGE CASE TEST SUITE")
        print("=" * 60)
        
        if not self.setup_session():
            print("❌ Failed to setup authenticated session")
            return False
        
        self.test_concurrent_uploads()
        self.test_large_file_upload()
        self.test_special_characters_filenames()
        self.test_api_rate_limiting()
        self.test_database_stress()
        self.test_memory_usage()
        self.test_error_recovery()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 ADVANCED TEST SUMMARY")
        print("=" * 60)
        
        if not self.errors and not self.warnings:
            print("🎉 ALL ADVANCED TESTS PASSED - NO ISSUES FOUND!")
        else:
            if self.errors:
                print(f"❌ ERRORS FOUND: {len(self.errors)}")
                for error in self.errors:
                    print(f"   {error}")
            
            if self.warnings:
                print(f"⚠️ WARNINGS: {len(self.warnings)}")
                for warning in self.warnings:
                    print(f"   {warning}")
        
        self.cleanup()
        
        return len(self.errors) == 0

if __name__ == "__main__":
    test_suite = AdvancedTestSuite()
    success = test_suite.run_all_tests()
    
    if success:
        print("\n✅ ADVANCED TESTING COMPLETED SUCCESSFULLY")
    else:
        print("\n❌ ADVANCED TESTING FOUND ISSUES")
        exit(1)
