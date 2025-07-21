#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple config checker - just check if basic files exist
"""

import os
import sys

def check_basic_setup():
    """Check basic setup without requiring full config"""
    try:
        # Check if config directory exists
        if not os.path.exists('config'):
            print("Config directory not found")
            return False
        
        # Check if config.json exists
        if not os.path.exists('config/config.json'):
            print("config.json not found")
            return False
        
        # Try to load config
        import json
        try:
            with open('config/config.json', 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Basic validation - just check if it's valid JSON
            if isinstance(config, dict):
                return True
            else:
                print("Invalid config format")
                return False
                
        except json.JSONDecodeError:
            print("Invalid JSON in config file")
            return False
        except Exception as e:
            print(f"Error reading config: {e}")
            return False
            
    except Exception as e:
        print(f"Setup check failed: {e}")
        return False

if __name__ == '__main__':
    if check_basic_setup():
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure
