import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'lg', maxWidth = '' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-6xl'
  };

  const chosenWidth = maxWidth || sizeClasses[size] || 'max-w-3xl';

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className={`relative glass-panel w-full ${chosenWidth} mx-auto max-h-[calc(100vh-3.5rem)] flex flex-col shadow-2xl rounded-3xl z-10 animate-in fade-in zoom-in-95 duration-200 border border-white/90 bg-white/95 my-auto overflow-hidden ring-1 ring-black/5`}>
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/90 via-white to-pink-50/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-6 bg-[var(--color-primary)] rounded-full"></div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 font-display tracking-tight">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-7 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
