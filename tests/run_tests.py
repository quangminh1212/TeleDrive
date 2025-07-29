#!/usr/bin/env python3
"""
TeleDrive Test Runner
Comprehensive test execution script with reporting and coverage
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
import time

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

class TestRunner:
    """Test runner with various options and reporting"""
    
    def __init__(self):
        self.project_root = project_root
        self.tests_dir = self.project_root / 'tests'
        self.coverage_dir = self.project_root / 'coverage'
        self.reports_dir = self.project_root / 'test-reports'
        
        # Create directories
        self.coverage_dir.mkdir(exist_ok=True)
        self.reports_dir.mkdir(exist_ok=True)
    
    def run_unit_tests(self, verbose=False, coverage=True):
        """Run unit tests"""
        print("🧪 Running Unit Tests...")
        
        cmd = ['python', '-m', 'pytest', 'tests/unit/', '-v' if verbose else '-q']
        
        if coverage:
            cmd.extend([
                '--cov=source',
                '--cov-report=html:coverage/unit',
                '--cov-report=term-missing',
                '--cov-report=xml:coverage/unit-coverage.xml'
            ])
        
        cmd.extend([
            '--html=test-reports/unit-report.html',
            '--self-contained-html',
            '-m', 'unit'
        ])
        
        return self._run_command(cmd)
    
    def run_integration_tests(self, verbose=False, coverage=True):
        """Run integration tests"""
        print("🔗 Running Integration Tests...")
        
        cmd = ['python', '-m', 'pytest', 'tests/integration/', '-v' if verbose else '-q']
        
        if coverage:
            cmd.extend([
                '--cov=source',
                '--cov-report=html:coverage/integration',
                '--cov-report=term-missing',
                '--cov-report=xml:coverage/integration-coverage.xml'
            ])
        
        cmd.extend([
            '--html=test-reports/integration-report.html',
            '--self-contained-html',
            '-m', 'integration'
        ])
        
        return self._run_command(cmd)
    
    def run_all_tests(self, verbose=False, coverage=True):
        """Run all tests"""
        print("🚀 Running All Tests...")
        
        cmd = ['python', '-m', 'pytest', 'tests/', '-v' if verbose else '-q']
        
        if coverage:
            cmd.extend([
                '--cov=source',
                '--cov-report=html:coverage/all',
                '--cov-report=term-missing',
                '--cov-report=xml:coverage/all-coverage.xml'
            ])
        
        cmd.extend([
            '--html=test-reports/all-tests-report.html',
            '--self-contained-html'
        ])
        
        return self._run_command(cmd)
    
    def run_security_tests(self):
        """Run security tests"""
        print("🔒 Running Security Tests...")
        
        # Run bandit for security issues
        print("  Running Bandit security scan...")
        bandit_cmd = [
            'python', '-m', 'bandit', '-r', 'source/',
            '-f', 'json', '-o', 'test-reports/bandit-report.json'
        ]
        bandit_result = self._run_command(bandit_cmd, check=False)
        
        # Run safety for dependency vulnerabilities
        print("  Running Safety dependency scan...")
        safety_cmd = [
            'python', '-m', 'safety', 'check',
            '--json', '--output', 'test-reports/safety-report.json'
        ]
        safety_result = self._run_command(safety_cmd, check=False)
        
        # Run security-specific tests
        security_cmd = [
            'python', '-m', 'pytest', 'tests/', '-v',
            '-m', 'security',
            '--html=test-reports/security-report.html',
            '--self-contained-html'
        ]
        security_test_result = self._run_command(security_cmd, check=False)
        
        return bandit_result == 0 and safety_result == 0 and security_test_result == 0
    
    def run_performance_tests(self):
        """Run performance tests"""
        print("⚡ Running Performance Tests...")
        
        cmd = [
            'python', '-m', 'pytest', 'tests/', '-v',
            '-m', 'performance',
            '--benchmark-only',
            '--benchmark-html=test-reports/benchmark-report.html',
            '--html=test-reports/performance-report.html',
            '--self-contained-html'
        ]
        
        return self._run_command(cmd, check=False)
    
    def run_code_quality_checks(self):
        """Run code quality checks"""
        print("✨ Running Code Quality Checks...")
        
        # Run flake8
        print("  Running flake8...")
        flake8_cmd = [
            'python', '-m', 'flake8', 'source/', 'tests/',
            '--output-file=test-reports/flake8-report.txt',
            '--max-line-length=120'
        ]
        flake8_result = self._run_command(flake8_cmd, check=False)
        
        # Run black check
        print("  Running black check...")
        black_cmd = ['python', '-m', 'black', '--check', 'source/', 'tests/']
        black_result = self._run_command(black_cmd, check=False)
        
        # Run isort check
        print("  Running isort check...")
        isort_cmd = ['python', '-m', 'isort', '--check-only', 'source/', 'tests/']
        isort_result = self._run_command(isort_cmd, check=False)
        
        return flake8_result == 0 and black_result == 0 and isort_result == 0
    
    def run_specific_test(self, test_path, verbose=False):
        """Run a specific test file or test function"""
        print(f"🎯 Running Specific Test: {test_path}")
        
        cmd = [
            'python', '-m', 'pytest', test_path,
            '-v' if verbose else '-q',
            '--html=test-reports/specific-test-report.html',
            '--self-contained-html'
        ]
        
        return self._run_command(cmd)
    
    def generate_coverage_report(self):
        """Generate comprehensive coverage report"""
        print("📊 Generating Coverage Report...")
        
        # Combine coverage data
        combine_cmd = ['python', '-m', 'coverage', 'combine']
        self._run_command(combine_cmd, check=False)
        
        # Generate HTML report
        html_cmd = [
            'python', '-m', 'coverage', 'html',
            '-d', 'coverage/combined'
        ]
        self._run_command(html_cmd, check=False)
        
        # Generate XML report
        xml_cmd = [
            'python', '-m', 'coverage', 'xml',
            '-o', 'coverage/combined-coverage.xml'
        ]
        self._run_command(xml_cmd, check=False)
        
        # Show coverage report
        report_cmd = ['python', '-m', 'coverage', 'report']
        return self._run_command(report_cmd, check=False)
    
    def _run_command(self, cmd, check=True):
        """Run a command and return exit code"""
        try:
            result = subprocess.run(cmd, cwd=self.project_root, check=check)
            return result.returncode
        except subprocess.CalledProcessError as e:
            if check:
                print(f"❌ Command failed: {' '.join(cmd)}")
                print(f"   Exit code: {e.returncode}")
            return e.returncode
        except FileNotFoundError:
            print(f"❌ Command not found: {cmd[0]}")
            print("   Make sure all test dependencies are installed:")
            print("   pip install -r tests/requirements-test.txt")
            return 1
    
    def print_summary(self, results):
        """Print test results summary"""
        print("\n" + "="*60)
        print("📋 TEST RESULTS SUMMARY")
        print("="*60)
        
        total_tests = len(results)
        passed_tests = sum(1 for result in results.values() if result == 0)
        failed_tests = total_tests - passed_tests
        
        for test_type, result in results.items():
            status = "✅ PASSED" if result == 0 else "❌ FAILED"
            print(f"{test_type:30} {status}")
        
        print("-"*60)
        print(f"Total: {total_tests}, Passed: {passed_tests}, Failed: {failed_tests}")
        
        if failed_tests == 0:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {failed_tests} test suite(s) failed")
        
        print(f"\n📁 Reports saved to: {self.reports_dir}")
        print(f"📊 Coverage reports: {self.coverage_dir}")

def main():
    """Main test runner function"""
    parser = argparse.ArgumentParser(description='TeleDrive Test Runner')
    parser.add_argument('--unit', action='store_true', help='Run unit tests only')
    parser.add_argument('--integration', action='store_true', help='Run integration tests only')
    parser.add_argument('--security', action='store_true', help='Run security tests only')
    parser.add_argument('--performance', action='store_true', help='Run performance tests only')
    parser.add_argument('--quality', action='store_true', help='Run code quality checks only')
    parser.add_argument('--test', type=str, help='Run specific test file or function')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--no-coverage', action='store_true', help='Disable coverage reporting')
    parser.add_argument('--all', action='store_true', help='Run all tests and checks')
    
    args = parser.parse_args()
    
    runner = TestRunner()
    results = {}
    
    start_time = time.time()
    
    print("🚀 TeleDrive Test Suite")
    print("="*60)
    
    coverage = not args.no_coverage
    
    if args.test:
        # Run specific test
        results['Specific Test'] = runner.run_specific_test(args.test, args.verbose)
    elif args.unit:
        results['Unit Tests'] = runner.run_unit_tests(args.verbose, coverage)
    elif args.integration:
        results['Integration Tests'] = runner.run_integration_tests(args.verbose, coverage)
    elif args.security:
        results['Security Tests'] = runner.run_security_tests()
    elif args.performance:
        results['Performance Tests'] = runner.run_performance_tests()
    elif args.quality:
        results['Code Quality'] = runner.run_code_quality_checks()
    elif args.all:
        # Run everything
        results['Unit Tests'] = runner.run_unit_tests(args.verbose, coverage)
        results['Integration Tests'] = runner.run_integration_tests(args.verbose, coverage)
        results['Security Tests'] = runner.run_security_tests()
        results['Performance Tests'] = runner.run_performance_tests()
        results['Code Quality'] = runner.run_code_quality_checks()
        
        if coverage:
            runner.generate_coverage_report()
    else:
        # Default: run unit and integration tests
        results['Unit Tests'] = runner.run_unit_tests(args.verbose, coverage)
        results['Integration Tests'] = runner.run_integration_tests(args.verbose, coverage)
        
        if coverage:
            runner.generate_coverage_report()
    
    end_time = time.time()
    duration = end_time - start_time
    
    runner.print_summary(results)
    print(f"\n⏱️  Total execution time: {duration:.2f} seconds")
    
    # Exit with error code if any tests failed
    exit_code = 0 if all(result == 0 for result in results.values()) else 1
    sys.exit(exit_code)

if __name__ == '__main__':
    main()
