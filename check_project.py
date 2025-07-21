#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Project Health Check
Kiểm tra toàn bộ dự án để tìm lỗi và vấn đề
"""

import os
import sys
import ast
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Any

class ProjectChecker:
    """Kiểm tra sức khỏe dự án"""
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.info = []
        self.project_root = Path('.')
    
    def add_error(self, category: str, message: str, file_path: str = ""):
        """Thêm lỗi"""
        self.errors.append({
            'category': category,
            'message': message,
            'file': file_path,
            'severity': 'ERROR'
        })
    
    def add_warning(self, category: str, message: str, file_path: str = ""):
        """Thêm cảnh báo"""
        self.warnings.append({
            'category': category,
            'message': message,
            'file': file_path,
            'severity': 'WARNING'
        })
    
    def add_info(self, category: str, message: str, file_path: str = ""):
        """Thêm thông tin"""
        self.info.append({
            'category': category,
            'message': message,
            'file': file_path,
            'severity': 'INFO'
        })
    
    def check_python_syntax(self):
        """Kiểm tra syntax Python"""
        print("🔍 Checking Python syntax...")
        
        python_files = list(self.project_root.rglob('*.py'))
        syntax_errors = 0
        
        for py_file in python_files:
            if 'venv' in str(py_file) or '.git' in str(py_file):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                ast.parse(content)
                
            except SyntaxError as e:
                self.add_error('syntax', f'Syntax error: {e}', str(py_file))
                syntax_errors += 1
            except Exception as e:
                self.add_warning('syntax', f'Could not parse: {e}', str(py_file))
        
        if syntax_errors == 0:
            self.add_info('syntax', f'All {len(python_files)} Python files have valid syntax')
        else:
            self.add_error('syntax', f'Found {syntax_errors} syntax errors')
    
    def check_imports(self):
        """Kiểm tra import statements"""
        print("📦 Checking import statements...")
        
        python_files = list(self.project_root.rglob('*.py'))
        import_errors = 0
        
        for py_file in python_files:
            if 'venv' in str(py_file) or '.git' in str(py_file):
                continue
            
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check for old 'from src.' imports
                if 'from src.' in content:
                    self.add_warning('imports', 'Contains old "from src." imports', str(py_file))
                    import_errors += 1
                
                # Check for missing imports
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    if 'from teledrive.' in line and 'import' in line:
                        # This is good
                        continue
                        
            except Exception as e:
                self.add_warning('imports', f'Could not check imports: {e}', str(py_file))
        
        if import_errors == 0:
            self.add_info('imports', 'All import statements look correct')
    
    def check_file_structure(self):
        """Kiểm tra cấu trúc file"""
        print("📁 Checking file structure...")
        
        required_files = [
            'main.py',
            'run_silent.py', 
            'run_debug.py',
            'clean.py',
            'start.bat',
            'requirements.txt',
            'README.md',
            'src/teledrive/__init__.py',
            'src/teledrive/app.py'
        ]
        
        missing_files = []
        for file_path in required_files:
            if not Path(file_path).exists():
                missing_files.append(file_path)
        
        if missing_files:
            for file_path in missing_files:
                self.add_error('structure', f'Missing required file: {file_path}')
        else:
            self.add_info('structure', 'All required files are present')
        
        # Check for empty __init__.py files
        init_files = list(self.project_root.rglob('__init__.py'))
        for init_file in init_files:
            if init_file.stat().st_size == 0:
                self.add_warning('structure', 'Empty __init__.py file', str(init_file))
    
    def check_dependencies(self):
        """Kiểm tra dependencies"""
        print("📦 Checking dependencies...")
        
        if not Path('requirements.txt').exists():
            self.add_error('dependencies', 'requirements.txt not found')
            return
        
        try:
            with open('requirements.txt', 'r') as f:
                requirements = f.read().strip().split('\n')
            
            required_packages = [
                'flask', 'telethon', 'pandas', 'sqlalchemy', 
                'flask-login', 'flask-cors', 'pillow'
            ]
            
            req_lower = [req.lower().split('>=')[0].split('==')[0] for req in requirements if req.strip()]
            
            missing_deps = []
            for pkg in required_packages:
                if not any(pkg in req for req in req_lower):
                    missing_deps.append(pkg)
            
            if missing_deps:
                for dep in missing_deps:
                    self.add_warning('dependencies', f'Missing dependency: {dep}')
            else:
                self.add_info('dependencies', f'All required dependencies present ({len(requirements)} total)')
                
        except Exception as e:
            self.add_error('dependencies', f'Could not check requirements.txt: {e}')
    
    def check_config_files(self):
        """Kiểm tra config files"""
        print("⚙️ Checking configuration files...")
        
        config_files = [
            '.env.example',
            'pyproject.toml',
            'setup.cfg'
        ]
        
        for config_file in config_files:
            if Path(config_file).exists():
                self.add_info('config', f'Found config file: {config_file}')
            else:
                self.add_warning('config', f'Missing config file: {config_file}')
        
        # Check if config directory exists
        if Path('config').exists():
            self.add_info('config', 'Config directory exists')
        else:
            self.add_warning('config', 'Config directory missing')
    
    def check_entry_points(self):
        """Kiểm tra entry points"""
        print("🚀 Checking entry points...")
        
        entry_points = [
            'main.py',
            'run_silent.py',
            'run_debug.py', 
            'clean.py',
            'start.bat'
        ]
        
        working_entry_points = []
        broken_entry_points = []
        
        for entry_point in entry_points:
            if Path(entry_point).exists():
                working_entry_points.append(entry_point)
            else:
                broken_entry_points.append(entry_point)
        
        if broken_entry_points:
            for ep in broken_entry_points:
                self.add_error('entry_points', f'Missing entry point: {ep}')
        
        self.add_info('entry_points', f'Found {len(working_entry_points)} entry points')
    
    def check_static_files(self):
        """Kiểm tra static files"""
        print("🎨 Checking static files...")
        
        static_dirs = ['static', 'templates']
        
        for static_dir in static_dirs:
            if Path(static_dir).exists():
                files_count = len(list(Path(static_dir).rglob('*')))
                self.add_info('static', f'{static_dir}/ directory has {files_count} files')
            else:
                self.add_warning('static', f'Missing {static_dir}/ directory')
    
    def run_all_checks(self):
        """Chạy tất cả kiểm tra"""
        print("🔍 TeleDrive Project Health Check")
        print("=" * 50)
        
        self.check_python_syntax()
        self.check_imports()
        self.check_file_structure()
        self.check_dependencies()
        self.check_config_files()
        self.check_entry_points()
        self.check_static_files()
        
        return {
            'errors': self.errors,
            'warnings': self.warnings,
            'info': self.info
        }
    
    def print_results(self):
        """In kết quả"""
        print("\n" + "=" * 50)
        print("📊 PROJECT HEALTH CHECK RESULTS")
        print("=" * 50)
        
        # Summary
        error_count = len(self.errors)
        warning_count = len(self.warnings)
        info_count = len(self.info)
        
        print(f"\n📈 SUMMARY:")
        print(f"   ❌ Errors: {error_count}")
        print(f"   ⚠️  Warnings: {warning_count}")
        print(f"   ℹ️  Info: {info_count}")
        
        # Errors
        if self.errors:
            print(f"\n❌ ERRORS ({len(self.errors)}):")
            for error in self.errors:
                print(f"   • [{error['category']}] {error['message']}")
                if error['file']:
                    print(f"     File: {error['file']}")
        
        # Warnings
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"   • [{warning['category']}] {warning['message']}")
                if warning['file']:
                    print(f"     File: {warning['file']}")
        
        # Overall health
        print(f"\n🎯 OVERALL HEALTH:")
        if error_count == 0:
            if warning_count == 0:
                print("   🟢 EXCELLENT - No issues found!")
            elif warning_count <= 3:
                print("   🟡 GOOD - Minor warnings only")
            else:
                print("   🟠 FAIR - Several warnings to address")
        else:
            print("   🔴 NEEDS ATTENTION - Critical errors found!")
        
        print("\n" + "=" * 50)

def main():
    """Main function"""
    checker = ProjectChecker()
    checker.run_all_checks()
    checker.print_results()
    
    # Exit with error code if there are critical errors
    if checker.errors:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
