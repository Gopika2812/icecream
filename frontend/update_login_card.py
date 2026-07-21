import re

filepath = r"C:\Users\HIG Ajay\ice_cream\frontend\src\modules\auth\Login.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Revert overlay
content = content.replace('bg-[var(--color-primary)]/70', 'bg-white/40')

# Change glass-panel
content = content.replace(
    'className="glass-panel w-full max-w-md p-8 relative overflow-hidden z-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]"',
    'className="glass-panel w-full max-w-md p-8 relative overflow-hidden z-10 shadow-[0_8px_32px_0_rgba(216,27,96,0.4)] !bg-[var(--color-primary)]/90 border-pink-300/30"'
)

# Update text colors to white/pink-100 for readability on the vibrant pink card
content = content.replace('text-gray-900', 'text-white')
content = content.replace('text-gray-700', 'text-white')
content = content.replace('text-gray-600', 'text-pink-100')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Login.jsx for pink card")
