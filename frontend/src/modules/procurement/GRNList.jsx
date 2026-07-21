import React from 'react';
import { Plus } from 'lucide-react';

const GRNList = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Goods Receiving (GRN)</h1>
        <button className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(216,27,96,0.3)]">
          <Plus size={18} /> Create GRN
        </button>
      </div>

      <div className="glass-panel p-8 text-center text-gray-600">
        GRN list table will be implemented here.
      </div>
    </div>
  );
};

export default GRNList;
