import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Loader2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

const PurchaseOrderList = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [items, setItems] = useState([{ product: '', orderedQty: 1, unitPrice: 0, totalPrice: 0 }]);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchPurchaseOrders();
    fetchInitialData();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchase-orders');
      setPurchaseOrders(response.data.data);
    } catch (error) {
      console.error('Failed to fetch POs', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [vendorsRes, productsRes, branchesRes] = await Promise.all([
        api.get('/vendors'),
        api.get('/products'),
        api.get('/branches')
      ]);
      setVendors(vendorsRes.data.data);
      // Filter for raw materials since POs are for purchasing inputs & packaging
      const rawMaterials = productsRes.data.data.filter(p => p.itemType === 'Raw Material');
      setProducts(rawMaterials);
      setBranches(branchesRes.data.data);
      
      // Default branch to user's primary branch if available
      if (currentUser.primaryBranch) {
        setSelectedBranch(currentUser.primaryBranch._id || currentUser.primaryBranch);
      } else if (branchesRes.data.data.length > 0) {
        setSelectedBranch(branchesRes.data.data[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch metadata', error);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { product: '', orderedQty: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    
    if (field === 'product') {
      newItems[index].product = value;
      // Pre-fill unit price from product details (wholesalePrice)
      const selectedProd = products.find(p => p._id === value);
      if (selectedProd) {
        newItems[index].unitPrice = selectedProd.wholesalePrice || 0;
      }
    } else if (field === 'orderedQty') {
      newItems[index].orderedQty = Math.max(1, parseInt(value) || 1);
    } else if (field === 'unitPrice') {
      newItems[index].unitPrice = Math.max(0, parseFloat(value) || 0);
    }

    newItems[index].totalPrice = newItems[index].orderedQty * newItems[index].unitPrice;
    setItems(newItems);
  };

  const getGrandTotal = () => {
    return items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVendor) return alert('Please select a vendor.');
    if (!selectedBranch) return alert('Please select a branch.');
    
    const validItems = items.filter(item => item.product && item.orderedQty > 0);
    if (validItems.length === 0) return alert('Please add at least one product with quantity.');

    try {
      setSubmitting(true);
      const payload = {
        vendor: selectedVendor,
        branch: selectedBranch,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        items: validItems,
        totalAmount: getGrandTotal(),
        status: 'Issued' // Standard status when order is sent to vendor
      };

      await api.post('/purchase-orders', payload);
      alert('Purchase Order Created Successfully!');
      
      // Reset Form
      setSelectedVendor('');
      setExpectedDeliveryDate('');
      setItems([{ product: '', orderedQty: 1, unitPrice: 0, totalPrice: 0 }]);
      setIsCreating(false);
      fetchPurchaseOrders();
    } catch (error) {
      console.error('Failed to create PO', error);
      alert(error.response?.data?.message || 'Error creating Purchase Order');
    } finally {
      setSubmitting(false);
    }
  };

  if (isCreating) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setIsCreating(false)} 
            className="p-2 rounded-lg bg-white/50 border border-[var(--color-glass-border)] hover:bg-white/80 transition-colors text-gray-700"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Purchase Order</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-panel p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Vendor *</label>
              <select 
                value={selectedVendor} 
                onChange={(e) => setSelectedVendor(e.target.value)}
                required
                className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="">Select Vendor</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>{v.name} ({v.vendorCode})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Target Branch *</label>
              <select 
                value={selectedBranch} 
                onChange={(e) => setSelectedBranch(e.target.value)}
                required
                className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Expected Delivery Date</label>
              <input 
                type="date" 
                value={expectedDeliveryDate} 
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Materials & Quantities</h3>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-5">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Item Code / Name *</label>
                    <select
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      required
                      className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>{p.name} ({p.itemCode} - {p.unitOfMeasure})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Ordered Qty *</label>
                    <input
                      type="number"
                      min="1"
                      value={item.orderedQty}
                      onChange={(e) => handleItemChange(index, 'orderedQty', e.target.value)}
                      required
                      className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Unit Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      required
                      className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Total (₹)</label>
                    <div className="w-full bg-gray-100/50 border border-gray-200 rounded-md px-3 py-2 text-gray-700 text-sm font-medium">
                      ₹{item.totalPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="md:col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="mt-4 flex items-center gap-2 text-sm text-[var(--color-primary)] font-semibold hover:text-[var(--color-primary-soft)] transition-colors"
            >
              <Plus size={16} /> Add Another Item
            </button>

            <div className="mt-6 pt-6 border-t border-[var(--color-glass-border)] flex justify-between items-center">
              <span className="text-gray-600 font-medium">Grand Total</span>
              <span className="text-xl font-bold text-gray-900">₹{getGrandTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-[0_0_15px_rgba(216,27,96,0.3)] disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Save & Issue PO
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 font-display">Purchase Orders</h1>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(216,27,96,0.3)] font-medium"
        >
          <Plus size={18} /> Create PO
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={20} />
            Loading purchase orders...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                <tr>
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Order Date</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {purchaseOrders.map((po) => (
                  <tr key={po._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900 flex items-center gap-2">
                      <FileText size={14} className="text-gray-400" />
                      {po.poNumber}
                    </td>
                    <td className="px-6 py-4 font-medium">{po.vendor?.name}</td>
                    <td className="px-6 py-4">{po.branch?.branchName}</td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(po.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      ₹{po.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                        po.status === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                        po.status === 'Issued' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {po.status === 'Completed' && <CheckCircle2 size={12} />}
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-600">
                      No purchase orders found. Click "Create PO" to make one.
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

export default PurchaseOrderList;
