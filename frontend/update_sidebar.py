import re

filepath = r"C:\Users\HIG Ajay\ice_cream\frontend\src\layouts\DashboardLayout.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Revert Header
header_pattern = r"\{/\* Header \*/\}.*?<\/header>"
original_header = """{/* Header */}
        <header className="h-16 glass-panel border-x-0 border-t-0 rounded-none flex items-center justify-between px-4 lg:px-8 z-10 w-full">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden text-gray-700 hover:text-gray-900 p-1 rounded-md hover:bg-[var(--color-glass)]"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="text-lg font-medium text-gray-800 hidden sm:block">
              {/* Breadcrumbs or Page Title could go here */}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">Current Branch:</span>
            <div className="px-2 sm:px-3 py-1 bg-[var(--color-glass)] border border-[var(--color-glass-border)] rounded-md text-xs sm:text-sm text-gray-900 truncate max-w-[120px] sm:max-w-xs">
              Main Branch
            </div>
          </div>
        </header>"""
content = re.sub(header_pattern, original_header, content, flags=re.DOTALL)


# 2. Update Sidebar Background
content = content.replace(
    'w-64 glass-panel border-y-0 border-l-0', 
    'w-64 bg-[var(--color-primary)] border-y-0 border-l-0 border-r border-pink-400'
)

# 3. Update Sidebar Nav Items
content = content.replace(
    'className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? \'bg-[var(--color-primary-soft)] text-gray-900\' : \'text-gray-600 hover:bg-[var(--color-glass)] hover:text-gray-900\'}`}',
    'className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? \'bg-white/20 text-white font-medium\' : \'text-pink-100 hover:bg-white/10 hover:text-white\'}`}'
)

# 4. Update texts inside sidebar
content = content.replace('<h2 className="text-xl font-bold text-gray-900 tracking-wider">SARAVANASS</h2>', '<h2 className="text-xl font-bold text-white tracking-wider">SARAVANASS</h2>')
content = content.replace('<p className="text-xs text-[var(--color-primary)] mt-1">ERP SYSTEM</p>', '<p className="text-xs text-pink-200 mt-1">ERP SYSTEM</p>')
content = content.replace('className="lg:hidden text-gray-600 hover:text-gray-900"', 'className="lg:hidden text-white hover:text-pink-100"')

# Section titles
content = content.replace('text-gray-500', 'text-pink-200')

# Bottom profile area
content = content.replace('bg-[var(--color-primary)]', 'bg-white text-[var(--color-primary)]')
content = content.replace('<div className="font-medium text-gray-900 truncate">', '<div className="font-medium text-white truncate">')
content = content.replace('<div className="text-xs text-[var(--color-primary)] font-semibold truncate">', '<div className="text-xs text-pink-200 font-semibold truncate">')
content = content.replace('text-red-400 hover:text-red-300', 'text-white hover:text-pink-200')
content = content.replace('hover:bg-[rgba(255,0,0,0.1)]', 'hover:bg-white/10')

# Also revert the profile circle fix
content = content.replace('bg-white text-[var(--color-primary)]/15', 'bg-[var(--color-primary)]/15') # Revert main bg if matched

# Fix profile circle text
content = content.replace('w-10 h-10 min-w-[40px] rounded-full bg-white text-[var(--color-primary)] flex items-center justify-center font-bold text-lg', 'w-10 h-10 min-w-[40px] rounded-full bg-white text-[var(--color-primary)] flex items-center justify-center font-bold text-lg')


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated DashboardLayout.jsx successfully!")
