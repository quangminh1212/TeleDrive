#!/usr/bin/env python3
"""
TeleDrive Security Check Script

Comprehensive security assessment tool for TeleDrive application.
"""

import os
import sys
import json
import subprocess
import requests
from pathlib import Path
from typing import Dict, List, Any, Tuple

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


class SecurityChecker:
    """Comprehensive security checker for TeleDrive."""
    
    def __init__(self):
        self.results = {
            'passed': [],
            'failed': [],
            'warnings': [],
            'info': []
        }
    
    def add_result(self, category: str, test_name: str, status: str, message: str, details: str = ""):
        """Add test result."""
        result = {
            'test': test_name,
            'status': status,
            'message': message,
            'details': details
        }
        self.results[category].append(result)
    
    def check_environment_variables(self):
        """Check for secure environment variable configuration."""
        print("🔐 Checking environment variables...")
        
        required_vars = [
            'SECRET_KEY',
            'TELEGRAM_API_ID',
            'TELEGRAM_API_HASH',
            'DATABASE_URL'
        ]
        
        for var in required_vars:
            if not os.getenv(var):
                self.add_result(
                    'failed',
                    'environment_variables',
                    'FAIL',
                    f'Required environment variable {var} is not set'
                )
            else:
                self.add_result(
                    'passed',
                    'environment_variables',
                    'PASS',
                    f'Environment variable {var} is set'
                )
        
        # Check SECRET_KEY strength
        secret_key = os.getenv('SECRET_KEY', '')
        if len(secret_key) < 32:
            self.add_result(
                'failed',
                'secret_key_strength',
                'FAIL',
                'SECRET_KEY should be at least 32 characters long'
            )
        elif secret_key in ['dev-secret-key', 'test-secret-key', 'your-secret-key-here']:
            self.add_result(
                'failed',
                'secret_key_strength',
                'FAIL',
                'SECRET_KEY appears to be a default/test value'
            )
        else:
            self.add_result(
                'passed',
                'secret_key_strength',
                'PASS',
                'SECRET_KEY appears to be properly configured'
            )
    
    def check_file_permissions(self):
        """Check file and directory permissions."""
        print("📁 Checking file permissions...")
        
        sensitive_files = [
            '.env',
            'config/config.json',
            'instance/teledrive.db',
        ]
        
        for file_path in sensitive_files:
            if os.path.exists(file_path):
                stat_info = os.stat(file_path)
                permissions = oct(stat_info.st_mode)[-3:]
                
                if permissions in ['600', '640']:
                    self.add_result(
                        'passed',
                        'file_permissions',
                        'PASS',
                        f'{file_path} has secure permissions ({permissions})'
                    )
                else:
                    self.add_result(
                        'warnings',
                        'file_permissions',
                        'WARN',
                        f'{file_path} has potentially insecure permissions ({permissions})'
                    )
    
    def check_dependencies_vulnerabilities(self):
        """Check for known vulnerabilities in dependencies."""
        print("📦 Checking dependencies for vulnerabilities...")
        
        try:
            # Run safety check
            result = subprocess.run(
                ['safety', 'check', '--json'],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                self.add_result(
                    'passed',
                    'dependency_vulnerabilities',
                    'PASS',
                    'No known vulnerabilities found in dependencies'
                )
            else:
                try:
                    vulnerabilities = json.loads(result.stdout)
                    for vuln in vulnerabilities:
                        self.add_result(
                            'failed',
                            'dependency_vulnerabilities',
                            'FAIL',
                            f"Vulnerability in {vuln.get('package', 'unknown')}: {vuln.get('advisory', 'No details')}",
                            json.dumps(vuln, indent=2)
                        )
                except json.JSONDecodeError:
                    self.add_result(
                        'warnings',
                        'dependency_vulnerabilities',
                        'WARN',
                        'Could not parse safety check results'
                    )
        
        except subprocess.TimeoutExpired:
            self.add_result(
                'warnings',
                'dependency_vulnerabilities',
                'WARN',
                'Safety check timed out'
            )
        except FileNotFoundError:
            self.add_result(
                'info',
                'dependency_vulnerabilities',
                'INFO',
                'Safety tool not installed - run: pip install safety'
            )
    
    def check_code_security(self):
        """Check code for security issues using bandit."""
        print("🔍 Checking code security...")
        
        try:
            result = subprocess.run(
                ['bandit', '-r', 'src/', '-f', 'json'],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            try:
                bandit_results = json.loads(result.stdout)
                issues = bandit_results.get('results', [])
                
                if not issues:
                    self.add_result(
                        'passed',
                        'code_security',
                        'PASS',
                        'No security issues found in code'
                    )
                else:
                    for issue in issues:
                        severity = issue.get('issue_severity', 'UNKNOWN')
                        confidence = issue.get('issue_confidence', 'UNKNOWN')
                        
                        if severity in ['HIGH', 'MEDIUM']:
                            category = 'failed' if severity == 'HIGH' else 'warnings'
                            self.add_result(
                                category,
                                'code_security',
                                'FAIL' if severity == 'HIGH' else 'WARN',
                                f"{severity} severity issue: {issue.get('issue_text', 'Unknown issue')}",
                                f"File: {issue.get('filename', 'Unknown')}, Line: {issue.get('line_number', 'Unknown')}"
                            )
            
            except json.JSONDecodeError:
                self.add_result(
                    'warnings',
                    'code_security',
                    'WARN',
                    'Could not parse bandit results'
                )
        
        except subprocess.TimeoutExpired:
            self.add_result(
                'warnings',
                'code_security',
                'WARN',
                'Bandit security check timed out'
            )
        except FileNotFoundError:
            self.add_result(
                'info',
                'code_security',
                'INFO',
                'Bandit tool not installed - run: pip install bandit'
            )
    
    def check_docker_security(self):
        """Check Docker configuration security."""
        print("🐳 Checking Docker security...")
        
        dockerfile_path = Path('config/Dockerfile')
        if dockerfile_path.exists():
            content = dockerfile_path.read_text()
            
            # Check for non-root user
            if 'USER ' in content and 'USER root' not in content:
                self.add_result(
                    'passed',
                    'docker_security',
                    'PASS',
                    'Dockerfile uses non-root user'
                )
            else:
                self.add_result(
                    'failed',
                    'docker_security',
                    'FAIL',
                    'Dockerfile should use non-root user'
                )
            
            # Check for HEALTHCHECK
            if 'HEALTHCHECK' in content:
                self.add_result(
                    'passed',
                    'docker_security',
                    'PASS',
                    'Dockerfile includes health check'
                )
            else:
                self.add_result(
                    'warnings',
                    'docker_security',
                    'WARN',
                    'Dockerfile should include HEALTHCHECK instruction'
                )
        else:
            self.add_result(
                'info',
                'docker_security',
                'INFO',
                'No Dockerfile found'
            )
    
    def check_web_security_headers(self, base_url: str = 'http://localhost:5000'):
        """Check web security headers."""
        print("🌐 Checking web security headers...")
        
        try:
            response = requests.get(f'{base_url}/health', timeout=10)
            headers = response.headers
            
            required_headers = {
                'X-Frame-Options': 'Clickjacking protection',
                'X-Content-Type-Options': 'MIME type sniffing protection',
                'X-XSS-Protection': 'XSS protection',
                'Content-Security-Policy': 'Content Security Policy',
                'Strict-Transport-Security': 'HTTPS enforcement'
            }
            
            for header, description in required_headers.items():
                if header in headers:
                    self.add_result(
                        'passed',
                        'security_headers',
                        'PASS',
                        f'{description} header present: {header}'
                    )
                else:
                    self.add_result(
                        'failed',
                        'security_headers',
                        'FAIL',
                        f'Missing {description} header: {header}'
                    )
        
        except requests.RequestException as e:
            self.add_result(
                'info',
                'security_headers',
                'INFO',
                f'Could not check security headers - server not running? ({e})'
            )
    
    def run_all_checks(self):
        """Run all security checks."""
        print("🛡️ Starting TeleDrive Security Assessment")
        print("=" * 50)
        
        self.check_environment_variables()
        self.check_file_permissions()
        self.check_dependencies_vulnerabilities()
        self.check_code_security()
        self.check_docker_security()
        self.check_web_security_headers()
        
        return self.results
    
    def print_results(self):
        """Print formatted results."""
        print("\n" + "=" * 50)
        print("🛡️ SECURITY ASSESSMENT RESULTS")
        print("=" * 50)
        
        # Summary
        total_passed = len(self.results['passed'])
        total_failed = len(self.results['failed'])
        total_warnings = len(self.results['warnings'])
        total_info = len(self.results['info'])
        
        print(f"\n📊 SUMMARY:")
        print(f"   ✅ Passed: {total_passed}")
        print(f"   ❌ Failed: {total_failed}")
        print(f"   ⚠️  Warnings: {total_warnings}")
        print(f"   ℹ️  Info: {total_info}")
        
        # Failed tests
        if self.results['failed']:
            print(f"\n❌ FAILED TESTS ({len(self.results['failed'])}):")
            for result in self.results['failed']:
                print(f"   • {result['message']}")
                if result['details']:
                    print(f"     Details: {result['details']}")
        
        # Warnings
        if self.results['warnings']:
            print(f"\n⚠️  WARNINGS ({len(self.results['warnings'])}):")
            for result in self.results['warnings']:
                print(f"   • {result['message']}")
        
        # Overall assessment
        print(f"\n🎯 OVERALL ASSESSMENT:")
        if total_failed == 0:
            if total_warnings == 0:
                print("   🟢 EXCELLENT - No security issues found!")
            else:
                print("   🟡 GOOD - No critical issues, but some warnings to address")
        else:
            print("   🔴 NEEDS ATTENTION - Critical security issues found!")
        
        print("\n" + "=" * 50)


def main():
    """Main function."""
    checker = SecurityChecker()
    checker.run_all_checks()
    checker.print_results()
    
    # Exit with error code if there are failed tests
    if checker.results['failed']:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
