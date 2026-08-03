import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

const SearchableSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Search & select item...',
  required = false,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find currently selected option
  const selectedOption = options.find(opt => 
    opt.value === value || opt._id === value || opt.id === value
  );

  // Filter options based on search query
  const filteredOptions = options.filter(opt => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const labelMatch = (opt.label || opt.name || '').toLowerCase().includes(q);
    const codeMatch = (opt.code || opt.itemCode || opt.vendorCode || opt.customerCode || '').toLowerCase().includes(q);
    const categoryMatch = (opt.category || '').toLowerCase().includes(q);
    const sublabelMatch = (opt.sublabel || '').toLowerCase().includes(q);
    return labelMatch || codeMatch || categoryMatch || sublabelMatch;
  });

  const handleSelect = (option) => {
    const val = option.value || option._id || option.id;
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={containerRef}>
      {/* Target Trigger Input */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-white border ${
          isOpen ? 'border-[var(--color-primary)] ring-2 ring-pink-500/20' : 'border-pink-200/80 hover:border-pink-300'
        } rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 shadow-sm transition-all flex items-center justify-between cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {selectedOption ? (
            <div className="truncate flex items-center gap-2">
              <span className="truncate text-gray-900 font-extrabold">{selectedOption.label || selectedOption.name}</span>
              {(selectedOption.code || selectedOption.itemCode) && (
                <span className="px-1.5 py-0.5 rounded bg-pink-50 text-[var(--color-primary)] font-mono text-[10px] font-bold border border-pink-100">
                  {selectedOption.code || selectedOption.itemCode}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown 
            size={16} 
            className={`text-[var(--color-primary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </div>

      {/* Hidden required input for form validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required
          className="opacity-0 absolute inset-0 pointer-events-none -z-10"
        />
      )}

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-pink-200/90 shadow-2xl rounded-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in duration-150">
          {/* Live Search Input Bar inside dropdown */}
          <div className="p-2.5 border-b border-gray-100 bg-gray-50/80">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" />
              <input
                type="text"
                autoFocus
                placeholder="Type to search product or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-pink-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-gray-50">
            {filteredOptions.map((option) => {
              const optVal = option.value || option._id || option.id;
              const isSelected = optVal === value;

              return (
                <div
                  key={optVal}
                  onClick={() => handleSelect(option)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-pink-50 text-[var(--color-primary)] font-extrabold' 
                      : 'hover:bg-pink-50/50 text-gray-800 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{option.label || option.name}</span>
                    {(option.code || option.itemCode) && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-bold border border-gray-200">
                        {option.code || option.itemCode}
                      </span>
                    )}
                    {option.sublabel && (
                      <span className="text-[10px] text-gray-400 font-normal">({option.sublabel})</span>
                    )}
                  </div>
                  {isSelected && <Check size={14} className="text-[var(--color-primary)] shrink-0 ml-2" />}
                </div>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400 font-medium">
                No matching items found for "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
