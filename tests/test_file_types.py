#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive File Types Testing
Test the application with various file types to ensure proper handling
"""

import os
import sys
import requests
import json
import time
import mimetypes
from pathlib import Path

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

class FileTypesTester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_files_dir = Path(__file__).parent.parent / "test_files"
        self.results = []
        
    def log(self, message, status="INFO"):
        """Log test results"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {status}: {message}"
        print(log_message)
        self.results.append({"timestamp": timestamp, "status": status, "message": message})
        
    def check_server_running(self):
        """Check if the TeleDrive server is running"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                self.log("✅ TeleDrive server is running", "SUCCESS")
                return True
            else:
                self.log(f"❌ Server returned status code: {response.status_code}", "ERROR")
                return False
        except requests.exceptions.ConnectionError:
            self.log("❌ Cannot connect to TeleDrive server. Please start the server first.", "ERROR")
            return False
            
    def get_csrf_token(self):
        """Get CSRF token for secure requests"""
        try:
            response = self.session.get(f"{self.base_url}/api/csrf-token")
            if response.status_code == 200:
                token = response.json().get('csrf_token')
                self.log("✅ CSRF token obtained", "SUCCESS")
                return token
            else:
                self.log("❌ Failed to get CSRF token", "ERROR")
                return None
        except Exception as e:
            self.log(f"❌ Error getting CSRF token: {str(e)}", "ERROR")
            return None
            
    def test_file_upload(self, file_path):
        """Test uploading a specific file"""
        if not file_path.exists():
            self.log(f"❌ Test file not found: {file_path}", "ERROR")
            return False
            
        try:
            # Get CSRF token
            csrf_token = self.get_csrf_token()
            if not csrf_token:
                return False
                
            # Prepare file for upload
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.name, f, mimetypes.guess_type(str(file_path))[0])}
                data = {'csrf_token': csrf_token}
                
                response = self.session.post(
                    f"{self.base_url}/api/upload",
                    files=files,
                    data=data
                )
                
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.log(f"✅ Successfully uploaded: {file_path.name}", "SUCCESS")
                    return True
                else:
                    self.log(f"❌ Upload failed for {file_path.name}: {result.get('error', 'Unknown error')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Upload failed for {file_path.name}: HTTP {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error uploading {file_path.name}: {str(e)}", "ERROR")
            return False
            
    def test_file_list(self):
        """Test getting file list"""
        try:
            response = self.session.get(f"{self.base_url}/api/get_files")
            if response.status_code == 200:
                files = response.json()
                self.log(f"✅ Retrieved file list: {len(files)} files", "SUCCESS")
                return files
            else:
                self.log(f"❌ Failed to get file list: HTTP {response.status_code}", "ERROR")
                return []
        except Exception as e:
            self.log(f"❌ Error getting file list: {str(e)}", "ERROR")
            return []
            
    def test_file_download(self, filename):
        """Test downloading a file"""
        try:
            response = self.session.get(f"{self.base_url}/download/{filename}")
            if response.status_code == 200:
                self.log(f"✅ Successfully downloaded: {filename}", "SUCCESS")
                return True
            else:
                self.log(f"❌ Download failed for {filename}: HTTP {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error downloading {filename}: {str(e)}", "ERROR")
            return False
            
    def test_search_functionality(self, query):
        """Test search functionality"""
        try:
            response = self.session.get(f"{self.base_url}/api/search", params={'q': query})
            if response.status_code == 200:
                results = response.json()
                self.log(f"✅ Search for '{query}' returned {len(results)} results", "SUCCESS")
                return results
            else:
                self.log(f"❌ Search failed for '{query}': HTTP {response.status_code}", "ERROR")
                return []
        except Exception as e:
            self.log(f"❌ Error searching for '{query}': {str(e)}", "ERROR")
            return []
            
    def run_comprehensive_test(self):
        """Run comprehensive file type testing"""
        self.log("🚀 Starting TeleDrive File Types Testing", "INFO")
        self.log("=" * 60, "INFO")
        
        # Check if server is running
        if not self.check_server_running():
            self.log("❌ Cannot proceed without running server", "ERROR")
            return False
            
        # Test file uploads
        test_files = [
            "test_text.txt",
            "test_data.json", 
            "test_data.csv",
            "test_markdown.md",
            "test_xml.xml"
        ]
        
        uploaded_files = []
        self.log("\n📤 Testing File Uploads", "INFO")
        self.log("-" * 30, "INFO")
        
        for filename in test_files:
            file_path = self.test_files_dir / filename
            if self.test_file_upload(file_path):
                uploaded_files.append(filename)
                
        # Test file list
        self.log("\n📋 Testing File List", "INFO")
        self.log("-" * 30, "INFO")
        files = self.test_file_list()
        
        # Test file downloads
        self.log("\n📥 Testing File Downloads", "INFO")
        self.log("-" * 30, "INFO")
        for filename in uploaded_files:
            self.test_file_download(filename)
            
        # Test search functionality
        self.log("\n🔍 Testing Search Functionality", "INFO")
        self.log("-" * 30, "INFO")
        search_queries = ["test", "TeleDrive", ".txt", ".json", "data"]
        for query in search_queries:
            self.test_search_functionality(query)
            
        # Generate summary
        self.generate_summary()
        
    def generate_summary(self):
        """Generate test summary"""
        self.log("\n" + "=" * 60, "INFO")
        self.log("📊 TEST SUMMARY", "INFO")
        self.log("=" * 60, "INFO")
        
        success_count = len([r for r in self.results if r['status'] == 'SUCCESS'])
        error_count = len([r for r in self.results if r['status'] == 'ERROR'])
        total_tests = success_count + error_count
        
        self.log(f"Total Tests: {total_tests}", "INFO")
        self.log(f"Successful: {success_count}", "SUCCESS")
        self.log(f"Failed: {error_count}", "ERROR" if error_count > 0 else "INFO")
        
        if total_tests > 0:
            success_rate = (success_count / total_tests) * 100
            self.log(f"Success Rate: {success_rate:.1f}%", "SUCCESS" if success_rate >= 80 else "ERROR")
            
        # Save results to file
        self.save_results()
        
    def save_results(self):
        """Save test results to file"""
        try:
            results_file = Path(__file__).parent / "file_types_test_results.json"
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(self.results, f, indent=2, ensure_ascii=False)
            self.log(f"📄 Test results saved to: {results_file}", "INFO")
        except Exception as e:
            self.log(f"❌ Error saving results: {str(e)}", "ERROR")

def main():
    """Main function"""
    print("🧪 TeleDrive File Types Testing")
    print("=" * 50)
    
    tester = FileTypesTester()
    tester.run_comprehensive_test()
    
    print("\n✅ Testing completed!")
    print("Check the results above and the generated JSON file for details.")

if __name__ == "__main__":
    main()
