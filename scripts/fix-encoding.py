#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix encoding issues in TypeScript files
"""

import os
import re

SRC_DIR = r"D:\Coding\OpenOxygen\src"

# Characters to replace
REPLACEMENTS = [
    ("鈥?", "-"),
    ("鈥", "-"),
    ("€", "-"),
]

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        original = content
        for old, new in REPLACEMENTS:
            content = content.replace(old, new)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed: {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

def walk_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.ts'):
                filepath = os.path.join(root, file)
                fix_file(filepath)

if __name__ == "__main__":
    print("Starting encoding fix...")
    walk_directory(SRC_DIR)
    print("Encoding fix complete!")
