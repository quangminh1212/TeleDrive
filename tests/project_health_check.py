#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Project Health Check
Comprehensive health check for the TeleDrive project
"""

import os
import sys
import json
import sqlite3
import requests
import time
from pathlib import Path

class ProjectHealthChecker:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.app_dir = self.project_root / "app"
        self.results = []
        
    def log(self, message, status="INFO"):
        """Log test results"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {status}: {message}"
        print(log_message)
        self.results.append({"timestamp": timestamp, "status": status, "message": message})
        
    def check_project_structure(self):
        """Check project directory structure"""
        self.log("🏗️ Checking Project Structure", "INFO")
        self.log("-" * 40, "INFO")
        
        required_dirs = [
            "app",
            "app/templates", 
            "app/static",
            "app/static/css",
            "data",
            "tests"
        ]
        
        for dir_path in required_dirs:
            full_path = self.project_root / dir_path
            if full_path.exists():
                self.log(f"✅ {dir_path}/ exists", "SUCCESS")
            else:
                self.log(f"❌ {dir_path}/ missing", "ERROR")
                
        required_files = [
            "app/app.py",
            "app/templates/base.html",
            "app/templates/index.html",
            "app/static/css/style.css",
            "config.json",
            "requirements.txt",
            "README.md"
        ]
        
        for file_path in required_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                self.log(f"✅ {file_path} exists", "SUCCESS")
            else:
                self.log(f"❌ {file_path} missing", "ERROR")
                
    def check_configuration(self):
        """Check configuration files"""
        self.log("\n⚙️ Checking Configuration", "INFO")
        self.log("-" * 40, "INFO")
        
        config_file = self.project_root / "config.json"
        if config_file.exists():
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                self.log("✅ config.json is valid JSON", "SUCCESS")
                
                required_keys = ['telegram', 'database', 'output']
                for key in required_keys:
                    if key in config:
                        self.log(f"✅ config.json has '{key}' section", "SUCCESS")
                    else:
                        self.log(f"❌ config.json missing '{key}' section", "ERROR")
                        
            except json.JSONDecodeError as e:
                self.log(f"❌ config.json invalid JSON: {e}", "ERROR")
            except Exception as e:
                self.log(f"❌ Error reading config.json: {e}", "ERROR")
        else:
            self.log("❌ config.json not found", "ERROR")
            
    def check_database(self):
        """Check database file and structure"""
        self.log("\n🗄️ Checking Database", "INFO")
        self.log("-" * 40, "INFO")
        
        db_file = self.project_root / "data" / "teledrive.db"
        if db_file.exists():
            self.log("✅ Database file exists", "SUCCESS")
            
            try:
                conn = sqlite3.connect(str(db_file))
                cursor = conn.cursor()
                
                # Check tables
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = [row[0] for row in cursor.fetchall()]
                
                expected_tables = ['user', 'file', 'folder', 'scan_session']
                for table in expected_tables:
                    if table in tables:
                        self.log(f"✅ Table '{table}' exists", "SUCCESS")
                    else:
                        self.log(f"⚠️ Table '{table}' missing", "WARNING")
                        
                conn.close()
                
            except Exception as e:
                self.log(f"❌ Database error: {e}", "ERROR")
        else:
            self.log("⚠️ Database file not found (will be created on first run)", "WARNING")
            
    def check_server_status(self):
        """Check if server is running"""
        self.log("\n🌐 Checking Server Status", "INFO")
        self.log("-" * 40, "INFO")
        
        try:
            response = requests.get("http://localhost:3000/", timeout=5)
            if response.status_code == 200:
                self.log("✅ Server is running and responding", "SUCCESS")
                
                # Check main pages
                pages = ["/", "/search", "/scan", "/settings"]
                for page in pages:
                    try:
                        resp = requests.get(f"http://localhost:3000{page}", timeout=5)
                        if resp.status_code == 200:
                            self.log(f"✅ Page '{page}' loads", "SUCCESS")
                        else:
                            self.log(f"⚠️ Page '{page}' returns {resp.status_code}", "WARNING")
                    except:
                        self.log(f"❌ Page '{page}' failed to load", "ERROR")
                        
            else:
                self.log(f"⚠️ Server returns status {response.status_code}", "WARNING")
                
        except requests.exceptions.ConnectionError:
            self.log("⚠️ Server not running (this is OK if testing offline)", "WARNING")
        except Exception as e:
            self.log(f"❌ Server check error: {e}", "ERROR")
            
    def check_dependencies(self):
        """Check Python dependencies"""
        self.log("\n📦 Checking Dependencies", "INFO")
        self.log("-" * 40, "INFO")
        
        requirements_file = self.project_root / "requirements.txt"
        if requirements_file.exists():
            self.log("✅ requirements.txt exists", "SUCCESS")
            
            try:
                with open(requirements_file, 'r') as f:
                    requirements = f.read().strip().split('\n')
                    
                for req in requirements:
                    if req.strip() and not req.startswith('#'):
                        package = req.split('==')[0].split('>=')[0].strip()
                        try:
                            __import__(package.replace('-', '_'))
                            self.log(f"✅ {package} installed", "SUCCESS")
                        except ImportError:
                            self.log(f"❌ {package} not installed", "ERROR")
                        except:
                            self.log(f"⚠️ {package} check failed", "WARNING")
                            
            except Exception as e:
                self.log(f"❌ Error reading requirements.txt: {e}", "ERROR")
        else:
            self.log("❌ requirements.txt not found", "ERROR")
            
    def run_health_check(self):
        """Run complete health check"""
        self.log("🏥 TeleDrive Project Health Check", "INFO")
        self.log("=" * 60, "INFO")
        
        self.check_project_structure()
        self.check_configuration()
        self.check_database()
        self.check_dependencies()
        self.check_server_status()
        
        self.generate_summary()
        
    def generate_summary(self):
        """Generate health check summary"""
        self.log("\n" + "=" * 60, "INFO")
        self.log("📊 HEALTH CHECK SUMMARY", "INFO")
        self.log("=" * 60, "INFO")
        
        success_count = len([r for r in self.results if r['status'] == 'SUCCESS'])
        warning_count = len([r for r in self.results if r['status'] == 'WARNING'])
        error_count = len([r for r in self.results if r['status'] == 'ERROR'])
        total_checks = success_count + warning_count + error_count
        
        self.log(f"Total Checks: {total_checks}", "INFO")
        self.log(f"Successful: {success_count}", "SUCCESS")
        self.log(f"Warnings: {warning_count}", "WARNING" if warning_count > 0 else "INFO")
        self.log(f"Errors: {error_count}", "ERROR" if error_count > 0 else "INFO")
        
        if total_checks > 0:
            health_score = ((success_count + warning_count * 0.5) / total_checks) * 100
            
            if health_score >= 90:
                self.log(f"Health Score: {health_score:.1f}% - EXCELLENT! 🎉", "SUCCESS")
            elif health_score >= 75:
                self.log(f"Health Score: {health_score:.1f}% - GOOD 👍", "SUCCESS")
            elif health_score >= 50:
                self.log(f"Health Score: {health_score:.1f}% - FAIR ⚠️", "WARNING")
            else:
                self.log(f"Health Score: {health_score:.1f}% - POOR ❌", "ERROR")
                
        if error_count == 0:
            self.log("🎯 Project is healthy and ready for use!", "SUCCESS")
        elif error_count <= 2:
            self.log("⚠️ Project has minor issues but should work", "WARNING")
        else:
            self.log("❌ Project has significant issues that need attention", "ERROR")

def main():
    """Main function"""
    print("🏥 TeleDrive Project Health Check")
    print("=" * 50)
    
    checker = ProjectHealthChecker()
    checker.run_health_check()
    
    print("\n✅ Health check completed!")

if __name__ == "__main__":
    main()
