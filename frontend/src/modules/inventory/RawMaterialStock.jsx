import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Package, ArrowDownLeft, ArrowUpRight, Search, Filter, Plus, Printer, 
  Loader2, ShieldAlert, ArrowLeftRight, Calendar, Building2, X, CheckCircle2, History 
} from 'lucide-react';
import Modal from '../../components/Modal';

const RawMaterialStock = () => {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [qcs, setQcs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search States
  const [activeTab, setActiveTab] = useState('Stock Balance'); // 'Stock Balance' | 'Movement Ledger'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL'); // 'ALL' | 'IN' | 'OUT'

  // Modal States
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form State for Manual Inward/Outward Stock Recording
  const [recordForm, setRecordForm] = useState({
    productId: '',
    transactionType: 'IN', // 'IN' or 'OUT'
    quantity: '',
    batchNumber: '',
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const [prodRes, invRes, txRes, qcRes] = await Promise.all([
        api.get('/products'),
        api.get('/inventory'),
        api.get('/inventory/transactions'),
        api.get('/qc')
      ]);

      setProducts(prodRes.data.data || []);
      setInventory(invRes.data.data || []);
      setTransactions(txRes.data.data || []);
      setQcs(qcRes.data.data || []);
    } catch (error) {
      console.error('Failed to load raw material stock data', error);
    } finally {
      setLoading(false);
    }
  };

  // Compile Stock Movement & Balances for all products
  const compileProductStock = () => {
    const productMap = {};

    // Initialize all products
    (products || []).forEach(p => {
      const pId = p._id.toString();
      productMap[pId] = {
        id: pId,
        itemCode: p.itemCode || 'N/A',
        name: p.name,
        category: p.category || 'Raw Material',
        unitOfMeasure: p.unitOfMeasure || 'Units',
        minimumStockLevel: p.minimumStockLevel || 0,
        inwardQty: 0,
        outwardQty: 0,
        currentStock: 0,
        transactions: []
      };
    });

    // 1. Process QC Logs as Inward (Stock-In Passed) & Outward (Vendor Return Rejected)
    (qcs || []).forEach(qc => {
      const date = qc.checkedDate || qc.createdAt || new Date();
      (qc.items || []).forEach(item => {
        const prodObj = item.product;
        const pId = prodObj?._id ? prodObj._id.toString() : (typeof prodObj === 'string' ? prodObj : null);
        if (pId && productMap[pId]) {
          if (item.passedQty > 0) {
            productMap[pId].inwardQty += item.passedQty;
            productMap[pId].transactions.push({
              id: `QC-IN-${qc._id}-${item._id || item.product}`,
              date,
              type: 'IN',
              source: 'QC Stock In',
              refNumber: qc.qcNumber,
              batchNumber: item.batchNumber || 'N/A',
              quantity: item.passedQty,
              unitPrice: item.purchasePrice || 0,
              remarks: `Passed QC / Supplier Invoice: ${qc.supplierInvoiceNumber || 'N/A'}`
            });
          }
          if (item.damagedQty > 0) {
            productMap[pId].outwardQty += item.damagedQty;
            productMap[pId].transactions.push({
              id: `QC-OUT-${qc._id}-${item._id || item.product}`,
              date,
              type: 'OUT',
              source: 'Vendor Return (QC Damaged)',
              refNumber: qc.qcNumber,
              batchNumber: item.batchNumber || 'N/A',
              quantity: item.damagedQty,
              unitPrice: item.purchasePrice || 0,
              remarks: item.remarks || 'Rejected during Quality Check'
            });
          }
        }
      });
    });

    // 2. Process Manual / Backend Inventory Transactions
    (transactions || []).forEach(tx => {
      const pId = tx.product?._id ? tx.product._id.toString() : (typeof tx.product === 'string' ? tx.product : null);
      if (pId && productMap[pId]) {
        const date = tx.createdAt || new Date();
        if (tx.transactionType === 'IN') {
          productMap[pId].inwardQty += tx.quantity;
        } else if (tx.transactionType === 'OUT') {
          productMap[pId].outwardQty += tx.quantity;
        }
        productMap[pId].transactions.push({
          id: tx._id,
          date,
          type: tx.transactionType,
          source: tx.referenceType || 'Manual Adjustment',
          refNumber: tx.batchNumber || 'N/A',
          batchNumber: tx.batchNumber || 'N/A',
          quantity: tx.quantity,
          unitPrice: 0,
          remarks: tx.remarks || 'Stock transaction record'
        });
      }
    });

    // 3. Sync Current On-Hand Stock from Inventory documents
    (inventory || []).forEach(inv => {
      const pId = inv.product?._id ? inv.product._id.toString() : (typeof inv.product === 'string' ? inv.product : null);
      if (pId && productMap[pId] && inv.inventoryType === 'Store Room') {
        productMap[pId].currentStock += inv.quantity;
      }
    });

    // If currentStock is 0 but inwardQty > outwardQty, compute net fallback
    Object.values(productMap).forEach(item => {
      if (item.currentStock === 0 && item.inwardQty > 0) {
        item.currentStock = Math.max(0, item.inwardQty - item.outwardQty);
      }
      // Sort product transactions chronologically
      item.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    return Object.values(productMap);
  };

  const compiledProducts = compileProductStock();

  // Categories list
  const categories = ['ALL', ...new Set(compiledProducts.map(p => p.category))];

  // Filtered Products for Stock Balance view
  const filteredProducts = compiledProducts.filter(p => {
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchCode = (p.itemCode || '').toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      return matchName || matchCode || matchCat;
    }
    return true;
  });

  // Flat Movement Ledger (All transactions across all products)
  const allMovementLedger = [];
  compiledProducts.forEach(p => {
    p.transactions.forEach(tx => {
      allMovementLedger.push({
        ...tx,
        productName: p.name,
        itemCode: p.itemCode,
        category: p.category,
        unitOfMeasure: p.unitOfMeasure
      });
    });
  });
  allMovementLedger.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filtered Movement Ledger
  const filteredLedger = allMovementLedger.filter(tx => {
    if (txTypeFilter !== 'ALL' && tx.type !== txTypeFilter) return false;
    if (selectedCategory !== 'ALL' && tx.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchProd = (tx.productName || '').toLowerCase().includes(q);
      const matchCode = (tx.itemCode || '').toLowerCase().includes(q);
      const matchRef = (tx.refNumber || '').toLowerCase().includes(q);
      const matchBatch = (tx.batchNumber || '').toLowerCase().includes(q);
      const matchRem = (tx.remarks || '').toLowerCase().includes(q);
      return matchProd || matchCode || matchRef || matchBatch || matchRem;
    }
    return true;
  });

  // Top Summary Totals
  const totalProductsCount = compiledProducts.length;
  const totalInwardQty = compiledProducts.reduce((sum, p) => sum + p.inwardQty, 0);
  const totalOutwardQty = compiledProducts.reduce((sum, p) => sum + p.outwardQty, 0);
  const totalAvailableStock = compiledProducts.reduce((sum, p) => sum + p.currentStock, 0);

  // Handle Record Stock Movement Form Submit
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!recordForm.productId) return alert('Please select a product.');
    if (!recordForm.quantity || parseFloat(recordForm.quantity) <= 0) return alert('Please enter a valid quantity.');

    try {
      setSubmitting(true);
      await api.post('/inventory/transactions', {
        product: recordForm.productId,
        transactionType: recordForm.transactionType,
        quantity: parseFloat(recordForm.quantity),
        batchNumber: recordForm.batchNumber || `B-${Date.now().toString().slice(-4)}`,
        inventoryType: 'Store Room',
        referenceType: 'MANUAL',
        remarks: recordForm.remarks || `Manual Stock ${recordForm.transactionType === 'IN' ? 'Inward' : 'Outward'}`
      });

      alert(`Stock ${recordForm.transactionType === 'IN' ? 'Inward' : 'Outward'} recorded successfully!`);
      setIsRecordModalOpen(false);
      setRecordForm({ productId: '', transactionType: 'IN', quantity: '', batchNumber: '', remarks: '' });
      fetchStockData();
    } catch (error) {
      console.error('Failed to record stock movement', error);
      alert(error.response?.data?.message || 'Failed to record stock movement');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Product Ledger Modal
  const handleOpenProductModal = (product) => {
    setSelectedProductModal(product);
    setIsProductModalOpen(true);
  };

  // Print Stock Report
  const handlePrintStockReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow popups to print the stock report.');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Raw Material Stock Report - Saravanaa ERP</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; }
            .header { background: linear-gradient(135deg, #d81b60 0%, #ad1457 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
            .table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            .table th { background: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-weight: bold; }
            .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .inward { color: #047857; font-weight: bold; }
            .outward { color: #be123c; font-weight: bold; }
            .stock { color: #1e1b4b; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Sri Saravanaa ERP System</h1>
              <div>Raw Material Stock & Movement Summary</div>
            </div>
            <div>Generated: ${new Date().toLocaleString()}</div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Product / Raw Material Name</th>
                <th>Category</th>
                <th class="text-right">Inward Qty (+)</th>
                <th class="text-right">Outward Qty (-)</th>
                <th class="text-right">Current Available Stock</th>
                <th>UOM</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProducts.map(p => `
                <tr>
                  <td class="font-mono">${p.itemCode}</td>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.category}</td>
                  <td class="text-right font-mono inward">+ ${p.inwardQty}</td>
                  <td class="text-right font-mono outward">- ${p.outwardQty}</td>
                  <td class="text-right font-mono stock">${p.currentStock}</td>
                  <td>${p.unitOfMeasure}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div>
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Package className="text-[var(--color-primary)]" size={26} />
            Raw Material Stock & Movement
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time raw material balances, Quality Control stock-inward, and outward dispatches
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(216,27,96,0.3)]"
          >
            <Plus size={16} /> Record Stock Movement
          </button>

          <button
            onClick={handlePrintStockReport}
            className="flex items-center gap-2 bg-white border border-[var(--color-glass-border)] text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Raw Material Items</span>
            <h3 className="text-xl font-bold text-gray-900 font-mono mt-0.5">{totalProductsCount} Products</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Total Inward Qty</span>
            <h3 className="text-xl font-bold text-emerald-700 font-mono mt-0.5">+ {totalInwardQty.toLocaleString()} Units</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-rose-500">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <span className="text-xs text-rose-800 font-semibold uppercase tracking-wider">Total Outward Qty</span>
            <h3 className="text-xl font-bold text-rose-700 font-mono mt-0.5">- {totalOutwardQty.toLocaleString()} Units</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-indigo-500">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <span className="text-xs text-indigo-900 font-semibold uppercase tracking-wider">Net On-Hand Stock</span>
            <h3 className="text-xl font-bold text-indigo-950 font-mono mt-0.5">{totalAvailableStock.toLocaleString()} Units</h3>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Category & Views */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white/40 p-4 rounded-2xl border border-[var(--color-glass-border)] shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('Stock Balance')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
              activeTab === 'Stock Balance'
                ? 'bg-white text-[var(--color-primary)] border-pink-400 shadow-md ring-2 ring-pink-500/20'
                : 'bg-white/80 text-gray-700 border-transparent hover:bg-gray-100'
            }`}
          >
            Raw Material Stock Balances
          </button>
          <button
            onClick={() => setActiveTab('Movement Ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
              activeTab === 'Movement Ledger'
                ? 'bg-white text-[var(--color-primary)] border-pink-400 shadow-md ring-2 ring-pink-500/20'
                : 'bg-white/80 text-gray-700 border-transparent hover:bg-gray-100'
            }`}
          >
            Inward & Outward Movement Ledger
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search product, code, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-[var(--color-glass-border)] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-pink-200/80 rounded-xl px-4 py-1.5 text-xs font-bold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[var(--color-primary)] hover:border-pink-300 transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23d81b60%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_12px_center] bg-no-repeat pr-8 cursor-pointer"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          {activeTab === 'Movement Ledger' && (
            <select
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value)}
              className="bg-white border border-[var(--color-glass-border)] rounded-xl px-3 py-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="ALL">All Types (IN & OUT)</option>
              <option value="IN">Inward Only (IN)</option>
              <option value="OUT">Outward Only (OUT)</option>
            </select>
          )}
        </div>
      </div>

      {/* Content Panels */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-600 flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
            Loading Raw Material Stock Data...
          </div>
        ) : (
          <div>
            {/* VIEW 1: RAW MATERIAL STOCK BALANCES */}
            {activeTab === 'Stock Balance' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Item Code</th>
                      <th className="px-6 py-4">Raw Material / Product Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-right text-emerald-700">Total Inward Qty</th>
                      <th className="px-6 py-4 text-right text-rose-700">Total Outward Qty</th>
                      <th className="px-6 py-4 text-right text-indigo-950 font-bold">Current On-Hand Stock</th>
                      <th className="px-6 py-4 text-center">UOM</th>
                      <th className="px-6 py-4 text-center">Stock Status</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)]">
                    {filteredProducts.map((p) => {
                      const isLowStock = p.currentStock <= p.minimumStockLevel && p.currentStock > 0;
                      const isOutOfStock = p.currentStock <= 0;

                      return (
                        <tr key={p.id} className="hover:bg-white/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-600">{p.itemCode}</td>
                          <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                          <td className="px-6 py-4 font-medium text-gray-600">{p.category}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                            + {p.inwardQty.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                            - {p.outwardQty.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-extrabold text-indigo-950 text-base">
                            {p.currentStock.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center text-xs font-semibold text-gray-600">{p.unitOfMeasure}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                              isOutOfStock ? 'bg-red-50 text-red-700 border border-red-200' :
                              isLowStock ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock Alert' : 'In Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleOpenProductModal(p)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-soft)] transition-all shadow-[0_0_10px_rgba(216,27,96,0.2)] inline-flex items-center gap-1"
                            >
                              <History size={14} /> View Movement Ledger
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan="9" className="px-6 py-10 text-center text-gray-500">
                          No raw material stock records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW 2: INWARD & OUTWARD MOVEMENT LEDGER */}
            {activeTab === 'Movement Ledger' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4 text-center">Type</th>
                      <th className="px-6 py-4">Product Name & Code</th>
                      <th className="px-6 py-4 text-center">Batch No</th>
                      <th className="px-6 py-4 text-right text-emerald-700">Inward (+)</th>
                      <th className="px-6 py-4 text-right text-rose-700">Outward (-)</th>
                      <th className="px-6 py-4">Reference Source</th>
                      <th className="px-6 py-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)]">
                    {filteredLedger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/40 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-gray-600 whitespace-nowrap">
                          {new Date(tx.date).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {tx.type === 'IN' ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🟢 INWARD
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              🔴 OUTWARD
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {tx.productName}
                          <span className="block font-mono text-[10px] text-gray-400 font-normal">Code: {tx.itemCode}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 font-semibold">
                            {tx.batchNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                          {tx.type === 'IN' ? `+ ${tx.quantity} ${tx.unitOfMeasure}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                          {tx.type === 'OUT' ? `- ${tx.quantity} ${tx.unitOfMeasure}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-800 font-mono">
                          {tx.refNumber || tx.source}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600">
                          {tx.remarks}
                        </td>
                      </tr>
                    ))}
                    {filteredLedger.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                          No stock movement ledger transactions logged.
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

      {/* --- POPUP MODAL: PRODUCT STOCK HISTORY LEDGER --- */}
      {isProductModalOpen && selectedProductModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="fixed inset-0" onClick={() => setIsProductModalOpen(false)}></div>
          <div className="relative glass-panel w-full max-w-4xl bg-white border border-[var(--color-glass-border)] shadow-2xl rounded-2xl z-[100000] overflow-hidden flex flex-col my-auto max-h-[85vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--color-glass-border)] bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--color-primary)] text-white shadow-md">
                  <Package size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {selectedProductModal.name}
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 font-semibold">
                      {selectedProductModal.itemCode}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Category: {selectedProductModal.category} | UOM: {selectedProductModal.unitOfMeasure}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Inward Qty</span>
                  <span className="text-lg font-extrabold text-emerald-700 font-mono mt-0.5 block">+ {selectedProductModal.inwardQty}</span>
                </div>
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 text-center">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Total Outward Qty</span>
                  <span className="text-lg font-extrabold text-rose-700 font-mono mt-0.5 block">- {selectedProductModal.outwardQty}</span>
                </div>
                <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 text-center">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">Current On-Hand Stock</span>
                  <span className="text-lg font-extrabold text-indigo-950 font-mono mt-0.5 block">{selectedProductModal.currentStock}</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Type</th>
                      <th className="px-4 py-3 text-center">Batch No</th>
                      <th className="px-4 py-3 text-right">Inward Qty</th>
                      <th className="px-4 py-3 text-right">Outward Qty</th>
                      <th className="px-4 py-3">Ref / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedProductModal.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-600">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-center">
                          {tx.type === 'IN' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">INWARD</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">OUTWARD</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">{tx.batchNumber}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{tx.type === 'IN' ? `+ ${tx.quantity}` : '-'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">{tx.type === 'OUT' ? `- ${tx.quantity}` : '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{tx.remarks}</td>
                      </tr>
                    ))}
                    {selectedProductModal.transactions.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-6 text-center text-gray-500">No stock movement logs found for this product.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP MODAL: MANUAL INWARD / OUTWARD STOCK RECORD --- */}
      <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Record Stock Movement (Inward / Outward)">
        <form onSubmit={handleRecordSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Select Product / Raw Material *</label>
            <select
              required
              value={recordForm.productId}
              onChange={(e) => setRecordForm({ ...recordForm, productId: e.target.value })}
              className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Select Raw Material</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.itemCode}) - Category: {p.category}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Movement Type *</label>
              <select
                value={recordForm.transactionType}
                onChange={(e) => setRecordForm({ ...recordForm, transactionType: e.target.value })}
                className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm font-bold focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="IN">🟢 INWARD (Stock Arrival / Addition)</option>
                <option value="OUT">🔴 OUTWARD (Production Usage / Dispatch)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Quantity *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={recordForm.quantity}
                onChange={(e) => setRecordForm({ ...recordForm, quantity: e.target.value })}
                className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="e.g. 50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Batch Code (Optional)</label>
            <input
              type="text"
              value={recordForm.batchNumber}
              onChange={(e) => setRecordForm({ ...recordForm, batchNumber: e.target.value })}
              className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              placeholder="e.g. B-101"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Remarks / Purpose *</label>
            <input
              type="text"
              required
              value={recordForm.remarks}
              onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })}
              className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              placeholder="e.g. Dispatched for ice cream batch #45 or Stock Adjustment"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-glass-border)]">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-6 py-2 rounded-md text-sm font-bold transition-all shadow-[0_0_15px_rgba(216,27,96,0.3)] disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Stock Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RawMaterialStock;
