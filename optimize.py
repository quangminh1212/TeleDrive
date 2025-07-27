#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TeleDrive Optimization Script
Script tối ưu hóa dự án: kiểm tra imports, dependencies, code quality
"""

import ast
import os
import sys
from pathlib import Path
from collections import defaultdict

def analyze_imports(file_path):
    """Phân tích imports trong một file Python"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        tree = ast.parse(content)
        imports = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ''
                for alias in node.names:
                    imports.append(f"{module}.{alias.name}" if module else alias.name)

        return imports
    except Exception as e:
        print(f"❌ Lỗi phân tích {file_path}: {e}")
        return []

def find_python_files():
    """Tìm tất cả file Python trong dự án"""
    python_files = []
    for root, dirs, files in os.walk('.'):
        # Bỏ qua thư mục venv và __pycache__
        dirs[:] = [d for d in dirs if d not in ['venv', '__pycache__', '.git']]

        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))

    return python_files

def check_unused_imports():
    """Kiểm tra imports có thể không sử dụng"""
    print("🔍 Kiểm tra imports không sử dụng...")

    python_files = find_python_files()
    all_imports = defaultdict(list)

    for file_path in python_files:
        imports = analyze_imports(file_path)
        for imp in imports:
            all_imports[imp].append(file_path)

    # Hiển thị thống kê
    print(f"   📊 Tìm thấy {len(python_files)} file Python")
    print(f"   📊 Tổng số imports: {len(all_imports)}")

    # Tìm imports chỉ xuất hiện 1 lần (có thể không sử dụng)
    single_use_imports = {imp: files for imp, files in all_imports.items() if len(files) == 1}

    if single_use_imports:
        print(f"   ⚠️ Tìm thấy {len(single_use_imports)} imports có thể không sử dụng:")
        for imp, files in list(single_use_imports.items())[:10]:  # Hiển thị 10 đầu tiên
            print(f"      - {imp} trong {files[0]}")
        if len(single_use_imports) > 10:
            print(f"      ... và {len(single_use_imports) - 10} imports khác")

def check_file_sizes():
    """Kiểm tra kích thước file"""
    print("📏 Kiểm tra kích thước file...")

    large_files = []
    total_size = 0

    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ['venv', '__pycache__', '.git']]

        for file in files:
            file_path = os.path.join(root, file)
            try:
                size = os.path.getsize(file_path)
                total_size += size

                # File lớn hơn 100KB
                if size > 100 * 1024:
                    large_files.append((file_path, size))
            except Exception:
                continue

    print(f"   📊 Tổng kích thước dự án: {total_size / 1024 / 1024:.1f} MB")

    if large_files:
        large_files.sort(key=lambda x: x[1], reverse=True)
        print(f"   📊 File lớn nhất:")
        for file_path, size in large_files[:5]:
            print(f"      - {file_path}: {size / 1024:.1f} KB")

def check_code_quality():
    """Kiểm tra chất lượng code cơ bản"""
    print("✨ Kiểm tra chất lượng code...")

    python_files = find_python_files()
    issues = []

    for file_path in python_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            # Kiểm tra dòng quá dài
            long_lines = [(i+1, line.rstrip()) for i, line in enumerate(lines) if len(line) > 120]
            if long_lines:
                issues.append(f"{file_path}: {len(long_lines)} dòng quá dài (>120 ký tự)")

            # Kiểm tra trailing whitespace
            trailing_ws = [i+1 for i, line in enumerate(lines) if line.rstrip() != line.rstrip('\n')]
            if trailing_ws:
                issues.append(f"{file_path}: {len(trailing_ws)} dòng có trailing whitespace")

        except Exception:
            continue

    if issues:
        print(f"   ⚠️ Tìm thấy {len(issues)} vấn đề code quality:")
        for issue in issues[:10]:
            print(f"      - {issue}")
        if len(issues) > 10:
            print(f"      ... và {len(issues) - 10} vấn đề khác")
    else:
        print("   ✅ Không tìm thấy vấn đề code quality")

def check_dependencies():
    """Kiểm tra dependencies trong requirements.txt"""
    print("📦 Kiểm tra dependencies...")

    req_file = Path("requirements.txt")
    if req_file.exists():
        with open(req_file, 'r') as f:
            deps = [line.strip() for line in f if line.strip() and not line.startswith('#')]

        print(f"   📊 Tìm thấy {len(deps)} dependencies:")
        for dep in deps:
            print(f"      - {dep}")
    else:
        print("   ❌ Không tìm thấy requirements.txt")

def main():
    """Main optimization function"""
    print("🚀 Bắt đầu tối ưu hóa dự án TeleDrive...")
    print("=" * 60)

    check_unused_imports()
    print()

    check_file_sizes()
    print()

    check_code_quality()
    print()

    check_dependencies()
    print()

    print("=" * 60)
    print("✅ Hoàn thành phân tích tối ưu hóa!")
    print("💡 Gợi ý:")
    print("   - Xem xét xóa imports không sử dụng")
    print("   - Tối ưu file lớn nếu cần")
    print("   - Sửa các vấn đề code quality")

if __name__ == '__main__':
    main()
