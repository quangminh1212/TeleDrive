#!/usr/bin/env python3
"""
Automated Testing Script for TeleDrive Checklist
Runs tests and updates checklist with results
"""

import sys
import os
import argparse
import subprocess
import json
import time
from pathlib import Path

sys.path.append('source')

class ChecklistTester:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.results = {}
        self.checklist_file = "TESTING_CHECKLIST.md"
        
    def log(self, message, level="INFO"):
        """Log message with timestamp"""
        timestamp = time.strftime("%H:%M:%S")
        if self.verbose or level in ["ERROR", "SUCCESS"]:
            print(f"[{timestamp}] {level}: {message}")
    
    def run_test_script(self, script_name, description):
        """Run a test script and return result"""
        self.log(f"Running {description}...")
        
        try:
            result = subprocess.run(
                [sys.executable, script_name],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                self.log(f"✅ {description} PASSED", "SUCCESS")
                return True
            else:
                self.log(f"❌ {description} FAILED", "ERROR")
                if self.verbose:
                    self.log(f"Error output: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            self.log(f"⏰ {description} TIMEOUT", "ERROR")
            return False
        except Exception as e:
            self.log(f"💥 {description} EXCEPTION: {e}", "ERROR")
            return False
    
    def test_basic_functionality(self):
        """Test basic functionality"""
        self.log("🧪 TESTING BASIC FUNCTIONALITY")
        
        tests = [
            ("check_syntax_imports.py", "Syntax & Imports"),
            ("check_configuration.py", "Configuration"),
            ("check_database.py", "Database Integrity"),
        ]
        
        results = {}
        for script, desc in tests:
            if os.path.exists(script):
                results[desc] = self.run_test_script(script, desc)
            else:
                self.log(f"⚠️ {script} not found", "WARNING")
                results[desc] = False
        
        return results
    
    def test_comprehensive_functionality(self):
        """Test comprehensive functionality"""
        self.log("🔧 TESTING COMPREHENSIVE FUNCTIONALITY")
        
        tests = [
            ("comprehensive_test_suite.py", "Comprehensive Functionality"),
            ("advanced_edge_case_tests.py", "Advanced Edge Cases"),
            ("telegram_integration_test.py", "Telegram Integration"),
        ]
        
        results = {}
        for script, desc in tests:
            if os.path.exists(script):
                results[desc] = self.run_test_script(script, desc)
            else:
                self.log(f"⚠️ {script} not found", "WARNING")
                results[desc] = False
        
        return results
    
    def test_server_connectivity(self):
        """Test if server is running"""
        self.log("🌐 TESTING SERVER CONNECTIVITY")
        
        try:
            import requests
            response = requests.get("http://127.0.0.1:3000", timeout=5)
            if response.status_code in [200, 302]:
                self.log("✅ Server is running", "SUCCESS")
                return True
            else:
                self.log(f"❌ Server returned {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Server not accessible: {e}", "ERROR")
            return False
    
    def generate_test_report(self, all_results):
        """Generate test report"""
        self.log("📊 GENERATING TEST REPORT")
        
        total_tests = sum(len(results) for results in all_results.values())
        passed_tests = sum(
            sum(1 for result in results.values() if result)
            for results in all_results.values()
        )
        
        report = f"""
# 📊 AUTOMATED TEST REPORT

**Date**: {time.strftime("%Y-%m-%d %H:%M:%S")}
**Total Tests**: {total_tests}
**Passed**: {passed_tests}
**Failed**: {total_tests - passed_tests}
**Success Rate**: {(passed_tests/total_tests*100):.1f}%

## Test Results:

"""
        
        for category, results in all_results.items():
            report += f"### {category}\n"
            for test_name, result in results.items():
                status = "✅ PASS" if result else "❌ FAIL"
                report += f"- {status}: {test_name}\n"
            report += "\n"
        
        # Save report
        with open("TEST_REPORT.md", "w", encoding="utf-8") as f:
            f.write(report)
        
        self.log(f"📄 Test report saved to TEST_REPORT.md", "SUCCESS")
        
        return passed_tests, total_tests
    
    def update_checklist_status(self, all_results):
        """Update checklist with test results"""
        self.log("📋 UPDATING CHECKLIST STATUS")
        
        # This is a simplified version - in practice, you'd map specific tests
        # to specific checklist items
        
        status_summary = f"""
<!-- AUTO-GENERATED TEST STATUS -->
## 🤖 AUTOMATED TEST STATUS

**Last Updated**: {time.strftime("%Y-%m-%d %H:%M:%S")}

### Quick Status:
"""
        
        for category, results in all_results.items():
            passed = sum(1 for result in results.values() if result)
            total = len(results)
            percentage = (passed/total*100) if total > 0 else 0
            
            if percentage >= 90:
                status = "✅"
            elif percentage >= 70:
                status = "⚠️"
            else:
                status = "❌"
            
            status_summary += f"- {status} **{category}**: {passed}/{total} ({percentage:.0f}%)\n"
        
        # Read current checklist
        if os.path.exists(self.checklist_file):
            with open(self.checklist_file, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Remove old auto-generated section if exists
            if "<!-- AUTO-GENERATED TEST STATUS -->" in content:
                start = content.find("<!-- AUTO-GENERATED TEST STATUS -->")
                end = content.find("---", start + 1)
                if end != -1:
                    content = content[:start] + content[end:]
            
            # Add new status at the top
            lines = content.split('\n')
            insert_pos = 1  # After the title
            lines.insert(insert_pos, status_summary + "\n---\n")
            
            # Write back
            with open(self.checklist_file, "w", encoding="utf-8") as f:
                f.write('\n'.join(lines))
            
            self.log("✅ Checklist updated with test status", "SUCCESS")
    
    def run_all_tests(self, basic_only=False):
        """Run all tests"""
        self.log("🚀 STARTING AUTOMATED TESTING")
        
        all_results = {}
        
        # Check server connectivity first
        server_running = self.test_server_connectivity()
        all_results["Server Connectivity"] = {"Server Running": server_running}
        
        # Run basic tests
        basic_results = self.test_basic_functionality()
        all_results["Basic Functionality"] = basic_results
        
        # Run comprehensive tests if not basic only and server is running
        if not basic_only and server_running:
            comprehensive_results = self.test_comprehensive_functionality()
            all_results["Comprehensive Tests"] = comprehensive_results
        elif not server_running:
            self.log("⚠️ Skipping comprehensive tests - server not running", "WARNING")
        
        # Generate report
        passed, total = self.generate_test_report(all_results)
        
        # Update checklist
        self.update_checklist_status(all_results)
        
        # Final summary
        self.log("🎯 TESTING COMPLETED", "SUCCESS")
        self.log(f"📊 Results: {passed}/{total} tests passed ({(passed/total*100):.1f}%)")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED!", "SUCCESS")
            return True
        else:
            self.log(f"⚠️ {total-passed} tests failed", "WARNING")
            return False

def main():
    parser = argparse.ArgumentParser(description="Run TeleDrive testing checklist")
    parser.add_argument("--basic", action="store_true", help="Run only basic tests")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    tester = ChecklistTester(verbose=args.verbose)
    success = tester.run_all_tests(basic_only=args.basic)
    
    if success:
        print("\n✅ All tests completed successfully!")
        exit(0)
    else:
        print("\n❌ Some tests failed. Check TEST_REPORT.md for details.")
        exit(1)

if __name__ == "__main__":
    main()
