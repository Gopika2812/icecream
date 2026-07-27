import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Loader2, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Thermometer, Calendar, Package, CornerUpLeft } from 'lucide-react';
import api from '../../services/api';

const QCList = () => {
  const [activeTab, setActiveTab] = useState('QC Check');
  const [qcs, setQcs] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [selectedPO, setSelectedPO] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [items, setItems] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [qcRes, pendingRes, invRes] = await Promise.all([
        api.get('/qc'),
        api.get('/qc/pending-pos'),
        api.get('/inventory')
      ]);
      setQcs(qcRes.data.data);
      setPendingPOs(pendingRes.data.data);
      setInventory(invRes.data.data);
    } catch (error) {
      console.error('Failed to load QC Dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePOChange = async (poId) => {
    setSelectedPO(poId);
    if (!poId) {
      setItems([]);
      setSelectedBranch('');
      return;
    }

    const selectedPoObj = pendingPOs.find(p => p._id === poId);
    if (selectedPoObj) {
      setSelectedBranch(selectedPoObj.branch?._id || selectedPoObj.branch);
      
      const today = new Date().toISOString().split('T')[0];
      const mapped = selectedPoObj.items.map(item => {
        return {
          product: item.product?._id || item.product,
          name: item.product?.name || 'Unknown Product',
          itemCode: item.product?.itemCode || '',
          unitOfMeasure: item.product?.unitOfMeasure || '',
          itemType: item.product?.itemType || 'Raw Material',
          receivedQty: item.orderedQty,
          passedQty: item.orderedQty,
          damagedQty: 0,
          mrp: item.product?.mrp || 0,
          purchasePrice: item.unitPrice || 0, // pre-fill from PO price
          manufacturingDate: today,
          expiryDate: '',
          temperature: '',
          remarks: ''
        };
      });
      setItems(mapped);
    }
  };

  const handlePassedQtyChange = (index, valStr) => {
    const newItems = [...items];
    const received = newItems[index].receivedQty;
    const passed = Math.min(received, Math.max(0, parseInt(valStr) || 0));
    
    newItems[index].passedQty = passed;
    newItems[index].damagedQty = received - passed;
    setItems(newItems);
  };

  const handleDamagedQtyChange = (index, valStr) => {
    const newItems = [...items];
    const received = newItems[index].receivedQty;
    const damaged = Math.min(received, Math.max(0, parseInt(valStr) || 0));
    
    newItems[index].damagedQty = damaged;
    newItems[index].passedQty = received - damaged;
    setItems(newItems);
  };

  const handleItemPropertyChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleRemarksChange = (index, value) => {
    const newItems = [...items];
    newItems[index].remarks = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPO) return alert('Please select a Purchase Order.');
    if (!supplierInvoiceNumber) return alert('Please enter the Supplier Invoice Number.');
    
    // Check constraints
    for (const item of items) {
      if (item.passedQty > 0 && !item.expiryDate) {
        return alert(`Please set an Expiry Date for ${item.name}.`);
      }
      if (item.damagedQty > 0 && !item.remarks.trim()) {
        return alert(`Please specify a return reason / remark for ${item.name} damages.`);
      }
      if (item.itemType === 'Finished Goods' && !item.temperature) {
        return alert(`Please record the cold chain temperature for ${item.name}.`);
      }
    }

    try {
      setSubmitting(true);
      
      const totalReceived = items.reduce((acc, i) => acc + i.receivedQty, 0);
      const totalPassed = items.reduce((acc, i) => acc + i.passedQty, 0);
      
      let status = 'Passed';
      if (totalPassed === 0) {
        status = 'Failed';
      } else if (totalPassed < totalReceived) {
        status = 'Partial';
      }

      const payload = {
        poReference: selectedPO,
        branch: selectedBranch,
        supplierInvoiceNumber,
        status,
        items: items.map(i => ({
          product: i.product,
          passedQty: i.passedQty,
          damagedQty: i.damagedQty,
          purchasePrice: parseFloat(i.purchasePrice) || 0,
          mrp: parseFloat(i.mrp) || 0,
          manufacturingDate: i.manufacturingDate || undefined,
          expiryDate: i.expiryDate || undefined,
          temperature: i.temperature ? parseFloat(i.temperature) : undefined,
          remarks: i.remarks
        }))
      };

      await api.post('/qc', payload);
      alert('QC report submitted! Batch records created & GRN saved.');
      
      setSelectedPO('');
      setSupplierInvoiceNumber('');
      setItems([]);
      setIsCreating(false);
      
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create QC report', error);
      alert(error.response?.data?.message || 'Error creating QC report');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter local data for tabs
  const storeRoomStock = inventory.filter(i => i.inventoryType === 'Store Room');
  const rejectedStock = inventory.filter(i => i.inventoryType === 'Rejected Stock');

  if (isCreating) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            type="button"
            onClick={() => setIsCreating(false)} 
            className="p-2 rounded-lg bg-white/50 border border-[var(--color-glass-border)] hover:bg-white/80 transition-colors text-gray-700"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Conduct Quality Control & Stock In</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-panel p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Select Pending Purchase Order *</label>
              <select 
                value={selectedPO} 
                onChange={(e) => handlePOChange(e.target.value)}
                required
                className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="">Select Issued PO</option>
                {pendingPOs.map((p) => (
                  <option key={p._id} value={p._id}>{p.poNumber} - Vendor: {p.vendor?.name} (Total: ₹{p.totalAmount})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Supplier Invoice Number *</label>
              <input 
                type="text" 
                value={supplierInvoiceNumber} 
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                required
                placeholder="e.g. INV-9876"
                className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          </div>

          {items.length > 0 && (
            <div className="glass-panel p-6 space-y-6">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="text-green-600" size={20} />
                QC Checks & Batch Registries
              </h3>
              
              {items.map((item, index) => (
                <div key={index} className="p-4 rounded-xl border border-[var(--color-glass-border)] bg-white/10 space-y-4">
                  <div className="flex justify-between items-start border-b border-[var(--color-glass-border)] pb-2">
                    <div>
                      <span className="font-bold text-gray-900">{item.name}</span>
                      <span className="text-xs text-gray-500 font-mono block">Code: {item.itemCode} | Ordered Qty: {item.receivedQty} {item.unitOfMeasure}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                      Batch Code Auto-Assigned
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Passed Qty *</label>
                      <input
                        type="number"
                        min="0"
                        max={item.receivedQty}
                        value={item.passedQty}
                        onChange={(e) => handlePassedQtyChange(index, e.target.value)}
                        required
                        className="w-full bg-white/50 border border-green-300 text-green-700 font-semibold rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Damaged (Return Qty) *</label>
                      <input
                        type="number"
                        min="0"
                        max={item.receivedQty}
                        value={item.damagedQty}
                        onChange={(e) => handleDamagedQtyChange(index, e.target.value)}
                        required
                        className="w-full bg-white/50 border border-red-300 text-red-700 font-semibold rounded px-3 py-1.5 text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Purchase Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.purchasePrice}
                        onChange={(e) => handleItemPropertyChange(index, 'purchasePrice', e.target.value)}
                        required
                        className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">MRP per Unit (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.mrp}
                        onChange={(e) => handleItemPropertyChange(index, 'mrp', e.target.value)}
                        required
                        className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                        <Thermometer size={12} className="text-red-500" />
                        Temperature (°C) {item.itemType === 'Finished Goods' ? '*' : ''}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={item.temperature}
                        onChange={(e) => handleItemPropertyChange(index, 'temperature', e.target.value)}
                        required={item.itemType === 'Finished Goods'}
                        placeholder="e.g. -18"
                        className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded px-3 py-1 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Mfg Date</label>
                      <input
                        type="date"
                        value={item.manufacturingDate}
                        onChange={(e) => handleItemPropertyChange(index, 'manufacturingDate', e.target.value)}
                        className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded px-3 py-1 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date *</label>
                      <input
                        type="date"
                        value={item.expiryDate}
                        required={item.passedQty > 0}
                        onChange={(e) => handleItemPropertyChange(index, 'expiryDate', e.target.value)}
                        className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded px-3 py-1 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks / QC failure reason</label>
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(e) => handleRemarksChange(index, e.target.value)}
                        required={item.damagedQty > 0}
                        placeholder={item.damagedQty > 0 ? "Explain damage / vendor return reason *" : "Optional remarks"}
                        className={`w-full bg-white/50 border rounded px-3 py-1.5 text-xs focus:outline-none ${
                          item.damagedQty > 0 ? 'border-red-300 focus:border-red-500' : 'border-[var(--color-glass-border)] focus:border-[var(--color-primary)]'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
              disabled={submitting || items.length === 0}
              className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-[0_0_15px_rgba(216,27,96,0.3)] disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Submit QC Report & Stock In
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 font-display">Quality Control & Stock In</h1>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(216,27,96,0.3)] font-medium"
        >
          <Plus size={18} /> Perform QC Check
        </button>
      </div>

      {/* Unified Navigation Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--color-glass-border)] pb-px">
        {['QC Check', 'Store Room', 'Return to Vendor'].map((tab) => (
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

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={20} />
            Loading...
          </div>
        ) : (
          <div>
            {activeTab === 'QC Check' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                    <tr>
                      <th className="px-6 py-4">QC Report No</th>
                      <th className="px-6 py-4">GRN Ref</th>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4">Checked Date</th>
                      <th className="px-6 py-4">QC Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)]">
                    {qcs.map((qc) => (
                      <tr key={qc._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900 flex items-center gap-2">
                          <FileText size={14} className="text-gray-400" />
                          {qc.qcNumber}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{qc.grnReference?.grnNumber || 'N/A'}</td>
                        <td className="px-6 py-4">{qc.branch?.branchName}</td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          {new Date(qc.checkedDate).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                            qc.status === 'Passed' ? 'bg-green-50 text-green-700 border border-green-200' :
                            qc.status === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {qc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {qcs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-600">
                          No QC logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'Store Room' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                    <tr>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Item Code</th>
                      <th className="px-6 py-4 text-center">Batch No</th>
                      <th className="px-6 py-4 text-right">In-Stock Qty</th>
                      <th className="px-6 py-4 text-right">Unit Price</th>
                      <th className="px-6 py-4 text-right">MRP</th>
                      <th className="px-6 py-4 text-center">Temp Log</th>
                      <th className="px-6 py-4 text-center">Mfg Date</th>
                      <th className="px-6 py-4 text-center">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)]">
                    {storeRoomStock.map((item) => (
                      <tr key={item._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{item.product?.name}</td>
                        <td className="px-6 py-4 font-mono text-xs">{item.product?.itemCode}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-semibold">
                            {item.batchNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-green-600">
                          {item.quantity} {item.product?.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">
                          ₹{item.purchasePrice?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-950">
                          ₹{item.mrp?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-semibold">
                          {item.temperature !== undefined && item.temperature !== null ? `${item.temperature} °C` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-center text-xs">
                          {item.manufacturingDate ? new Date(item.manufacturingDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-semibold text-rose-600">
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                    {storeRoomStock.length === 0 && (
                      <tr>
                        <td colSpan="9" className="px-6 py-8 text-center text-gray-600">
                          No items currently in Store Room inventory.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'Return to Vendor' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                    <tr>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Item Code</th>
                      <th className="px-6 py-4 text-center">Batch No</th>
                      <th className="px-6 py-4 text-right">Damaged Qty</th>
                      <th className="px-6 py-4 text-right">Wholesale Price</th>
                      <th className="px-6 py-4">Vendor Return Remarks</th>
                      <th className="px-6 py-4 text-center">Date Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)]">
                    {rejectedStock.map((item) => (
                      <tr key={item._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{item.product?.name}</td>
                        <td className="px-6 py-4 font-mono text-xs">{item.product?.itemCode}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-mono text-xs font-semibold">
                            {item.batchNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-red-500">
                          {item.quantity} {item.product?.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">
                          ₹{item.purchasePrice?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-amber-700">
                          <span className="flex items-center gap-1">
                            <CornerUpLeft size={12} />
                            QC Failed: Ready for return
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium">
                          {new Date(item.lastUpdated).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {rejectedStock.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-600">
                          No vendor returns logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QCList;
