import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Loader2, Calendar, FileText, CheckCircle2, Eye, Printer, Building2, User, Clock, Tag, ChevronDown, ChevronUp, Package } from 'lucide-react';
import api from '../../services/api';
import SearchableSelect from '../../components/SearchableSelect';

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetDates = (preset) => {
  const now = new Date();
  const todayStr = getLocalDateString(now);

  if (preset === 'Today') {
    return { startDate: todayStr, endDate: todayStr };
  }
  if (preset === 'Yesterday') {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = getLocalDateString(y);
    return { startDate: yStr, endDate: yStr };
  }
  if (preset === 'This Week') {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff));
    return { startDate: getLocalDateString(startOfWeek), endDate: todayStr };
  }
  if (preset === 'This Month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: getLocalDateString(startOfMonth), endDate: todayStr };
  }
  if (preset === 'Quarterly') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
    return { startDate: getLocalDateString(startOfQuarter), endDate: todayStr };
  }
  if (preset === 'Annual') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return { startDate: getLocalDateString(startOfYear), endDate: todayStr };
  }
  if (preset === 'ALL') {
    return { startDate: '', endDate: '' };
  }
  return { startDate: todayStr, endDate: todayStr };
};

const PurchaseOrderList = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedPoId, setExpandedPoId] = useState(null);

  // Form State
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [items, setItems] = useState([{ product: '', orderedQty: 1, unitPrice: 0, totalPrice: 0 }]);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const { startDate: s, endDate: e } = getPresetDates(preset);
    setStartDate(s);
    setEndDate(e);
  };

  // Print Official Purchase Order PDF
  const handlePrintPO = (po) => {
    if (!po) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow popups in your browser to print the Purchase Order.');

    const companyName = "SRI SARAVANASS ICE CREAM & DAIRY PRODUCTS";
    const companyAddress = "Head Office & Factory: 66, Nataraja Theatre Road, Sattur, Virudhunagar - 626203, Tamil Nadu";
    const companyContact = "Phone: +91 99420 27197 | Email: accounts@saravanass.com | GSTIN: 33AAAFS1234A1Z1";

    const vendorObj = po.vendor || {};
    const branchObj = po.branch || {};
    const poItems = po.items || [];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${po.poNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 25px; background: #fff; line-height: 1.4; }
            
            /* Letterhead Header */
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border-bottom: 3px double #d81b60; pb: 12px; }
            .header-logo { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; }
            .company-title { font-size: 18px; font-weight: 800; color: #881337; text-transform: uppercase; letter-spacing: 0.5px; }
            .company-sub { font-size: 11px; color: #475569; font-weight: 600; margin-top: 2px; }
            .company-contact { font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace; }
            
            /* Document Title Bar */
            .doc-title-bar { background: linear-gradient(135deg, #881337 0%, #ad1457 100%); color: white; padding: 8px 14px; border-radius: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
            .doc-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .doc-date { font-size: 11px; opacity: 0.95; font-family: monospace; }

            /* Info Box Grid */
            .info-grid { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 16px; }
            .info-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 11px; }
            .info-box h4 { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #881337; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 0.5px; }
            .info-box p { margin: 2px 0; color: #334155; }
            .info-box strong { color: #0f172a; }

            /* Items Table */
            .table-container { border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
            .po-table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .po-table th { background: #f1f5f9; text-align: left; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; font-weight: 800; color: #334155; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
            .po-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; }

            .total-row td { background: #f8fafc; font-weight: 800; font-size: 12px; border-top: 2px solid #cbd5e1; }

            /* Signatures */
            .footer-section { margin-top: 40px; }
            .sig-grid { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 8px; }
            .sig-box { text-align: center; width: 170px; border-top: 1px dashed #94a3b8; padding-top: 4px; font-size: 9.5px; font-weight: 700; color: #475569; }
            .disclaimer { margin-top: 25px; text-align: center; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }

            @media print {
              body { padding: 10px; }
              @page { size: auto; margin: 8mm; }
            }
          </style>
        </head>
        <body>
          
          <!-- LETTERHEAD HEADER -->
          <table class="header-table">
            <tr>
              <td style="width: 72px; vertical-align: top;">
                <img src="/logo.avif" alt="Logo" class="header-logo" />
              </td>
              <td style="vertical-align: top; padding-left: 8px;">
                <div class="company-title">${companyName}</div>
                <div class="company-sub">${companyAddress}</div>
                <div class="company-contact">${companyContact}</div>
              </td>
            </tr>
          </table>

          <!-- DOCUMENT TITLE BAR -->
          <div class="doc-title-bar">
            <span class="doc-title">PURCHASE ORDER VOUCHER — ${po.poNumber}</span>
            <span class="doc-date">Order Date: ${new Date(po.orderDate).toLocaleDateString('en-IN')}</span>
          </div>

          <!-- INFO BOXES -->
          <div class="info-grid">
            <div class="info-box">
              <h4>Vendor / Supplier Details</h4>
              <p><strong>Vendor Name:</strong> ${vendorObj.name || 'N/A'}</p>
              <p><strong>Vendor Code:</strong> ${vendorObj.vendorCode || 'N/A'}</p>
              <p><strong>GSTIN Number:</strong> ${vendorObj.gstinNumber || 'URD'}</p>
              <p><strong>Contact Person:</strong> ${vendorObj.contactPerson || 'N/A'}</p>
              <p><strong>Phone:</strong> ${vendorObj.phone || 'N/A'}</p>
            </div>

            <div class="info-box">
              <h4>Delivery & Depot Details</h4>
              <p><strong>PO Reference:</strong> ${po.poNumber}</p>
              <p><strong>Destination Branch:</strong> ${branchObj.branchName || 'Main Branch'}</p>
              <p><strong>Branch Code:</strong> ${branchObj.branchCode || 'N/A'}</p>
              <p><strong>Arrival Date:</strong> ${po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN') : 'Immediate'}</p>
              <p><strong>PO Status:</strong> ${po.status}</p>
            </div>
          </div>

          <!-- ITEMS TABLE -->
          <div class="table-container">
            <table class="po-table">
              <thead>
                <tr>
                  <th style="width: 5%;">#</th>
                  <th>Material / Item Description</th>
                  <th style="width: 15%;">Item Code</th>
                  <th class="text-center" style="width: 10%;">UOM</th>
                  <th class="text-right" style="width: 12%;">Ordered Qty</th>
                  <th class="text-right" style="width: 15%;">Unit Price (₹)</th>
                  <th class="text-right" style="width: 18%;">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${poItems.map((item, idx) => {
      const prod = item.product || {};
      const lineTotal = (item.orderedQty || 0) * (item.unitPrice || 0);
      return `
                    <tr>
                      <td class="text-center font-mono">${idx + 1}</td>
                      <td><strong>${prod.name || 'Material Item'}</strong></td>
                      <td class="font-mono">${prod.itemCode || '-'}</td>
                      <td class="text-center">${prod.unitOfMeasure || 'Units'}</td>
                      <td class="text-right font-mono" style="font-weight: 700;">${item.orderedQty}</td>
                      <td class="text-right font-mono">₹${(item.unitPrice || 0).toFixed(2)}</td>
                      <td class="text-right font-mono" style="font-weight: 800; color: #0f172a;">₹${lineTotal.toFixed(2)}</td>
                    </tr>
                  `;
    }).join('')}
                <tr class="total-row">
                  <td colSpan="6" class="text-right uppercase">Grand Total Amount:</td>
                  <td class="text-right font-mono" style="color: #881337;">₹${(po.totalAmount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- FOOTER & SIGNATURES -->
          <div class="footer-section">
            <div class="sig-grid">
              <div class="sig-box">Prepared By (Procurement)</div>
              <div class="sig-box">Verified By (Store Manager)</div>
              <div class="sig-box">Authorized Signatory<br /><strong style="font-size: 8.5px;">Sri Saravanaa ERP</strong></div>
            </div>
            <div class="disclaimer">
              This Purchase Order is computer-generated by Sri Saravanaa ERP System.
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchInitialData();
  }, [startDate, endDate]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      let url = '/purchase-orders';
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) url += `?${params.join('&')}`;

      const response = await api.get(url);
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
      setVendors(vendorsRes.data.data || []);
      // Filter for raw materials & packing materials for PO purchasing
      const purchasableItems = productsRes.data.data.filter(p => {
        const type = (p.itemType || '').toLowerCase();
        return type.includes('raw') || type.includes('pack') || type.includes('material') || type.includes('packaging');
      });
      setProducts(purchasableItems);
      setBranches(branchesRes.data.data || []);

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
        supplierInvoiceNumber: supplierInvoiceNumber || undefined,
        orderDate: new Date().toISOString(),
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        items: validItems,
        totalAmount: getGrandTotal(),
        status: 'Issued' // Standard status when order is sent to vendor
      };

      await api.post('/purchase-orders', payload);
      alert('Purchase Order Created Successfully!');

      // Reset Form
      setSelectedVendor('');
      setSupplierInvoiceNumber('');
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
      <div className="w-full">
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
          <div className="glass-panel p-6 grid grid-cols-1 md:grid-cols-4 gap-6 relative z-50">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Vendor *</label>
              <SearchableSelect
                options={vendors.map(v => ({ value: v._id, label: v.name, code: v.vendorCode }))}
                value={selectedVendor}
                onChange={(val) => setSelectedVendor(val)}
                placeholder="Select Vendor..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Target Branch *</label>
              <SearchableSelect
                options={branches.map(b => ({ value: b._id, label: b.branchName, code: b.branchCode }))}
                value={selectedBranch}
                onChange={(val) => setSelectedBranch(val)}
                placeholder="Select Branch..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Supplier Invoice Number</label>
              <input
                type="text"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-9876"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Arrival Date</label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all cursor-pointer"
              />
            </div>
          </div>

          <div className="glass-panel p-6 relative z-30">
            <h3 className="font-bold text-gray-800 mb-4">Materials & Quantities</h3>
            <div className="space-y-4">
              {items.map((item, index) => {
                const selectedProd = products.find(p => p._id === item.product || p.id === item.product);
                const uom = selectedProd?.unitOfMeasure || '';

                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end relative" style={{ zIndex: 40 - index }}>
                    <div className="md:col-span-5">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Item Code / Name *</label>
                      <SearchableSelect
                        options={products.map(p => ({ 
                          value: p._id, 
                          label: `${p.name} (${p.unitOfMeasure || 'Pcs'})`, 
                          code: p.itemCode, 
                          sublabel: `Type: ${p.itemType || 'Material'} | UOM: ${p.unitOfMeasure || 'Pcs'}` 
                        }))}
                        value={item.product}
                        onChange={(val) => handleItemChange(index, 'product', val)}
                        placeholder="Select Raw Material or Packing Material..."
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Ordered Qty * {uom && <span className="text-[var(--color-primary)] font-extrabold ml-1">({uom})</span>}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="1"
                          value={item.orderedQty}
                          onChange={(e) => handleItemChange(index, 'orderedQty', e.target.value)}
                          required
                          className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-16 py-2.5 text-gray-900 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all"
                        />
                        {uom && (
                          <span className="absolute right-2 text-[11px] font-extrabold text-pink-700 bg-pink-50 px-2 py-1 rounded-lg border border-pink-200 pointer-events-none uppercase tracking-wider">
                            {uom}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Unit Price (₹) * {uom && <span className="text-gray-400 font-normal">/ {uom}</span>}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        required
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Total (₹)</label>
                      <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm font-extrabold font-mono">
                        ₹{item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="md:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 font-display">Purchase Invoice</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm text-xs">
            <Calendar size={14} className="text-gray-400" />
            <span className="font-bold text-gray-700 font-mono uppercase text-[11px]">Period:</span>
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-pink-50 border border-pink-200 rounded-lg px-2.5 py-1 font-bold text-pink-900 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Annual">Annual</option>
              <option value="Custom">Custom Range</option>
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDatePreset('Custom'); }}
              className="bg-gray-50 border border-gray-300 rounded px-2 py-1 font-mono font-bold text-gray-900 text-xs"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDatePreset('Custom'); }}
              className="bg-gray-50 border border-gray-300 rounded px-2 py-1 font-mono font-bold text-gray-900 text-xs"
            />
            {(startDate || endDate || datePreset !== 'ALL') && (
              <button
                onClick={() => handlePresetChange('ALL')}
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
            <Plus size={16} /> Create PO
          </button>
        </div>
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
              <thead className="bg-gradient-to-r from-pink-900 to-rose-950 text-white uppercase tracking-wider text-[11px] font-extrabold">
                <tr>
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Order Date</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchaseOrders.map((po) => {
                  const isExpanded = expandedPoId === po._id;

                  return (
                    <React.Fragment key={po._id}>
                      <tr
                        onClick={() => setExpandedPoId(isExpanded ? null : po._id)}
                        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-pink-50/70 border-l-4 border-pink-600' : 'hover:bg-pink-50/30'
                          }`}
                      >
                        <td className="px-6 py-4 font-mono text-xs font-bold text-pink-900 flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-pink-600 shrink-0" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-400 group-hover:text-pink-600 shrink-0" />
                          )}
                          <FileText size={14} className="text-pink-600 shrink-0" />
                          <span>{po.poNumber}</span>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-gray-900">{po.vendor?.name || 'Unknown Vendor'}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-600">{po.branch?.branchName || 'Main Branch'}</td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {new Date(po.orderDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-900">
                          ₹{po.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1 ${po.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            po.status === 'Issued' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                            {po.status === 'Completed' && <CheckCircle2 size={12} />}
                            {po.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setExpandedPoId(isExpanded ? null : po._id)}
                            className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-900 text-xs font-bold transition-all border border-pink-200 flex items-center gap-1.5 mx-auto shadow-xs"
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {isExpanded ? 'Hide Details' : 'View Products'}
                          </button>
                        </td>
                      </tr>

                      {/* INLINE PRODUCT DETAILS DROPDOWN ROW */}
                      {isExpanded && (
                        <tr className="bg-pink-50/40 border-b border-pink-200">
                          <td colSpan="7" className="px-6 py-4">
                            <div className="bg-white rounded-2xl p-4 border border-pink-200 shadow-md space-y-3">

                              {/* Dropdown Header */}
                              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <Package className="text-pink-600" size={16} />
                                  <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider">
                                    Ordered Materials & Product Breakdown ({(po.items || []).length} Items)
                                  </h4>
                                </div>

                                <button
                                  onClick={() => handlePrintPO(po)}
                                  className="flex items-center gap-1 bg-white hover:bg-pink-50 text-pink-900 border border-pink-200 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs"
                                >
                                  <Printer size={13} className="text-pink-700" /> Print PO Voucher
                                </button>
                              </div>

                              {/* Product Details Table */}
                              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                                <table className="w-full text-left text-xs font-medium">
                                  <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider font-extrabold text-[10px] border-b border-gray-200">
                                    <tr>
                                      <th className="py-2.5 px-4 text-center">#</th>
                                      <th className="py-2.5 px-4">Product / Material Description</th>
                                      <th className="py-2.5 px-4">Item Code</th>
                                      <th className="py-2.5 px-4 text-center">UOM</th>
                                      <th className="py-2.5 px-4 text-right">Ordered Qty</th>
                                      <th className="py-2.5 px-4 text-right">Unit Price (₹)</th>
                                      <th className="py-2.5 px-4 text-right">Total Line Amount (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {(po.items || []).map((item, idx) => {
                                      const prod = item.product || {};
                                      const lineTotal = (item.orderedQty || 0) * (item.unitPrice || 0);
                                      return (
                                        <tr key={idx} className="hover:bg-pink-50/20">
                                          <td className="py-2.5 px-4 text-center font-mono text-gray-400">{idx + 1}</td>
                                          <td className="py-2.5 px-4 font-bold text-gray-900">{prod.name || 'Raw Material Item'}</td>
                                          <td className="py-2.5 px-4 font-mono text-gray-600">{prod.itemCode || '-'}</td>
                                          <td className="py-2.5 px-4 text-center text-gray-600 font-semibold">{prod.unitOfMeasure || 'Units'}</td>
                                          <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">{item.orderedQty}</td>
                                          <td className="py-2.5 px-4 text-right font-mono text-gray-700">₹{(item.unitPrice || 0).toFixed(2)}</td>
                                          <td className="py-2.5 px-4 text-right font-mono font-black text-pink-950 bg-pink-50/40">₹{lineTotal.toFixed(2)}</td>
                                        </tr>
                                      );
                                    })}
                                    {(po.items || []).length === 0 && (
                                      <tr>
                                        <td colSpan="7" className="p-4 text-center text-gray-400">No product items listed in this PO.</td>
                                      </tr>
                                    )}
                                    <tr className="bg-gray-50 font-bold border-t border-gray-200">
                                      <td colSpan="6" className="py-2 px-4 text-right font-extrabold uppercase text-[10px] text-gray-700">Grand Total PO Amount:</td>
                                      <td className="py-2 px-4 text-right font-mono font-black text-pink-950 text-sm">₹{(po.totalAmount || 0).toFixed(2)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-600">
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
