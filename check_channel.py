#!/usr/bin/env python3
"""
Simple script to check if channel is configured
"""

import json
import sys

try:
    with open('config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    channel = config.get('channels', {}).get('default_channel', '')
    
    # Check if channel is configured (not empty and not placeholder)
    if channel and channel not in ['', '@your_channel_here']:
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure
        
except Exception:
    sys.exit(1)  # Failure on any error
