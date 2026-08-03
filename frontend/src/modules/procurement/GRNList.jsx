import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Loader2, FileText, CheckCircle2, ShieldCheck, AlertCircle, Calendar } from 'lucide-react';
import api from '../../services/api';

const GRNList = () => {
  const [grns, setGrns] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Date Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State
  const [selectedPO, setSelectedPO] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [items, setItems] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    fetchGRNs();
    fetchInitialData();
  }, [startDate, endDate]);

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      let url = '/grn';
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) url += `?${params.join('&')}`;

      const response = await api.get(url);
      setGrns(response.data.data);
    } catch (error) {
      console.error('Failed to fetch GRNs', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const posRes = await api.get('/purchase-orders');
      // Only show POs that are 'Issued' or 'Partially Received' for receiving
      const activePOs = posRes.data.data.filter(po => po.status === 'Issued' || po.status === 'Partially Received');
      setPurchaseOrders(activePOs);
    } catch (error) {
      console.error('Failed to fetch PO list', error);
    }
  };

  const handlePOChange = async (poId) => {
    setSelectedPO(poId);
    if (!poId) {
      setItems([]);
      setSelectedBranch('');
      return;
    }

    try {
      const response = await api.get(`/purchase-orders/${poId}`);
      const poDetails = response.data.data;
      
      setSelectedBranch(poDetails.branch?._id || poDetails.branch);
      
      // Populate items with received, accepted, and rejected defaults
      const mappedItems = poDetails.items.map(item => ({
        product: item.product?._id || item.product,
        name: item.product?.name || 'Unknown Product',
        itemCode: item.product?.itemCode || '',
        unitOfMeasure: item.product?.unitOfMeasure || '',
        orderedQty: item.orderedQty,
        receivedQty: item.orderedQty,
        acceptedQty: item.orderedQty,
        rejectedQty: 0,
        remarks: ''
      }));
      setItems(mappedItems);
    } catch (error) {
      console.error('Failed to fetch PO details', error);
      alert('Could not load PO details');
    }
  };

  const handleQtyChange = (index, field, value) => {
    const newItems = [...items];
    const val = Math.max(0, parseInt(value) || 0);
    newItems[index][field] = val;

    // Recalculate rejected quantity automatically
    if (field === 'receivedQty' || field === 'acceptedQty') {
      const rx = newItems[index].receivedQty;
      const ac = newItems[index].acceptedQty;
      // Accepted cannot exceed received
      if (field === 'acceptedQty' && ac > rx) {
        newItems[index].acceptedQty = rx;
      }
      newItems[index].rejectedQty = Math.max(0, newItems[index].receivedQty - newItems[index].acceptedQty);
    }

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
    if (!supplierInvoiceNumber) return alert('Please enter Supplier Invoice Number.');
    if (items.length === 0) return alert('No items to receive.');

    try {
      setSubmitting(true);
      const payload = {
        poReference: selectedPO,
        branch: selectedBranch,
        supplierInvoiceNumber,
        items: items.map(i => ({
          product: i.product,
          receivedQty: i.receivedQty,
          acceptedQty: i.acceptedQty,
          rejectedQty: i.rejectedQty,
          remarks: i.remarks
        }))
      };

      await api.post('/grn', payload);
      alert('Goods Received Note (GRN) & QC Created successfully!');
      
      // Reset Form
      setSelectedPO('');
      setSupplierInvoiceNumber('');
      setItems([]);
      setIsCreating(false);
      
      fetchGRNs();
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create GRN', error);
      alert(error.response?.data?.message || 'Error creating GRN');
    } finally {
      setSubmitting(false);
    }
  };

  if (isCreating) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setIsCreating(false)} 
            className="p-2 rounded-lg bg-white/50 border border-[var(--color-glass-border)] hover:bg-white/80 transition-colors text-gray-700"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Goods Receiving & QC Gate</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-panel p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Select Issued Purchase Order *</label>
              <select 
                value={selectedPO} 
                onChange={(e) => handlePOChange(e.target.value)}
                required
                className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="">Select PO</option>
                {purchaseOrders.map((po) => (
                  <option key={po._id} value={po._id}>{po.poNumber} - {po.vendor?.name} (₹{po.totalAmount})</option>
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
            <div className="glass-panel p-6 overflow-hidden">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ShieldCheck className="text-green-600" size={20} />
                Quality Control & Verification Check
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                    <tr>
                      <th className="px-3 py-3">Material</th>
                      <th className="px-3 py-3 text-center">Ordered</th>
                      <th className="px-3 py-3 text-center">Received *</th>
                      <th className="px-3 py-3 text-center">Accepted (QC Pass) *</th>
                      <th className="px-3 py-3 text-center">Rejected (QC Fail)</th>
                      <th className="px-3 py-3">Remarks / QC Failure Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)]">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="px-3 py-4">
                          <span className="font-medium text-gray-900 block">{item.name}</span>
                          <span className="text-xs text-gray-500 font-mono">{item.itemCode}</span>
                        </td>
                        <td className="px-3 py-4 text-center font-medium">
                          {item.orderedQty} {item.unitOfMeasure}
                        </td>
                        <td className="px-3 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.receivedQty}
                            onChange={(e) => handleQtyChange(index, 'receivedQty', e.target.value)}
                            required
                            className="w-20 bg-white/50 border border-[var(--color-glass-border)] rounded px-2 py-1 text-center text-sm focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>
                        <td className="px-3 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.receivedQty}
                            value={item.acceptedQty}
                            onChange={(e) => handleQtyChange(index, 'acceptedQty', e.target.value)}
                            required
                            className="w-20 bg-white/50 border border-green-300 text-green-700 bg-green-50/20 rounded px-2 py-1 text-center text-sm focus:outline-none focus:border-green-500"
                          />
                        </td>
                        <td className="px-3 py-4 text-center">
                          <span className={`font-semibold ${item.rejectedQty > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {item.rejectedQty} {item.unitOfMeasure}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => handleRemarksChange(index, e.target.value)}
                            placeholder={item.rejectedQty > 0 ? "QC Failed details" : "Optional remarks"}
                            className={`w-full bg-white/50 border rounded px-2 py-1 text-xs focus:outline-none ${
                              item.rejectedQty > 0 ? 'border-red-300 focus:border-red-500' : 'border-[var(--color-glass-border)] focus:border-[var(--color-primary)]'
                            }`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              Complete Receipt & Quality Control
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 font-display">Goods Receiving & Quality Control</h1>
          <p className="text-xs text-gray-500 mt-0.5">Goods receipt notes, stock entry & gate pass logs</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm text-xs">
            <Calendar size={14} className="text-gray-400" />
            <span className="font-bold text-gray-700 font-mono uppercase text-[11px]">Period:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded px-2 py-1 font-mono font-bold text-gray-900 text-xs"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded px-2 py-1 font-mono font-bold text-gray-900 text-xs"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-pink-600 font-bold hover:underline text-[11px] ml-1"
              >
                Clear
              </button>
            )}
          </div>

          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-xl transition-colors shadow-[0_0_15px_rgba(216,27,96,0.3)] font-medium text-xs"
          >
            <Plus size={16} /> Create GRN
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600 flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={20} />
            Loading goods received notes...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                <tr>
                  <th className="px-6 py-4">GRN Number</th>
                  <th className="px-6 py-4">PO Reference</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Received Date</th>
                  <th className="px-6 py-4">Supplier Invoice</th>
                  <th className="px-6 py-4">QC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {grns.map((grn) => {
                  // Check if any items were rejected
                  const hasRejection = grn.items?.some(i => i.rejectedQty > 0);
                  
                  return (
                    <tr key={grn._id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900 flex items-center gap-2">
                        <FileText size={14} className="text-gray-400" />
                        {grn.grnNumber}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{grn.poReference?.poNumber || 'N/A'}</td>
                      <td className="px-6 py-4">{grn.branch?.branchName}</td>
                      <td className="px-6 py-4 text-xs">
                        {new Date(grn.receivedDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {grn.supplierInvoiceNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {hasRejection ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle size={12} /> Passed with Rejections
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 size={12} /> QC Clear (100% Accept)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {grns.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-600">
                      No GRN records found. Click "Create GRN" to start.
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

export default GRNList;
