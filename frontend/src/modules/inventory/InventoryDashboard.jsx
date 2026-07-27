import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Loader2, Package, ShieldAlert, ThermometerSnowflake, ShieldCheck } from 'lucide-react';

const InventoryDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory');
      setInventory(response.data.data);
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter inventory based on selected tab
  const filteredInventory = inventory.filter(item => {
    if (activeTab === 'All') return true;
    return item.inventoryType === activeTab;
  });

  // Calculate quick stats
  const storeRoomCount = inventory.filter(i => i.inventoryType === 'Store Room').reduce((acc, i) => acc + i.quantity, 0);
  const coldRoomCount = inventory.filter(i => i.inventoryType === 'Cold Room').reduce((acc, i) => acc + i.quantity, 0);
  const rejectedCount = inventory.filter(i => i.inventoryType === 'Rejected Stock').reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 font-display">Inventory Stock Levels</h1>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="glass-panel p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-200">
            <Package size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Store Room Stock (Ingredients)</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{storeRoomCount.toLocaleString()} units</h3>
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-200">
            <ThermometerSnowflake size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Cold Room Stock (Finished Ice Cream)</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{coldRoomCount.toLocaleString()} units</h3>
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 border border-rose-200">
            <ShieldAlert size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Damaged / Rejected Stock (Returns)</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{rejectedCount.toLocaleString()} units</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--color-glass-border)] pb-px">
        {['All', 'Store Room', 'Cold Room', 'Rejected Stock'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 -mb-px ${
              activeTab === tab 
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stock Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={20} />
            Loading stock levels...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                <tr>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Item Code</th>
                  <th className="px-6 py-4">Material / Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Inventory Location</th>
                  <th className="px-6 py-4">Current Stock</th>
                  <th className="px-6 py-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {filteredInventory.map((item) => (
                  <tr key={item._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.branch?.branchName}</td>
                    <td className="px-6 py-4 font-mono text-xs">{item.product?.itemCode}</td>
                    <td className="px-6 py-4 font-medium">{item.product?.name}</td>
                    <td className="px-6 py-4">{item.product?.category}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.inventoryType === 'Store Room' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        item.inventoryType === 'Cold Room' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {item.inventoryType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${
                        item.inventoryType === 'Rejected Stock' ? 'text-red-500' :
                        item.quantity <= (item.product?.minimumStockLevel || 0) ? 'text-orange-500' : 'text-green-600'
                      }`}>
                        {item.quantity} {item.product?.unitOfMeasure || ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-600">
                      No stock records found for the selected category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryDashboard;
