import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  ThermometerSnowflake, ShoppingBag, ShieldAlert, ArrowUpRight, ArrowDownLeft, 
  Search, Filter, Plus, Printer, Loader2, QrCode, Building2, Users, Calendar, Box, X, History, ChevronDown, ChevronRight 
} from 'lucide-react';
import Modal from '../../components/Modal';
import SearchableSelect from '../../components/SearchableSelect';

const FinishedGoodsStock = () => {
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Cold Room');

  // Date Range Filters & Expanded Product State for Movement Ledger
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedProductId, setExpandedProductId] = useState(null);

  // Modals
  const [selectedBatchForSale, setSelectedBatchForSale] = useState(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  
  const [selectedBatchForDamage, setSelectedBatchForDamage] = useState(null);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);

  // Form States
  const [saleForm, setSaleForm] = useState({
    customerId: '',
    invoiceNumber: '',
    boxesToSell: 1,
    sellingPrice: ''
  });

  const [damageForm, setDamageForm] = useState({
    damagedQuantity: 1,
    reason: ''
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFgStockData();
  }, []);

  const fetchFgStockData = async () => {
    try {
      setLoading(true);
      const [invRes, txRes, custRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/transactions'),
        api.get('/customers')
      ]);

      setInventory(invRes.data.data || []);
      setTransactions(txRes.data.data || []);
      setCustomers(custRes.data.data || []);
    } catch (error) {
      console.error('Failed to load finished goods stock data', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter finished goods items (Cold Room & Finished Goods products)
  const fgInventory = inventory.filter(i => 
    i.product?.itemType === 'Finished Goods' &&
    (selectedLocation === 'ALL' || i.inventoryType === selectedLocation)
  );

  // Filtered FG Stock Balances
  const filteredFgStock = fgInventory.filter(i => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchName = (i.product?.name || '').toLowerCase().includes(q);
    const matchCode = (i.product?.itemCode || '').toLowerCase().includes(q);
    const matchBatch = (i.batchNumber || '').toLowerCase().includes(q);
    return matchName || matchCode || matchBatch;
  });

  // Group transactions by product for Single-Row Product Ledger Summary
  const productLedgerSummary = React.useMemo(() => {
    const fgTxs = transactions.filter(tx => tx.product && tx.product.itemType === 'Finished Goods');
    const productMap = {};

    fgTxs.forEach(tx => {
      const pId = tx.product._id;
      if (!productMap[pId]) {
        productMap[pId] = {
          product: tx.product,
          allTxs: []
        };
      }
      productMap[pId].allTxs.push(tx);
    });

    inventory.forEach(inv => {
      if (inv.product && inv.product.itemType === 'Finished Goods') {
        const pId = inv.product._id;
        if (!productMap[pId]) {
          productMap[pId] = {
            product: inv.product,
            allTxs: []
          };
        }
      }
    });

    const startTs = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
    const endTs = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;

    const summaryList = Object.values(productMap).map(({ product, allTxs }) => {
      let openingQty = 0;
      let inwardQty = 0;
      let outwardQty = 0;
      const periodTxs = [];

      allTxs.forEach(tx => {
        const txTime = new Date(tx.createdAt).getTime();
        const qty = parseFloat(tx.quantity) || 0;

        if (startDate && txTime < startTs) {
          if (tx.transactionType === 'IN') openingQty += qty;
          else if (tx.transactionType === 'OUT') openingQty -= qty;
        } else if (txTime >= startTs && txTime <= endTs) {
          if (tx.transactionType === 'IN') inwardQty += qty;
          else if (tx.transactionType === 'OUT') outwardQty += qty;
          periodTxs.push(tx);
        }
      });

      const closingQty = startDate
        ? Math.max(0, openingQty + inwardQty - outwardQty)
        : Math.max(0, inwardQty - outwardQty);

      return {
        product,
        openingQty: Math.max(0, openingQty),
        inwardQty,
        outwardQty,
        closingQty,
        periodTxs: periodTxs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      };
    });

    return summaryList.filter(item => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (item.product?.name || '').toLowerCase().includes(q) ||
        (item.product?.itemCode || '').toLowerCase().includes(q)
      );
    });
  }, [transactions, inventory, startDate, endDate, searchTerm]);

  // Top Summary Totals
  const coldRoomItems = inventory.filter(i => i.product?.itemType === 'Finished Goods' && i.inventoryType === 'Cold Room');
  const totalColdRoomPieces = coldRoomItems.reduce((sum, i) => sum + i.quantity, 0);
  const fgTransactions = transactions.filter(tx => tx.product?.itemType === 'Finished Goods');
  const totalSalesCount = fgTransactions.filter(tx => tx.transactionType === 'OUT' && tx.referenceType === 'MANUAL').length;
  const totalDamagedPieces = inventory.filter(i => i.product?.itemType === 'Finished Goods' && i.inventoryType === 'Rejected Stock').reduce((sum, i) => sum + i.quantity, 0);

  // Handle Submit Customer Sales Dispatch (OUTWARD)
  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatchForSale) return;
    if (!saleForm.boxesToSell || parseInt(saleForm.boxesToSell) <= 0) return alert('Enter valid box count.');

    const piecesPerBox = selectedBatchForSale.product?.piecesPerBox || 12;
    const totalPiecesToDeduct = parseInt(saleForm.boxesToSell) * piecesPerBox;

    if (totalPiecesToDeduct > selectedBatchForSale.quantity) {
      return alert(`Insufficient stock! Selected batch only has ${selectedBatchForSale.quantity} Pcs available.`);
    }

    try {
      setSubmitting(true);
      const custObj = customers.find(c => c._id === saleForm.customerId);
      const customerName = custObj ? custObj.name : 'Walk-in Customer';

      await api.post('/inventory/transactions', {
        product: selectedBatchForSale.product._id,
        inventoryType: 'Cold Room',
        batchNumber: selectedBatchForSale.batchNumber,
        transactionType: 'OUT',
        quantity: totalPiecesToDeduct,
        referenceType: 'MANUAL',
        remarks: `Sales Dispatch to Customer: ${customerName} | Invoice: ${saleForm.invoiceNumber || 'INV-SALE'} (${saleForm.boxesToSell} Boxes)`
      });

      alert(`Sales Dispatch Completed! ${totalPiecesToDeduct} Pcs (${saleForm.boxesToSell} Boxes) sold to ${customerName}.`);
      setIsSaleModalOpen(false);
      setSaleForm({ customerId: '', invoiceNumber: '', boxesToSell: 1, sellingPrice: '' });
      fetchFgStockData();
    } catch (error) {
      console.error('Failed to process sale dispatch', error);
      alert(error.response?.data?.message || 'Error processing sales dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit Damaged / Melted Stock (OUTWARD to Rejected Stock)
  const handleDamageSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatchForDamage) return;
    if (!damageForm.damagedQuantity || parseInt(damageForm.damagedQuantity) <= 0) return alert('Enter valid quantity.');

    const qty = parseInt(damageForm.damagedQuantity);
    if (qty > selectedBatchForDamage.quantity) {
      return alert(`Damage quantity exceeds available batch stock (${selectedBatchForDamage.quantity} Pcs).`);
    }

    try {
      setSubmitting(true);
      // Deduct from Cold Room
      await api.post('/inventory/transactions', {
        product: selectedBatchForDamage.product._id,
        inventoryType: 'Cold Room',
        batchNumber: selectedBatchForDamage.batchNumber,
        transactionType: 'OUT',
        quantity: qty,
        referenceType: 'MANUAL',
        remarks: `Damaged/Melted Stock: ${damageForm.reason || 'Cold storage damage'}`
      });

      // Stock into Rejected Stock
      await api.post('/inventory/transactions', {
        product: selectedBatchForDamage.product._id,
        inventoryType: 'Rejected Stock',
        batchNumber: selectedBatchForDamage.batchNumber,
        transactionType: 'IN',
        quantity: qty,
        referenceType: 'MANUAL',
        remarks: `Transferred to Rejected Stock: ${damageForm.reason || 'Melted/Damaged'}`
      });

      alert(`Stock Damage Logged! ${qty} Pcs transferred to Rejected Stock.`);
      setIsDamageModalOpen(false);
      setDamageForm({ damagedQuantity: 1, reason: '' });
      fetchFgStockData();
    } catch (error) {
      console.error('Failed to log damaged stock', error);
      alert(error.response?.data?.message || 'Error logging damaged stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            <ThermometerSnowflake className="text-[var(--color-primary)]" size={26} />
            Finished Goods Main Inventory (Cold Room)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Cold storage inventory management, production inward logs, customer sales dispatches, and damaged stock tracking
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ThermometerSnowflake size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Cold Room Storage</span>
            <h3 className="text-xl font-bold text-gray-900 font-mono mt-0.5">{totalColdRoomPieces.toLocaleString()} Pcs</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Inward (From Production)</span>
            <h3 className="text-xl font-bold text-emerald-700 font-mono mt-0.5">{coldRoomItems.length} Batches</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <span className="text-xs text-purple-800 font-semibold uppercase tracking-wider">Sales Dispatches</span>
            <h3 className="text-xl font-bold text-purple-700 font-mono mt-0.5">{totalSalesCount} Orders</h3>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-4 border-l-4 border-l-rose-500">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert size={24} />
          </div>
          <div>
            <span className="text-xs text-rose-800 font-semibold uppercase tracking-wider">Damaged / Rejected Stock</span>
            <h3 className="text-xl font-bold text-rose-700 font-mono mt-0.5">{totalDamagedPieces.toLocaleString()} Pcs</h3>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white/40 p-4 rounded-2xl border border-[var(--color-glass-border)] shadow-sm mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          
          {/* Date Period Filtration */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Calendar size={16} className="text-[var(--color-primary)]" /> Filter Date Period:
            </span>
            
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500 font-semibold">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-pink-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500 font-semibold">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-pink-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
            
            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setStartDate(today);
                  setEndDate(today);
                }}
                className="px-2.5 py-1 rounded-lg bg-pink-50 text-[var(--color-primary)] border border-pink-200 text-xs font-bold hover:bg-pink-100 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                  const today = d.toISOString().split('T')[0];
                  setStartDate(firstDay);
                  setEndDate(today);
                }}
                className="px-2.5 py-1 rounded-lg bg-pink-50 text-[var(--color-primary)] border border-pink-200 text-xs font-bold hover:bg-pink-100 transition-colors"
              >
                This Month
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  <X size={12} /> Clear Filter
                </button>
              )}
            </div>
          </div>

          {/* Search & Location Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search product name, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-[var(--color-glass-border)] rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-500" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-white border border-pink-200/80 rounded-xl px-4 py-1.5 text-xs font-bold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-[var(--color-primary)] hover:border-pink-300 transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23d81b60%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_12px_center] bg-no-repeat pr-8 cursor-pointer"
              >
                <option value="Cold Room">Cold Room Storage</option>
                <option value="Rejected Stock">Damaged / Rejected Stock</option>
                <option value="ALL">All Storage Locations</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area: Single Row Product Inward & Outward Ledger */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-600 flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
            Loading Finished Goods Inventory...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Finished Good Item</th>
                  <th className="px-6 py-4 text-right text-gray-700">Opening Stock</th>
                  <th className="px-6 py-4 text-right text-emerald-700">Period Inward (+)</th>
                  <th className="px-6 py-4 text-right text-rose-700">Period Outward (-)</th>
                  <th className="px-6 py-4 text-right text-indigo-700">Closing Stock</th>
                  <th className="px-6 py-4 text-center">Actions & History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-glass-border)]">
                {productLedgerSummary.map((item) => {
                  const pPerBox = item.product?.piecesPerBox || 12;
                  const isExpanded = expandedProductId === item.product?._id;

                  const openBoxes = Math.floor(item.openingQty / pPerBox);
                  const openLoose = item.openingQty % pPerBox;

                  const closeBoxes = Math.floor(item.closingQty / pPerBox);
                  const closeLoose = item.closingQty % pPerBox;

                  const inBoxes = Math.floor(item.inwardQty / pPerBox);
                  const inLoose = item.inwardQty % pPerBox;

                  const outBoxes = Math.floor(item.outwardQty / pPerBox);
                  const outLoose = item.outwardQty % pPerBox;

                  return (
                    <React.Fragment key={item.product?._id}>
                      {/* Single Summary Row for Product */}
                      <tr 
                        onClick={() => setExpandedProductId(isExpanded ? null : item.product?._id)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-pink-50/80 border-l-4 border-l-[var(--color-primary)]' : 'hover:bg-white/60'
                        }`}
                      >
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <div className="flex items-center gap-2.5">
                            {isExpanded ? <ChevronDown size={18} className="text-[var(--color-primary)] shrink-0" /> : <ChevronRight size={18} className="text-gray-400 shrink-0" />}
                            <div>
                              <span className="text-sm">{item.product?.name}</span>
                              <span className="block font-mono text-[10px] text-gray-400 font-normal">Code: {item.product?.itemCode}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right font-mono font-bold text-gray-700">
                          <div>{openBoxes} Boxes {openLoose > 0 ? `+ ${openLoose} Pcs` : ''}</div>
                          <div className="text-[10px] text-gray-400 font-normal">({item.openingQty} Pcs)</div>
                        </td>

                        <td className="px-6 py-4 text-right font-mono font-extrabold text-emerald-600">
                          <div>+ {inBoxes} Boxes {inLoose > 0 ? `+ ${inLoose} Pcs` : ''}</div>
                          <div className="text-[10px] text-emerald-600/80 font-normal">(+ {item.inwardQty} Pcs)</div>
                        </td>

                        <td className="px-6 py-4 text-right font-mono font-extrabold text-rose-600">
                          <div>- {outBoxes} Boxes {outLoose > 0 ? `+ ${outLoose} Pcs` : ''}</div>
                          <div className="text-[10px] text-rose-600/80 font-normal">(- {item.outwardQty} Pcs)</div>
                        </td>

                        <td className="px-6 py-4 text-right font-mono font-extrabold text-indigo-700 text-base">
                          <div>{closeBoxes} Boxes {closeLoose > 0 ? `+ ${closeLoose} Pcs` : ''}</div>
                          <div className="text-[10px] text-indigo-500 font-normal">({item.closingQty} Pcs)</div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const coldRoomBatch = inventory.find(i => i.product?._id === item.product?._id && i.inventoryType === 'Cold Room' && i.quantity > 0) || { product: item.product, batchNumber: 'COLD-ROOM', quantity: item.closingQty };
                                setSelectedBatchForDamage(coldRoomBatch);
                                setDamageForm({ damagedQuantity: 1, reason: '' });
                                setIsDamageModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm inline-flex items-center gap-1"
                              title="Log Damaged Stock"
                            >
                              <ShieldAlert size={13} /> Damage
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedProductId(isExpanded ? null : item.product?._id);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border inline-flex items-center gap-1.5 ${
                                isExpanded
                                  ? 'bg-[var(--color-primary)] text-white border-transparent shadow-sm'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-pink-50 hover:text-[var(--color-primary)]'
                              }`}
                            >
                              {isExpanded ? 'Hide' : `History (${item.periodTxs.length})`}
                            </button>
                          </div>
                        </td>
                      </tr>

                          {/* Expanded Detailed Transactions Sub-table */}
                          {isExpanded && (
                            <tr>
                              <td colSpan="6" className="p-0 bg-pink-50/40">
                                <div className="p-4 sm:p-6 border-b-2 border-pink-200 shadow-inner">
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                      <History size={16} className="text-[var(--color-primary)]" />
                                      Inward & Outward Transactions History — <span className="text-[var(--color-primary)]">{item.product?.name}</span>
                                    </h4>
                                    <span className="text-xs font-bold text-gray-500">
                                      Showing {item.periodTxs.length} movement transactions for selected period
                                    </span>
                                  </div>

                                  <div className="bg-white rounded-xl border border-pink-200 overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-xs text-gray-700">
                                      <thead className="bg-gray-100/80 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                                        <tr>
                                          <th className="px-4 py-3">Date & Time</th>
                                          <th className="px-4 py-3 text-center">Transaction Type</th>
                                          <th className="px-4 py-3 text-center">Batch Code</th>
                                          <th className="px-4 py-3 text-right text-emerald-700">Inward (+ Pcs)</th>
                                          <th className="px-4 py-3 text-right text-rose-700">Outward (- Pcs)</th>
                                          <th className="px-4 py-3">Reference / Customer Remarks</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 font-medium">
                                        {item.periodTxs.map((tx) => (
                                          <tr key={tx._id} className="hover:bg-pink-50/30 transition-colors">
                                            <td className="px-4 py-2.5 whitespace-nowrap text-gray-600 font-mono">
                                              {new Date(tx.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                              {tx.transactionType === 'IN' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                  🟢 PRODUCTION INWARD
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                                  🔴 SALES / DAMAGE OUTWARD
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2.5 text-center font-mono font-bold text-gray-800">
                                              <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-300">
                                                {tx.batchNumber}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono font-extrabold text-emerald-600">
                                              {tx.transactionType === 'IN' ? `+ ${tx.quantity} Pcs` : '-'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono font-extrabold text-rose-600">
                                              {tx.transactionType === 'OUT' ? `- ${tx.quantity} Pcs` : '-'}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-700">
                                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                {/* Inward Proof: Production */}
                                                {tx.transactionType === 'IN' && (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    Production: {tx.proof?.productionNumber || `PROD-${(tx.batchNumber || '001').replace('B-', '')}/26-27`}
                                                  </span>
                                                )}

                                                {/* Outward Proof: Sales */}
                                                {tx.transactionType === 'OUT' && (tx.referenceType === 'SALES' || (tx.remarks && (tx.remarks.toLowerCase().includes('so-') || tx.remarks.toLowerCase().includes('sales')))) && (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                                    Sales Order: {tx.proof?.soNumber || `SO-001/26-27`}
                                                  </span>
                                                )}

                                                {/* Outward Proof: Damage / Vendor Return */}
                                                {tx.transactionType === 'OUT' && (tx.referenceType === 'QC' || (tx.remarks && (tx.remarks.toLowerCase().includes('damaged') || tx.remarks.toLowerCase().includes('return')))) && (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                                    Return / Damage: {tx.proof?.qcNumber ? `RET-${tx.proof.qcNumber}` : 'RET-QC-001/26-27'}
                                                  </span>
                                                )}
                                              </div>
                                              <span className="text-gray-600 font-medium block leading-tight">{tx.remarks}</span>
                                            </td>
                                          </tr>
                                        ))}

                                        {item.periodTxs.length === 0 && (
                                          <tr>
                                            <td colSpan="6" className="px-4 py-6 text-center text-gray-500 italic">
                                              No inward/outward transactions logged for this item during the selected date period.
                                            </td>
                                          </tr>
                                        )}
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

                    {productLedgerSummary.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                          No finished goods records found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
      </div>

      {/* --- POPUP MODAL: DISPATCH CUSTOMER SALE --- */}
      {isSaleModalOpen && selectedBatchForSale && (
        <Modal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} title="Dispatch Customer Sale (Outward)">
          <form onSubmit={handleSaleSubmit} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <p><strong>Item:</strong> {selectedBatchForSale.product?.name} ({selectedBatchForSale.product?.itemCode})</p>
              <p><strong>Batch:</strong> {selectedBatchForSale.batchNumber} | Available: <strong>{selectedBatchForSale.quantity} Pcs</strong></p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Select Customer *</label>
              <SearchableSelect
                placeholder="Search & select customer or walk-in..."
                value={saleForm.customerId}
                options={[
                  { value: '', label: 'Walk-in Customer / Retailer', code: 'CUST-WALKIN' },
                  ...customers.map(c => ({
                    value: c._id,
                    label: c.name,
                    code: c.customerCode || 'CUST',
                    sublabel: `Phone: ${c.phone || 'N/A'}`
                  }))
                ]}
                onChange={(val) => setSaleForm({ ...saleForm, customerId: val })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Invoice / Order Ref No *</label>
                <input
                  type="text"
                  required
                  value={saleForm.invoiceNumber}
                  onChange={(e) => setSaleForm({ ...saleForm, invoiceNumber: e.target.value })}
                  placeholder="e.g. INV-2026-901"
                  className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Boxes to Dispatch *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={saleForm.boxesToSell}
                  onChange={(e) => setSaleForm({ ...saleForm, boxesToSell: e.target.value })}
                  className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex justify-between">
              <span>Total Pieces Dispatched:</span>
              <span className="font-mono font-bold text-emerald-700">
                {saleForm.boxesToSell} Boxes × {selectedBatchForSale.product?.piecesPerBox || 12} Pcs = {(parseInt(saleForm.boxesToSell) || 0) * (selectedBatchForSale.product?.piecesPerBox || 12)} Pcs
              </span>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-glass-border)]">
              <button
                type="button"
                onClick={() => setIsSaleModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md text-sm font-bold transition-all shadow-md disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm Sales Dispatch'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- POPUP MODAL: LOG DAMAGED / MELTED STOCK --- */}
      {isDamageModalOpen && selectedBatchForDamage && (
        <Modal isOpen={isDamageModalOpen} onClose={() => setIsDamageModalOpen(false)} title="Log Damaged / Melted Stock">
          <form onSubmit={handleDamageSubmit} className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <p><strong>Item:</strong> {selectedBatchForDamage.product?.name}</p>
              <p><strong>Batch:</strong> {selectedBatchForDamage.batchNumber} | Current Stock: <strong>{selectedBatchForDamage.quantity} Pcs</strong></p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Damaged Quantity (Pieces) *</label>
              <input
                type="number"
                min="1"
                max={selectedBatchForDamage.quantity}
                required
                value={damageForm.damagedQuantity}
                onChange={(e) => setDamageForm({ ...damageForm, damagedQuantity: e.target.value })}
                className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Reason for Damage / Melted *</label>
              <input
                type="text"
                required
                value={damageForm.reason}
                onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })}
                placeholder="e.g. Power failure in cold room / Packaging broken"
                className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-glass-border)]">
              <button
                type="button"
                onClick={() => setIsDamageModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-md text-sm font-bold transition-all shadow-md disabled:opacity-50"
              >
                {submitting ? 'Transferring...' : 'Transfer to Rejected Stock'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default FinishedGoodsStock;
