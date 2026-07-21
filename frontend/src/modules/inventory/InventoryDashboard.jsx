import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const InventoryDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      // In a real app, pass the active branch ID
      const response = await api.get('/inventory');
      setInventory(response.data.data);
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Levels</h1>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading inventory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Branch</th>
                  <th className="px-6 py-4 font-medium">Item Code</th>
                  <th className="px-6 py-4 font-medium">Material</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Current Stock</th>
                  <th className="px-6 py-4 font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {inventory.map((item) => (
                  <tr key={item._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.branch?.branchName}</td>
                    <td className="px-6 py-4 font-mono text-xs">{item.rawMaterial?.itemCode}</td>
                    <td className="px-6 py-4">{item.rawMaterial?.name}</td>
                    <td className="px-6 py-4">{item.rawMaterial?.category}</td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${item.quantity <= item.rawMaterial?.minimumStockLevel ? 'text-red-400' : 'text-green-400'}`}>
                        {item.quantity} {item.rawMaterial?.unitOfMeasure}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-600">
                      No inventory records found for this branch.
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
