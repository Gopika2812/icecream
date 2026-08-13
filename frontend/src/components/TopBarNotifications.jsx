import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Bell, AlertTriangle, Send, CheckCircle2, EyeOff, Package, X, RefreshCw, Sparkles } from 'lucide-react';
import Modal from './Modal';

const TopBarNotifications = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  // Quick Requisition Modal State
  const [reqModalItem, setReqModalItem] = useState(null);
  const [requestedQty, setRequestedQty] = useState(50);
  const [reqRemarks, setReqRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dropdownRef = useRef(null);

  const roleName = typeof currentUser?.role === 'object' ? currentUser?.role?.name : (currentUser?.role || 'User');
  const isProductionOrAdmin = roleName === 'Production Team' || roleName === 'Super Admin' || roleName === 'SuperAdmin' || currentUser?.username === 'admin';

  useEffect(() => {
    fetchStockData();
    const interval = setInterval(fetchStockData, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const [productsRes, inventoryRes, reqsRes] = await Promise.all([
        api.get('/products'),
        api.get('/inventory'),
        api.get('/product-requisitions')
      ]);

      const prods = productsRes.data.data || [];
      const invs = inventoryRes.data.data || [];
      const reqs = reqsRes.data.data || [];

      setProducts(prods);
      setInventory(invs);
      setRequisitions(reqs);
    } catch (error) {
      console.error('Failed to fetch notification stock data', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate live current stock for each product
  const computeLowStockItems = () => {
    const productStockMap = {};

    // Filter out finished goods
    (products || []).forEach(p => {
      const type = (p.itemType || '').toLowerCase();
      if (!type.includes('finished') && !type.includes('fg')) {
        const id = (p._id || p.id).toString();
        productStockMap[id] = {
          id: id,
          product: p,
          name: p.name,
          itemCode: p.itemCode,
          unitOfMeasure: p.unitOfMeasure || 'Units',
          category: p.category || 'General',
          currentStock: 0
        };
      }
    });

    // Sum inventory quantities
    (inventory || []).forEach(inv => {
      if (inv.inventoryType === 'Store Room' || !inv.inventoryType) {
        const pId = inv.product?._id ? inv.product._id.toString() : (typeof inv.product === 'string' ? inv.product : null);
        if (pId && productStockMap[pId]) {
          productStockMap[pId].currentStock += (parseFloat(inv.quantity) || 0);
        }
      }
    });

    // Filter items where stock is LESS THAN 5 UNITS (< 5)
    return Object.values(productStockMap).filter(item => {
      // Stock MUST be less than 5 to trigger alert! (Automatically removed if >= 5)
      return item.currentStock < 5;
    });
  };

  const lowStockItems = computeLowStockItems();
  // Active non-dismissed alerts count
  const activeAlerts = lowStockItems.filter(item => !dismissedIds.includes(item.id));

  // Find if a purchase requisition is already pending for a product
  const getPendingRequisition = (productId) => {
    return requisitions.find(r => {
      const isPending = r.status === 'PENDING_PURCHASE' || r.status === 'PENDING' || !r.status;
      if (!isPending) return false;
      return (r.items || []).some(i => {
        const pId = typeof i.product === 'object' ? (i.product._id || i.product.id) : i.product;
        return pId === productId;
      });
    });
  };

  const handleOpenReqModal = (item) => {
    setReqModalItem(item);
    setRequestedQty(50);
    setReqRemarks(`Critical Low Stock Alert Requisition (${item.currentStock} ${item.unitOfMeasure} remaining)`);
  };

  const handleSendRequisitionSubmit = async (e) => {
    e.preventDefault();
    if (!reqModalItem) return;

    try {
      setSubmitting(true);
      const payload = {
        items: [
          {
            product: reqModalItem.id,
            requestedQuantity: parseFloat(requestedQty) || 50,
            currentStock: reqModalItem.currentStock,
            unitOfMeasure: reqModalItem.unitOfMeasure
          }
        ],
        remarks: reqRemarks || 'Low Stock Alert Requisition',
        priority: 'HIGH'
      };

      await api.post('/product-requisitions', payload);
      alert(`Purchase Indent for ${reqModalItem.name} sent to Purchase Team successfully!`);
      setReqModalItem(null);
      fetchStockData();
    } catch (error) {
      console.error('Failed to send purchase requisition', error);
      alert(error.response?.data?.message || 'Failed to send requisition to Purchase Team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = (id) => {
    setDismissedIds(prev => [...prev, id]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/80 border border-[var(--color-glass-border)] text-slate-700 hover:bg-rose-50 hover:text-rose-900 transition-all shadow-xs cursor-pointer"
        title="Stock Alert & Requisition Center"
      >
        <Bell size={20} className={activeAlerts.length > 0 ? 'text-rose-600 animate-bounce' : 'text-slate-600'} />

        {activeAlerts.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-black text-white shadow-md animate-pulse">
            {activeAlerts.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-3xl border border-rose-200 shadow-2xl z-50 overflow-hidden space-y-0">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-rose-900 to-pink-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              <div>
                <h3 className="font-extrabold text-sm tracking-wide">Stock Alert Center</h3>
                <span className="text-[10px] text-rose-200 font-mono">Auto-clears when stock &ge; 5 units</span>
              </div>
            </div>

            <button
              onClick={fetchStockData}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-rose-200 hover:text-white"
              title="Refresh Stock Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* List of Low Stock Items */}
          <div className="max-h-[65vh] overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {activeAlerts.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                <h4 className="font-extrabold text-slate-800 text-sm">All Materials Healthy!</h4>
                <p className="text-xs text-slate-500">No input materials or mixes are currently below 5 units stock.</p>
              </div>
            ) : (
              activeAlerts.map((item) => {
                const pendingReq = getPendingRequisition(item.id);

                return (
                  <div key={item.id} className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 hover:border-rose-400 transition-all space-y-2.5 shadow-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-extrabold text-xs text-rose-950 block">{item.name}</span>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">Code: {item.itemCode || 'N/A'} | {item.category}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-black text-[10px] rounded-full shadow-xs shrink-0">
                        {item.currentStock} {item.unitOfMeasure}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-rose-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                        <AlertTriangle size={13} className="text-rose-600" />
                        Critical Low Stock (&lt; 5 {item.unitOfMeasure})
                      </span>
                    </div>

                    {/* Pending Requisition Status Badge */}
                    {pendingReq && (
                      <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-[11px] font-extrabold flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-600" />
                        <span>Requisition <strong>{pendingReq.requisitionNumber || 'PR-Indent'}</strong> Sent to Purchase Team</span>
                      </div>
                    )}

                    {/* Role Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {isProductionOrAdmin ? (
                        <button
                          onClick={() => handleOpenReqModal(item)}
                          disabled={Boolean(pendingReq)}
                          className={`w-full py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                            pendingReq
                              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                              : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white'
                          }`}
                        >
                          <Send size={13} />
                          {pendingReq ? 'Purchase Indent Pending' : 'Send Requisition to Purchase Team'}
                        </button>
                      ) : (
                        <div className="w-full flex justify-between items-center text-[11px] text-slate-500 font-semibold">
                          <span>View Only Alert</span>
                          <button
                            onClick={() => handleDismiss(item.id)}
                            className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-xs font-bold"
                          >
                            <EyeOff size={12} /> Ignore
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- QUICK PURCHASE REQUISITION MODAL --- */}
      {reqModalItem && (
        <Modal isOpen={Boolean(reqModalItem)} onClose={() => setReqModalItem(null)} title={`Send Purchase Indent: ${reqModalItem.name}`} size="md">
          <form onSubmit={handleSendRequisitionSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 text-xs font-bold space-y-1">
              <div className="flex justify-between">
                <span>Material Name: <strong>{reqModalItem.name}</strong></span>
                <span className="font-mono text-rose-700 font-black">Stock: {reqModalItem.currentStock} {reqModalItem.unitOfMeasure}</span>
              </div>
              <p className="text-[11px] text-amber-800">
                This will send an immediate Purchase Indent to the <strong>Purchase Team</strong> inside their Purchase Invoice portal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Requested Purchase Quantity ({reqModalItem.unitOfMeasure}) *</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={requestedQty}
                onChange={(e) => setRequestedQty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Production Notes / Priority Remarks</label>
              <textarea
                rows="2"
                value={reqRemarks}
                onChange={(e) => setReqRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-rose-500"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-3">
              <button
                type="button"
                onClick={() => setReqModalItem(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send size={14} />
                {submitting ? 'Sending Indent...' : 'Send Purchase Indent Now'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TopBarNotifications;
