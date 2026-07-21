import os

files = [
    r"C:\Users\HIG Ajay\ice_cream\frontend\src\modules\procurement\ProductList.jsx",
    r"C:\Users\HIG Ajay\ice_cream\frontend\src\modules\procurement\CustomerList.jsx"
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replacing the black background with white/50 for select inputs and white for options
    content = content.replace('bg-[#1a1525]', 'bg-white/50')
    
    # If the option tags got bg-white/50, change them to bg-white
    content = content.replace('className="bg-white/50 text-gray-900"', 'className="bg-white text-gray-900"')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed black fields in products and customers!")
