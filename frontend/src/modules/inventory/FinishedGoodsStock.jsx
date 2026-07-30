import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  ThermometerSnowflake, ShoppingBag, ShieldAlert, ArrowUpRight, ArrowDownLeft, 
  Search, Filter, Plus, Printer, Loader2, QrCode, Building2, Users, Calendar, Box, X, History 
} from 'lucide-react';
import Modal from '../../components/Modal';
import SearchableSelect from '../../components/SearchableSelect';

const FinishedGoodsStock = () => {
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [activeTab, setActiveTab] = useState('Stock Balance'); // 'Stock Balance' | 'Movement Ledger'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Cold Room');

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

  // Filtered Movement Ledger for Finished Goods
  const fgTransactions = transactions.filter(tx => tx.product?.itemType === 'Finished Goods');
  const filteredLedger = fgTransactions.filter(tx => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchName = (tx.product?.name || '').toLowerCase().includes(q);
    const matchCode = (tx.product?.itemCode || '').toLowerCase().includes(q);
    const matchBatch = (tx.batchNumber || '').toLowerCase().includes(q);
    const matchRef = (tx.remarks || '').toLowerCase().includes(q);
    return matchName || matchCode || matchBatch || matchRef;
  });

  // Top Summary Totals
  const coldRoomItems = inventory.filter(i => i.product?.itemType === 'Finished Goods' && i.inventoryType === 'Cold Room');
  const totalColdRoomPieces = coldRoomItems.reduce((sum, i) => sum + i.quantity, 0);
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

      {/* Views & Filters Toolbar */}
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
            Cold Room Stock Balances
          </button>
          <button
            onClick={() => setActiveTab('Movement Ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
              activeTab === 'Movement Ledger'
                ? 'bg-white text-[var(--color-primary)] border-pink-400 shadow-md ring-2 ring-pink-500/20'
                : 'bg-white/80 text-gray-700 border-transparent hover:bg-gray-100'
            }`}
          >
            Inward & Outward Finished Goods Ledger
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search product, batch, ref..."
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

      {/* Main Content Area */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-600 flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
            Loading Finished Goods Inventory...
          </div>
        ) : (
          <div>
            {/* VIEW 1: COLD ROOM STOCK BALANCES */}
            {activeTab === 'Stock Balance' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Finished Good Item</th>
                      <th className="px-6 py-4 text-center">Batch Code</th>
                      <th className="px-6 py-4 text-center">Cold Temp Log</th>
                      <th className="px-6 py-4 text-right">Available Stock</th>
                      <th className="px-6 py-4 text-right">Selling Price</th>
                      <th className="px-6 py-4 text-center">Expiry Date</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)]">
                    {filteredFgStock.map((item) => {
                      const pPerBox = item.product?.piecesPerBox || 12;
                      const boxCount = Math.floor(item.quantity / pPerBox);
                      const extraPcs = item.quantity % pPerBox;

                      return (
                        <tr key={item._id} className="hover:bg-white/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">
                            {item.product?.name}
                            <span className="block font-mono text-[10px] text-gray-400 font-normal">Code: {item.product?.itemCode}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs font-bold">
                              {item.batchNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-xs font-bold text-blue-600">
                            {item.temperature !== undefined ? `${item.temperature} °C` : '-18 °C'}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-extrabold text-emerald-700 text-base">
                            {boxCount} Boxes <span className="text-xs text-gray-500 font-normal">({item.quantity} Pcs)</span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                            ₹{(item.purchasePrice || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center text-xs font-bold text-rose-600">
                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedBatchForSale(item);
                                  setSaleForm({ customerId: '', invoiceNumber: '', boxesToSell: 1, sellingPrice: item.purchasePrice || '' });
                                  setIsSaleModalOpen(true);
                                }}
                                className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-1"
                              >
                                <ShoppingBag size={12} /> Dispatch Sale
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedBatchForDamage(item);
                                  setDamageForm({ damagedQuantity: 1, reason: '' });
                                  setIsDamageModalOpen(true);
                                }}
                                className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm flex items-center gap-1"
                              >
                                <ShieldAlert size={12} /> Log Damage
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredFgStock.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                          No finished goods items found in selected inventory location.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW 2: INWARD & OUTWARD FINISHED GOODS LEDGER */}
            {activeTab === 'Movement Ledger' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4 text-center">Type</th>
                      <th className="px-6 py-4">Finished Good Item</th>
                      <th className="px-6 py-4 text-center">Batch Code</th>
                      <th className="px-6 py-4 text-right text-emerald-700">Inward (+ Pcs)</th>
                      <th className="px-6 py-4 text-right text-rose-700">Outward (- Pcs)</th>
                      <th className="px-6 py-4">Reference & Customer Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)]">
                    {filteredLedger.map((tx) => (
                      <tr key={tx._id} className="hover:bg-white/40 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-gray-600 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {tx.transactionType === 'IN' ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🟢 PRODUCTION INWARD
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              🔴 SALES / DAMAGE OUTWARD
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {tx.product?.name}
                          <span className="block font-mono text-[10px] text-gray-400 font-normal">Code: {tx.product?.itemCode}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 font-semibold">
                            {tx.batchNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                          {tx.transactionType === 'IN' ? `+ ${tx.quantity} Pcs` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                          {tx.transactionType === 'OUT' ? `- ${tx.quantity} Pcs` : '-'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-700">
                          {tx.remarks}
                        </td>
                      </tr>
                    ))}
                    {filteredLedger.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                          No finished goods movement ledger transactions logged.
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
