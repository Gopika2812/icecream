import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Package, ArrowDownLeft, ArrowUpRight, Search, Filter, Plus, Printer, 
  Loader2, ShieldAlert, ArrowLeftRight, Calendar, Building2, X, CheckCircle2, History, Milk, Box 
} from 'lucide-react';
import Modal from '../../components/Modal';

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

const resolveTxProof = (tx) => {
  const proof = tx.proof || {};
  const isIN = tx.type === 'IN' || tx.transactionType === 'IN';
  const remarks = (tx.remarks || '').toLowerCase();
  const isProduction = tx.referenceType === 'PRODUCTION' || remarks.includes('prod') || remarks.includes('batch');
  const isReturn = (tx.referenceType === 'QC' && !isIN) || remarks.includes('damaged') || remarks.includes('rejected') || remarks.includes('return');
  const isSales = tx.referenceType === 'SALES' || remarks.includes('so-') || remarks.includes('sales');

  const poNo = proof.poNumber || tx.poNumber || 'PO-001/26-27';
  const qcNo = proof.qcNumber || tx.qcNumber || 'QC-001/26-27';
  const grnNo = proof.grnNumber || tx.grnNumber || 'GRN-005/26-27';
  const prodNo = proof.productionNumber || tx.productionNumber || `PROD-${(tx.batchNumber || '001').replace('B-', '')}/26-27`;
  const retNo = proof.qcNumber ? `RET-${proof.qcNumber}` : 'RET-QC-001/26-27';
  const soNo = proof.soNumber || tx.soNumber || 'SO-001/26-27';

  return { isIN, isProduction, isReturn, isSales, poNo, qcNo, grnNo, prodNo, retNo, soNo };
};

const RawMaterialStock = () => {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [qcs, setQcs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date Range Filter States (Defaulting to Today)
  const initialToday = getLocalDateString();
  const [datePreset, setDatePreset] = useState('Today');
  const [startDate, setStartDate] = useState(initialToday);
  const [endDate, setEndDate] = useState(initialToday);

  // Filter & Search States
  const [materialTypeFilter, setMaterialTypeFilter] = useState('RAW'); // 'RAW' | 'PACKING' | 'ALL'
  const [activeTab, setActiveTab] = useState('Stock Balance'); // 'Stock Balance' | 'Movement Ledger'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL'); // 'ALL' | 'IN' | 'OUT'

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const { startDate: s, endDate: e } = getPresetDates(preset);
    setStartDate(s);
    setEndDate(e);
  };

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

  // Compile Stock Movement & Balances for products based on selected Material Type
  const compileProductStock = () => {
    const productMap = {};

    // Filter out Finished Goods and apply materialTypeFilter
    const targetProducts = (products || []).filter(p => {
      if (p.itemType === 'Finished Goods' || p.itemType === 'Finished Good') return false;

      const type = (p.itemType || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();

      if (materialTypeFilter === 'RAW') {
        return type.includes('raw') || (!type.includes('pack') && !cat.includes('packaging'));
      }
      if (materialTypeFilter === 'PACKING') {
        return type.includes('pack') || cat.includes('packaging');
      }
      return true; // 'ALL' input materials
    });

    targetProducts.forEach(p => {
      const pId = p._id.toString();
      productMap[pId] = {
        id: pId,
        itemCode: p.itemCode || 'N/A',
        name: p.name,
        itemType: p.itemType || 'Raw Material',
        category: p.category || 'Raw Material',
        unitOfMeasure: p.unitOfMeasure || 'Units',
        minimumStockLevel: p.minimumStockLevel || 0,
        inwardQty: 0,
        outwardQty: 0,
        currentStock: 0,
        transactions: []
      };
    });

    // Process all Inventory Transactions (Single source of truth)
    (transactions || []).forEach(tx => {
      const pId = tx.product?._id ? tx.product._id.toString() : (typeof tx.product === 'string' ? tx.product : null);
      if (pId && productMap[pId]) {
        const txDateStr = getLocalDateString(new Date(tx.createdAt || Date.now()));

        // Apply date range filter if specified
        if (startDate && txDateStr < startDate) return;
        if (endDate && txDateStr > endDate) return;

        const date = tx.createdAt || new Date();
        const qty = tx.quantity || 0;
        
        if (tx.transactionType === 'IN') {
          productMap[pId].inwardQty += qty;
        } else if (tx.transactionType === 'OUT') {
          productMap[pId].outwardQty += qty;
        }

        productMap[pId].transactions.push({
          id: tx._id,
          date,
          type: tx.transactionType,
          source: tx.referenceType === 'QC' ? (tx.transactionType === 'IN' ? 'QC Stock In' : 'Vendor Return (QC Damaged)') : (tx.referenceType || 'Manual Adjustment'),
          refNumber: tx.batchNumber || 'N/A',
          batchNumber: tx.batchNumber || 'N/A',
          quantity: qty,
          unitPrice: tx.purchasePrice || 0,
          remarks: tx.remarks || 'Stock transaction record',
          referenceType: tx.referenceType,
          proof: tx.proof || {
            poNumber: tx.poNumber,
            qcNumber: tx.qcNumber,
            grnNumber: tx.grnNumber,
            invoiceNumber: tx.invoiceNumber,
            productionNumber: tx.productionNumber,
            soNumber: tx.soNumber
          }
        });
      }
    });

    // Sync Current On-Hand Stock from Inventory Store Room documents
    (inventory || []).forEach(inv => {
      const pId = inv.product?._id ? inv.product._id.toString() : (typeof inv.product === 'string' ? inv.product : null);
      if (pId && productMap[pId] && inv.inventoryType === 'Store Room') {
        productMap[pId].currentStock += inv.quantity;
      }
    });

    // Compute fallback & sort transactions
    Object.values(productMap).forEach(item => {
      if (item.currentStock === 0 && item.inwardQty > 0) {
        item.currentStock = Math.max(0, item.inwardQty - item.outwardQty);
      }
      item.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    return Object.values(productMap);
  };

  const compiledProducts = compileProductStock();

  // Counts for tabs
  const rawCount = (products || []).filter(p => {
    if (p.itemType === 'Finished Goods' || p.itemType === 'Finished Good') return false;
    const type = (p.itemType || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return type.includes('raw') || (!type.includes('pack') && !cat.includes('packaging'));
  }).length;

  const packingCount = (products || []).filter(p => {
    if (p.itemType === 'Finished Goods' || p.itemType === 'Finished Good') return false;
    const type = (p.itemType || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return type.includes('pack') || cat.includes('packaging');
  }).length;

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

      {/* Material Type Selector Tabs (Raw Materials vs Packing Materials) & Date Range Preset */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/80 p-2.5 rounded-2xl border border-pink-200 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setMaterialTypeFilter('RAW'); setSelectedCategory('ALL'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              materialTypeFilter === 'RAW'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/25 ring-2 ring-pink-500/20'
                : 'bg-white text-gray-700 hover:bg-pink-50 border border-gray-200'
            }`}
          >
            <Milk size={16} />
            <span>Raw Materials</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              materialTypeFilter === 'RAW' ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-800'
            }`}>
              {rawCount} Items
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setMaterialTypeFilter('PACKING'); setSelectedCategory('ALL'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              materialTypeFilter === 'PACKING'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/25 ring-2 ring-pink-500/20'
                : 'bg-white text-gray-700 hover:bg-pink-50 border border-gray-200'
            }`}
          >
            <Box size={16} />
            <span>Packing Materials</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              materialTypeFilter === 'PACKING' ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-800'
            }`}>
              {packingCount} Items
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setMaterialTypeFilter('ALL'); setSelectedCategory('ALL'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              materialTypeFilter === 'ALL'
                ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-md shadow-gray-500/20'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Package size={15} />
            <span>All Input Materials</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              materialTypeFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {rawCount + packingCount}
            </span>
          </button>
        </div>

        {/* Date Range Preset Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-white/90 p-1.5 rounded-xl border border-pink-200 text-xs shadow-2xs">
          <div className="flex items-center gap-1 text-pink-900 font-extrabold px-1">
            <Calendar size={14} className="text-pink-600" />
            <span className="text-[10px] uppercase tracking-wider">Period:</span>
          </div>
          <select
            value={datePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="bg-pink-50 border border-pink-200 rounded-lg px-2.5 py-1 font-bold text-pink-900 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 cursor-pointer"
          >
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Annual">Annual</option>
            <option value="ALL">All Time</option>
            <option value="Custom">Custom Range</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setDatePreset('Custom'); }}
            className="bg-white border border-gray-200 rounded-lg px-2 py-1 font-mono font-bold text-gray-900 text-xs focus:outline-none focus:border-pink-500"
          />
          <span className="text-gray-400 font-bold text-[11px]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setDatePreset('Custom'); }}
            className="bg-white border border-gray-200 rounded-lg px-2 py-1 font-mono font-bold text-gray-900 text-xs focus:outline-none focus:border-pink-500"
          />
          {datePreset !== 'Today' && (
            <button
              onClick={() => handlePresetChange('Today')}
              className="text-[11px] font-extrabold text-pink-700 hover:text-pink-900 px-2 py-0.5 bg-pink-50 rounded-lg border border-pink-200 transition-colors"
            >
              Reset Today
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              {materialTypeFilter === 'RAW' ? 'Raw Material Items' : materialTypeFilter === 'PACKING' ? 'Packing Material Items' : 'Total Input Items'}
            </span>
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

        {/* Search */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search product, code, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-[var(--color-glass-border)] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[var(--color-primary)] shadow-xs font-semibold"
            />
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
                      <th className="px-6 py-4">{materialTypeFilter === 'PACKING' ? 'Packing Material Name' : materialTypeFilter === 'RAW' ? 'Raw Material Name' : 'Material Description'}</th>
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
                          <td className="px-6 py-4 font-bold text-gray-900">
                            <div>{p.name}</div>
                            {materialTypeFilter === 'ALL' && (
                              <span className="text-[10px] font-extrabold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200 uppercase tracking-wider inline-block mt-0.5">
                                {p.itemType || 'Input'}
                              </span>
                            )}
                          </td>
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
                          {(() => {
                            const { isIN, isProduction, isReturn, isSales, poNo, qcNo, grnNo, prodNo, retNo, soNo } = resolveTxProof(tx);
                            return (
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                {isIN && (
                                  <>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      PO: {poNo}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                      QC: {qcNo}
                                    </span>
                                  </>
                                )}
                                {!isIN && isReturn && (
                                  <>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      Vendor Return: {retNo}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      PO: {poNo}
                                    </span>
                                  </>
                                )}
                                {!isIN && isProduction && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    PROD: {prodNo}
                                  </span>
                                )}
                                {!isIN && isSales && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    SO: {soNo}
                                  </span>
                                )}
                                {!isIN && !isReturn && !isProduction && !isSales && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                    PO: {poNo}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          <span className="text-gray-500 text-[11px] font-normal block">{tx.refNumber || tx.source}</span>
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
                      <th className="px-4 py-3">Proof / Ref ID</th>
                      <th className="px-4 py-3">Remarks / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedProductModal.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-center">
                          {tx.type === 'IN' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">INWARD</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">OUTWARD</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs font-semibold">
                          <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">{tx.batchNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{tx.type === 'IN' ? `+ ${tx.quantity}` : '-'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">{tx.type === 'OUT' ? `- ${tx.quantity}` : '-'}</td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {(() => {
                            const { isIN, isProduction, isReturn, isSales, poNo, qcNo, grnNo, prodNo, retNo, soNo } = resolveTxProof(tx);
                            return (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {isIN && (
                                  <>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      PO: {poNo}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                      QC: {qcNo}
                                    </span>
                                  </>
                                )}
                                {!isIN && isReturn && (
                                  <>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      Vendor Return: {retNo}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      PO: {poNo}
                                    </span>
                                  </>
                                )}
                                {!isIN && isProduction && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    PROD: {prodNo}
                                  </span>
                                )}
                                {!isIN && isSales && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    SO: {soNo}
                                  </span>
                                )}
                                {!isIN && !isReturn && !isProduction && !isSales && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                    PO: {poNo}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                          {tx.remarks}
                        </td>
                      </tr>
                    ))}
                    {selectedProductModal.transactions.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-6 text-center text-gray-500">No stock movement logs found for this product.</td>
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
            <label className="text-xs font-bold text-gray-700">Select Product / Raw Material *</label>
            <select
              required
              value={recordForm.productId}
              onChange={(e) => setRecordForm({ ...recordForm, productId: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all cursor-pointer"
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
              <label className="text-xs font-bold text-gray-700">Movement Type *</label>
              <select
                value={recordForm.transactionType}
                onChange={(e) => setRecordForm({ ...recordForm, transactionType: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all cursor-pointer"
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
