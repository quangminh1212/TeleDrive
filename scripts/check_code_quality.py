#!/usr/bin/env python3
"""
Code Quality Checker for TeleDrive
Analyzes JavaScript code for common issues and best practices
"""

import re
import os
from pathlib import Path
from typing import List, Dict, Tuple


class CodeQualityChecker:
    """Checks JavaScript code quality and best practices"""
    
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.suggestions = []
    
    def check_file(self, file_path: str) -> Dict[str, List[str]]:
        """Check a single file for code quality issues"""
        self.issues = []
        self.warnings = []
        self.suggestions = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
            
            self._check_javascript_quality(content, lines)
            
            return {
                'issues': self.issues,
                'warnings': self.warnings,
                'suggestions': self.suggestions
            }
            
        except Exception as e:
            return {'issues': [f"Error reading file: {e}"], 'warnings': [], 'suggestions': []}
    
    def _check_javascript_quality(self, content: str, lines: List[str]):
        """Check JavaScript-specific quality issues"""
        
        # Check for console.log statements (should be removed in production)
        console_logs = re.findall(r'console\.log\(.*?\)', content)
        if console_logs:
            self.warnings.append(f"Found {len(console_logs)} console.log statements - consider removing for production")
        
        # Check for TODO/FIXME comments
        todos = re.findall(r'//.*?(?:TODO|FIXME|HACK).*', content, re.IGNORECASE)
        if todos:
            self.suggestions.append(f"Found {len(todos)} TODO/FIXME comments - consider addressing these")
        
        # Check for inline event handlers (security issue)
        inline_events = re.findall(r'on\w+\s*=\s*["\'].*?["\']', content)
        if inline_events:
            self.issues.append(f"Found {len(inline_events)} inline event handlers - use addEventListener instead")
        
        # Check for eval() usage (security issue)
        if 'eval(' in content:
            self.issues.append("Found eval() usage - this is a security risk")
        
        # Check for innerHTML with user data (potential XSS)
        innerHTML_matches = re.findall(r'\.innerHTML\s*=\s*.*?\+.*?', content)
        if innerHTML_matches:
            self.warnings.append(f"Found {len(innerHTML_matches)} innerHTML assignments with concatenation - check for XSS risks")
        
        # Check for missing JSDoc comments on functions
        function_matches = re.findall(r'function\s+(\w+)\s*\(', content)
        jsdoc_matches = re.findall(r'/\*\*[\s\S]*?\*/\s*function\s+(\w+)', content)
        
        undocumented_functions = set(function_matches) - set(jsdoc_matches)
        if undocumented_functions:
            self.suggestions.append(f"Functions without JSDoc: {', '.join(undocumented_functions)}")
        
        # Check for var usage (should use let/const)
        var_matches = re.findall(r'\bvar\s+\w+', content)
        if var_matches:
            self.suggestions.append(f"Found {len(var_matches)} 'var' declarations - consider using 'let' or 'const'")
        
        # Check for missing semicolons
        missing_semicolons = 0
        for i, line in enumerate(lines):
            line = line.strip()
            if (line and 
                not line.startswith('//') and 
                not line.startswith('/*') and
                not line.endswith(';') and
                not line.endswith('{') and
                not line.endswith('}') and
                not line.endswith(',') and
                re.match(r'.*[a-zA-Z0-9\)\]]\s*$', line)):
                missing_semicolons += 1
        
        if missing_semicolons > 5:  # Only warn if many missing
            self.suggestions.append(f"Potentially {missing_semicolons} missing semicolons")
        
        # Check for long functions (>50 lines)
        function_starts = []
        for i, line in enumerate(lines):
            if re.match(r'\s*function\s+\w+\s*\(', line):
                function_starts.append(i)
        
        long_functions = []
        for start in function_starts:
            brace_count = 0
            for i in range(start, len(lines)):
                line = lines[i]
                brace_count += line.count('{') - line.count('}')
                if brace_count == 0 and i > start:
                    if i - start > 50:
                        func_name = re.search(r'function\s+(\w+)', lines[start])
                        if func_name:
                            long_functions.append(func_name.group(1))
                    break
        
        if long_functions:
            self.suggestions.append(f"Long functions (>50 lines): {', '.join(long_functions)}")
        
        # Check for magic numbers
        magic_numbers = re.findall(r'\b(?<![\w.])\d{3,}\b(?![\w.])', content)
        if len(magic_numbers) > 5:
            self.suggestions.append(f"Found {len(magic_numbers)} potential magic numbers - consider using constants")
        
        # Check for proper error handling
        try_blocks = content.count('try {')
        catch_blocks = content.count('} catch')
        if try_blocks != catch_blocks:
            self.warnings.append("Mismatched try/catch blocks - check error handling")
        
        # Check for async/await without proper error handling
        async_functions = re.findall(r'async\s+function\s+(\w+)', content)
        for func in async_functions:
            func_content = self._extract_function_content(content, func)
            if func_content and 'try' not in func_content and 'catch' not in func_content:
                self.warnings.append(f"Async function '{func}' may need error handling")
    
    def _extract_function_content(self, content: str, func_name: str) -> str:
        """Extract the content of a specific function"""
        pattern = rf'function\s+{func_name}\s*\([^)]*\)\s*\{{'
        match = re.search(pattern, content)
        if not match:
            return ""
        
        start = match.end() - 1
        brace_count = 1
        i = start + 1
        
        while i < len(content) and brace_count > 0:
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
            i += 1
        
        return content[start:i] if brace_count == 0 else ""


def main():
    """Main function to check code quality"""
    checker = CodeQualityChecker()
    project_root = Path(__file__).parent.parent
    
    # Files to check
    files_to_check = [
        project_root / "templates" / "scan.html",
        # Add more files as needed
    ]
    
    total_issues = 0
    total_warnings = 0
    total_suggestions = 0
    
    print("🔍 TeleDrive Code Quality Check")
    print("=" * 50)
    
    for file_path in files_to_check:
        if not file_path.exists():
            print(f"❌ File not found: {file_path}")
            continue
        
        print(f"\n📄 Checking: {file_path.name}")
        print("-" * 30)
        
        results = checker.check_file(str(file_path))
        
        if results['issues']:
            print("🚨 ISSUES:")
            for issue in results['issues']:
                print(f"  • {issue}")
            total_issues += len(results['issues'])
        
        if results['warnings']:
            print("⚠️  WARNINGS:")
            for warning in results['warnings']:
                print(f"  • {warning}")
            total_warnings += len(results['warnings'])
        
        if results['suggestions']:
            print("💡 SUGGESTIONS:")
            for suggestion in results['suggestions']:
                print(f"  • {suggestion}")
            total_suggestions += len(results['suggestions'])
        
        if not any(results.values()):
            print("✅ No issues found!")
    
    print("\n" + "=" * 50)
    print("📊 SUMMARY:")
    print(f"  🚨 Issues: {total_issues}")
    print(f"  ⚠️  Warnings: {total_warnings}")
    print(f"  💡 Suggestions: {total_suggestions}")
    
    if total_issues == 0:
        print("\n🎉 Great! No critical issues found.")
    else:
        print(f"\n🔧 Please address the {total_issues} critical issues.")
    
    return total_issues


if __name__ == "__main__":
    exit(main())
