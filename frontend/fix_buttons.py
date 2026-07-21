import os
import re

directory = r"C:\Users\HIG Ajay\ice_cream\frontend\src"

count = 0
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".jsx"):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Replace text-gray-900 with text-white if it's on a button with bg-[var(--color-primary)]
            # Actually, let's just find `text-gray-900` that appears inside the same class string as `bg-[var(--color-primary)]`
            
            def replace_in_class(match):
                class_str = match.group(0)
                if 'bg-[var(--color-primary)]' in class_str or 'bg-pink' in class_str or 'bg-red' in class_str:
                    class_str = class_str.replace('text-gray-900', 'text-white')
                return class_str
                
            new_content = re.sub(r'className="[^"]+"', replace_in_class, content)
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count += 1
                print(f"Fixed buttons in {file}")

print(f"Total files updated: {count}")
