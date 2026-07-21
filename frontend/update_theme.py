import os
import re

directory = r"C:\Users\HIG Ajay\ice_cream\frontend\src"

replacements = {
    r'\btext-white\b': 'text-gray-900',
    r'\btext-gray-200\b': 'text-gray-800',
    r'\btext-gray-300\b': 'text-gray-700',
    r'\btext-gray-400\b': 'text-gray-600',
    r'bg-\[rgba\(0,0,0,0\.2\)\]': 'bg-white/50',
    r'bg-black/60': 'bg-white/60',
    r'border-\[rgba\(255,255,255,0\.1\)\]': 'border-gray-200'
}

count = 0
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".jsx"):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            new_content = content
            for old, new in replacements.items():
                new_content = re.sub(old, new, new_content)
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count += 1
                print(f"Updated {file}")

print(f"Total files updated: {count}")
