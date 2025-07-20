#!/usr/bin/env python3
"""
CSS Optimizer for TeleDrive
Removes duplicate CSS rules and optimizes the style.css file
"""

import re
import os
from collections import defaultdict

def analyze_css_file(file_path):
    """Analyze CSS file for duplicates and issues"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all CSS rules
    rules = defaultdict(list)
    
    # Pattern to match CSS rules
    rule_pattern = r'([^{]+)\s*{\s*([^}]+)\s*}'
    matches = re.findall(rule_pattern, content, re.MULTILINE | re.DOTALL)
    
    for selector, properties in matches:
        selector = selector.strip()
        properties = properties.strip()
        rules[selector].append(properties)
    
    # Find duplicates
    duplicates = {}
    for selector, prop_list in rules.items():
        if len(prop_list) > 1:
            duplicates[selector] = prop_list
    
    return rules, duplicates

def find_icon_duplicates(file_path):
    """Find duplicate icon definitions"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all icon::before rules
    icon_pattern = r'(\.icon-[a-z-]+::before)\s*{\s*([^}]+)\s*}'
    matches = re.findall(icon_pattern, content, re.MULTILINE | re.DOTALL)
    
    icon_rules = defaultdict(list)
    for selector, properties in matches:
        icon_rules[selector].append(properties.strip())
    
    # Find duplicates
    duplicates = {}
    for selector, prop_list in icon_rules.items():
        if len(prop_list) > 1:
            duplicates[selector] = prop_list
    
    return icon_rules, duplicates

def optimize_css(input_file, output_file):
    """Optimize CSS by removing duplicates and organizing"""
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Original file size: {len(content)} characters")
    
    # Analyze duplicates
    rules, duplicates = analyze_css_file(input_file)
    icon_rules, icon_duplicates = find_icon_duplicates(input_file)
    
    print(f"Found {len(duplicates)} duplicate CSS rules")
    print(f"Found {len(icon_duplicates)} duplicate icon rules")
    
    # Show some examples
    if duplicates:
        print("\nDuplicate CSS rules:")
        for selector, prop_list in list(duplicates.items())[:5]:
            print(f"  {selector}: {len(prop_list)} definitions")
    
    if icon_duplicates:
        print("\nDuplicate icon rules:")
        for selector, prop_list in list(icon_duplicates.items())[:10]:
            print(f"  {selector}: {len(prop_list)} definitions")
            for i, props in enumerate(prop_list):
                print(f"    {i+1}: {props[:50]}...")
    
    # For now, just copy the file (we'll implement optimization later)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\nAnalysis complete. Results saved to {output_file}")
    return len(duplicates), len(icon_duplicates)

def main():
    """Main function"""
    css_file = os.path.join(os.path.dirname(__file__), '..', 'static', 'css', 'style.css')
    output_file = os.path.join(os.path.dirname(__file__), '..', 'static', 'css', 'style_optimized.css')
    
    if not os.path.exists(css_file):
        print(f"CSS file not found: {css_file}")
        return
    
    print("Analyzing CSS file for optimization opportunities...")
    duplicate_rules, duplicate_icons = optimize_css(css_file, output_file)
    
    print(f"\nSummary:")
    print(f"- Duplicate CSS rules: {duplicate_rules}")
    print(f"- Duplicate icon rules: {duplicate_icons}")
    print(f"- Optimization potential: High" if duplicate_rules > 10 or duplicate_icons > 10 else "- Optimization potential: Low")

if __name__ == '__main__':
    main()
