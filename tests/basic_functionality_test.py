#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Basic Functionality Test
Test core functionality of the TeleDrive application
"""

import os
import sys
import requests
import time
from pathlib import Path

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

class BasicFunctionalityTester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
        
    def log(self, message, status="INFO"):
        """Log test results"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {status}: {message}"
        print(log_message)
        self.results.append({"timestamp": timestamp, "status": status, "message": message})
        
    def test_server_connectivity(self):
        """Test if server is running and accessible"""
        try:
            response = self.session.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                self.log("✅ Server is running and accessible", "SUCCESS")
                return True
            else:
                self.log(f"❌ Server returned status code: {response.status_code}", "ERROR")
                return False
        except requests.exceptions.ConnectionError:
            self.log("❌ Cannot connect to server. Server may not be running.", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Error connecting to server: {str(e)}", "ERROR")
            return False
            
    def test_main_pages(self):
        """Test main application pages"""
        pages = [
            ("/", "Dashboard"),
            ("/search", "Search Page"),
            ("/scan", "Scan Page"),
            ("/settings", "Settings Page")
        ]
        
        for url, name in pages:
            try:
                response = self.session.get(f"{self.base_url}{url}", timeout=10)
                if response.status_code == 200:
                    self.log(f"✅ {name} loads successfully", "SUCCESS")
                elif response.status_code == 302:
                    self.log(f"⚠️ {name} redirects (may require authentication)", "WARNING")
                else:
                    self.log(f"❌ {name} failed: HTTP {response.status_code}", "ERROR")
            except Exception as e:
                self.log(f"❌ Error loading {name}: {str(e)}", "ERROR")
                
    def test_api_endpoints(self):
        """Test basic API endpoints"""
        endpoints = [
            ("/api/csrf-token", "CSRF Token"),
            ("/api/get_files", "Get Files"),
            ("/api/scan_status", "Scan Status")
        ]
        
        for url, name in endpoints:
            try:
                response = self.session.get(f"{self.base_url}{url}", timeout=10)
                if response.status_code == 200:
                    self.log(f"✅ {name} API works", "SUCCESS")
                elif response.status_code in [401, 403]:
                    self.log(f"⚠️ {name} API requires authentication", "WARNING")
                else:
                    self.log(f"❌ {name} API failed: HTTP {response.status_code}", "ERROR")
            except Exception as e:
                self.log(f"❌ Error testing {name} API: {str(e)}", "ERROR")
                
    def test_static_files(self):
        """Test static file serving"""
        static_files = [
            ("/static/css/style.css", "CSS"),
            ("/static/js/app.js", "JavaScript")
        ]
        
        for url, name in static_files:
            try:
                response = self.session.get(f"{self.base_url}{url}", timeout=10)
                if response.status_code == 200:
                    self.log(f"✅ {name} file loads", "SUCCESS")
                else:
                    self.log(f"❌ {name} file failed: HTTP {response.status_code}", "ERROR")
            except Exception as e:
                self.log(f"❌ Error loading {name} file: {str(e)}", "ERROR")
                
    def test_database_connection(self):
        """Test database connectivity by checking file list"""
        try:
            response = self.session.get(f"{self.base_url}/api/get_files", timeout=10)
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.log("✅ Database connection works", "SUCCESS")
                    return True
                except:
                    self.log("⚠️ Database returns non-JSON response", "WARNING")
                    return False
            else:
                self.log(f"❌ Database connection failed: HTTP {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error testing database: {str(e)}", "ERROR")
            return False
            
    def run_basic_tests(self):
        """Run all basic functionality tests"""
        self.log("🚀 Starting TeleDrive Basic Functionality Tests", "INFO")
        self.log("=" * 60, "INFO")
        
        # Test 1: Server connectivity
        self.log("\n🌐 Testing Server Connectivity", "INFO")
        self.log("-" * 30, "INFO")
        server_ok = self.test_server_connectivity()
        
        if not server_ok:
            self.log("❌ Cannot proceed without running server", "ERROR")
            self.generate_summary()
            return False
            
        # Test 2: Main pages
        self.log("\n📄 Testing Main Pages", "INFO")
        self.log("-" * 30, "INFO")
        self.test_main_pages()
        
        # Test 3: API endpoints
        self.log("\n🔌 Testing API Endpoints", "INFO")
        self.log("-" * 30, "INFO")
        self.test_api_endpoints()
        
        # Test 4: Static files
        self.log("\n📁 Testing Static Files", "INFO")
        self.log("-" * 30, "INFO")
        self.test_static_files()
        
        # Test 5: Database connection
        self.log("\n🗄️ Testing Database Connection", "INFO")
        self.log("-" * 30, "INFO")
        self.test_database_connection()
        
        # Generate summary
        self.generate_summary()
        return True
        
    def generate_summary(self):
        """Generate test summary"""
        self.log("\n" + "=" * 60, "INFO")
        self.log("📊 BASIC FUNCTIONALITY TEST SUMMARY", "INFO")
        self.log("=" * 60, "INFO")
        
        success_count = len([r for r in self.results if r['status'] == 'SUCCESS'])
        warning_count = len([r for r in self.results if r['status'] == 'WARNING'])
        error_count = len([r for r in self.results if r['status'] == 'ERROR'])
        total_tests = success_count + warning_count + error_count
        
        self.log(f"Total Tests: {total_tests}", "INFO")
        self.log(f"Successful: {success_count}", "SUCCESS")
        self.log(f"Warnings: {warning_count}", "WARNING" if warning_count > 0 else "INFO")
        self.log(f"Failed: {error_count}", "ERROR" if error_count > 0 else "INFO")
        
        if total_tests > 0:
            success_rate = (success_count / total_tests) * 100
            if success_rate >= 80:
                self.log(f"Success Rate: {success_rate:.1f}% - EXCELLENT! 🎉", "SUCCESS")
            elif success_rate >= 60:
                self.log(f"Success Rate: {success_rate:.1f}% - GOOD 👍", "SUCCESS")
            else:
                self.log(f"Success Rate: {success_rate:.1f}% - NEEDS IMPROVEMENT ⚠️", "WARNING")

def main():
    """Main function"""
    print("🧪 TeleDrive Basic Functionality Testing")
    print("=" * 50)
    
    tester = BasicFunctionalityTester()
    tester.run_basic_tests()
    
    print("\n✅ Basic testing completed!")
    print("Check the results above for details.")

if __name__ == "__main__":
    main()
