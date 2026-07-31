import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Truck, Calendar, Plus, Printer, CheckCircle2, Loader2, DollarSign, 
  Wrench, Fuel, Calculator, History, Search, ArrowRight, UserCheck, X
} from 'lucide-react';
import Modal from '../../components/Modal';

const AutoSalesLedger = () => {
  const [entries, setEntries] = useState([]);
  const [customers, setCustomers] = useState([]); // Auto Sales Customers / Vehicles
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'Daily Sheet' | 'Ledger History'
  const [activeTab, setActiveTab] = useState('Daily Sheet');

  // Daily Entry Form Header
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('DB 01 - DB 01');
  const [inchargeId, setInchargeId] = useState('');

  // Daily Items Array
  const [itemsForm, setItemsForm] = useState([]);

  // Daily Expenses Form
  const [expenses, setExpenses] = useState({
    dieselCost: 0,
    maintenanceCost: 0,
    otherCost: 0
  });

  // Daily Collection Breakdown Form (Cash, Paytm, GPay)
  const [collectionBreakdown, setCollectionBreakdown] = useState({
    cashAmount: 0,
    paytmAmount: 0,
    gpayAmount: 0
  });

  const [submitting, setSubmitting] = useState(false);
  const [selectedEntryForPrint, setSelectedEntryForPrint] = useState(null);

  // History Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [entriesRes, custRes, usersRes, prodRes] = await Promise.all([
        api.get('/auto-sales'),
        api.get('/customers'),
        api.get('/users'),
        api.get('/products')
      ]);

      setEntries(entriesRes.data.data || []);
      const autoCusts = (custRes.data.data || []).filter(c => (c.customerType || '').toLowerCase().includes('auto') || (c.customerType || '').toLowerCase().includes('vechicle'));
      setCustomers(autoCusts.length > 0 ? autoCusts : custRes.data.data || []);
      setUsers(usersRes.data.data || []);
      
      const fgProds = (prodRes.data.data || []).filter(p => p.itemType === 'Finished Goods');
      setProducts(fgProds.length > 0 ? fgProds : prodRes.data.data || []);

      // Initialize default items form with products
      initItemsForm(fgProds.length > 0 ? fgProds : prodRes.data.data || []);
    } catch (error) {
      console.error('Failed to load auto sales data', error);
    } finally {
      setLoading(false);
    }
  };

  const initItemsForm = (prodList, previousOpening = {}) => {
    const list = prodList.map(p => ({
      product: p._id,
      productName: p.name,
      openingQty: previousOpening[p._id] || 0,
      takenQty: 0,
      totalQty: previousOpening[p._id] || 0,
      returnQty: 0,
      salesQty: 0,
      unitPrice: p.wholesalePrice || p.mrp || 20,
      totalSalesValue: 0
    }));
    setItemsForm(list);
  };

  // Handle Customer / Vehicle Selection -> Auto Select Incharge Driver & Fetch Yesterday's Opening & Today's Taken Stock!
  const handleVehicleCustomerChange = async (customerId, dateStr = transferDate) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find(c => c._id === customerId);

    if (cust) {
      setVehicleNo(cust.customerCode || cust.name);
      if (cust.salesOwner) {
        const ownerId = typeof cust.salesOwner === 'object' ? cust.salesOwner._id : cust.salesOwner;
        setInchargeId(ownerId);
      }
    }

    if (!customerId) return;

    // Fetch previous day opening stock & today's sales invoice taken & return stock!
    try {
      const res = await api.get(`/auto-sales/previous-opening?customerId=${customerId}&date=${dateStr}`);
      const { openingMap = {}, takenMap = {}, returnMap = {} } = res.data.data || {};
      
      // Update OPENING, TAKEN, and RETURN stock in items form automatically!
      setItemsForm(prev => prev.map(item => {
        const prevOp = openingMap[item.product] || 0;
        const todayTaken = takenMap[item.product] || 0;
        const todayReturn = returnMap[item.product] || item.returnQty || 0;
        const tot = prevOp + todayTaken;
        const sQty = Math.max(0, tot - todayReturn);
        return {
          ...item,
          openingQty: prevOp,
          takenQty: todayTaken,
          totalQty: tot,
          returnQty: todayReturn,
          salesQty: sQty,
          totalSalesValue: sQty * item.unitPrice
        };
      }));
    } catch (e) {
      console.error('Failed to load auto stock data', e);
    }
  };

  // Handle Line Item Quantity / Return Changes
  const handleItemFieldChange = (index, field, value) => {
    const updated = [...itemsForm];
    const val = parseFloat(value) || 0;
    updated[index][field] = val;

    const op = updated[index].openingQty;
    const tk = updated[index].takenQty;
    const tot = op + tk;
    updated[index].totalQty = tot;

    const ret = updated[index].returnQty;
    const sQty = Math.max(0, tot - ret);
    updated[index].salesQty = sQty;
    updated[index].totalSalesValue = sQty * (updated[index].unitPrice || 0);

    setItemsForm(updated);
  };

  // Computations
  const grossSalesTotal = itemsForm.reduce((sum, item) => sum + (item.totalSalesValue || 0), 0);
  const totalExpenses = (parseFloat(expenses.dieselCost) || 0) + (parseFloat(expenses.maintenanceCost) || 0) + (parseFloat(expenses.otherCost) || 0);
  const netCollectionTotal = grossSalesTotal - totalExpenses;

  const totalCollectedPayment = (parseFloat(collectionBreakdown.cashAmount) || 0) + (parseFloat(collectionBreakdown.paytmAmount) || 0) + (parseFloat(collectionBreakdown.gpayAmount) || 0);
  const pendingCollectionDifference = netCollectionTotal - totalCollectedPayment;

  // Submit Daily Auto Sales Entry
  const handleSubmitEntry = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) return alert('Please select an Auto Sales Vehicle / Customer.');
    
    // Check if at least 1 item has loading or sales
    const activeItems = itemsForm.filter(i => i.takenQty > 0 || i.openingQty > 0 || i.returnQty > 0);
    if (activeItems.length === 0) {
      return alert('Please enter Taken (Stock Loaded from Cold Room) or Return stock quantity.');
    }

    try {
      setSubmitting(true);
      const res = await api.post('/auto-sales', {
        entryDate: transferDate,
        vehicleNo,
        customer: selectedCustomerId,
        incharge: inchargeId,
        items: itemsForm.filter(i => i.totalQty > 0 || i.takenQty > 0),
        expenses,
        collectionBreakdown
      });

      alert(`Auto Sales Stock Entry ${res.data.data.transferNo} Saved Successfully! Customer Ledger Receipts Auto-Generated.`);
      setSelectedEntryForPrint(res.data.data);
      fetchInitialData();
      setActiveTab('Ledger History');

      // Reset collection breakdown
      setCollectionBreakdown({ cashAmount: 0, paytmAmount: 0, gpayAmount: 0 });
    } catch (error) {
      console.error('Failed to save auto sales entry', error);
      alert(error.response?.data?.message || 'Error saving auto sales entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Entries for History
  const filteredEntries = entries.filter(e => {
    if (filterVehicle && e.vehicleNo !== filterVehicle && e.customer?.name !== filterVehicle) return false;
    if (filterDate) {
      const eDate = new Date(e.entryDate).toISOString().split('T')[0];
      if (eDate !== filterDate) return false;
    }
    return true;
  });

  // Show All Products Toggle
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Filter items to display ONLY products with active stock (Opening > 0, Taken > 0, Return > 0)
  const displayedItemsForm = itemsForm.filter(item => {
    if (showAllProducts || !selectedCustomerId) return true;
    return (item.openingQty > 0 || item.takenQty > 0 || item.returnQty > 0);
  });

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Truck className="text-[var(--color-primary)]" size={26} />
            Auto Sales — Daily Stock Entry & Expense Sheet
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Opening Stock, Taken Stock, Unsold Evening Returns, Daily Diesel & Service Expense Ledger
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('Daily Sheet')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
              activeTab === 'Daily Sheet'
                ? 'bg-[var(--color-primary)] text-white border-transparent shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            + Daily Stock & Expense Entry
          </button>

          <button
            onClick={() => setActiveTab('Ledger History')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
              activeTab === 'Ledger History'
                ? 'bg-[var(--color-primary)] text-white border-transparent shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Date-Wise Auto Sales Ledger ({entries.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: DAILY STOCK ENTRY FORM (MATCHING USER SCREENSHOT TEMPLATE) */}
      {activeTab === 'Daily Sheet' && (
        <div className="bg-white rounded-2xl border border-gray-300 shadow-xl p-6 max-w-5xl mx-auto space-y-6">
          
          {/* Company & Header Section (Identical to Screenshot) */}
          <div className="border-b-2 border-gray-800 pb-4 text-center">
            <h2 className="text-xl font-black text-gray-900 font-display tracking-wide">SRI SARAVANASS ICE CREAMS</h2>
            <p className="text-xs text-gray-600">Main Factory & Cold Storage Warehouse Depot</p>
            <h3 className="text-base font-extrabold text-[var(--color-primary)] mt-1 uppercase tracking-wider font-mono">
              AUTO SALES — STOCK ENTRY & EXPENSE VOUCHER
            </h3>
          </div>

          <form onSubmit={handleSubmitEntry} className="space-y-6">
            
            {/* Header Fields (Transfer No, Date, Vehicle No, Incharge Name) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-300 text-xs font-semibold text-gray-800">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 font-bold uppercase block">Transfer Date *</label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => {
                    setTransferDate(e.target.value);
                    if (selectedCustomerId) handleVehicleCustomerChange(selectedCustomerId, e.target.value);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 font-bold uppercase block">Select Auto Sales Van *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => handleVehicleCustomerChange(e.target.value)}
                  className="w-full bg-white border border-pink-300 rounded-lg px-2.5 py-1.5 font-extrabold text-gray-900"
                >
                  <option value="">-- Choose Auto Van --</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.customerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 font-bold uppercase block">Vehicle No / Reg Code</label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-gray-900"
                  placeholder="DB 01 - DB 01"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 font-bold uppercase block">Incharge / Sales Driver</label>
                <select
                  value={inchargeId}
                  onChange={(e) => setInchargeId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-gray-900"
                >
                  <option value="">-- Select Driver --</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.designation || u.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* TABULAR STOCK ENTRY (OPENING, TAKEN, TOTAL, RETURN, SALES) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-gray-700">
                  Showing <strong className="text-[var(--color-primary)]">{displayedItemsForm.length}</strong> Active Van Products
                  {selectedCustomerId && !showAllProducts && <span className="text-gray-400 font-normal ml-1">(Filtered to active stock)</span>}
                </span>

                <button
                  type="button"
                  onClick={() => setShowAllProducts(!showAllProducts)}
                  className="text-xs font-extrabold text-[var(--color-primary)] hover:underline flex items-center gap-1 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-3 py-1 rounded-lg transition-all"
                >
                  {showAllProducts ? 'Filter Active Products Only' : '+ Show All Master Products'}
                </button>
              </div>

              <div className="overflow-x-auto border-2 border-gray-300 rounded-xl shadow-md">
                <table className="w-full text-left text-xs font-medium">
                  <thead className="text-white font-extrabold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3 text-center w-12 border-r border-white/20 bg-[var(--color-primary)]">S.No</th>
                      <th className="p-3 border-r border-white/20 bg-[var(--color-primary)]">Product Name</th>
                      <th className="p-3 text-center border-r border-white/20 bg-amber-600">Opening (Pcs)</th>
                      <th className="p-3 text-center border-r border-white/20 bg-blue-600">Taken (Pcs)</th>
                      <th className="p-3 text-center border-r border-white/20 bg-indigo-700">Total (Pcs)</th>
                      <th className="p-3 text-center border-r border-white/20 bg-rose-600">Return Unsold (Pcs)</th>
                      <th className="p-3 text-center border-r border-white/20 bg-emerald-700">Net Sales Qty</th>
                      <th className="p-3 text-right border-r border-white/20 bg-[var(--color-primary)]">Rate (₹)</th>
                      <th className="p-3 text-right bg-[var(--color-primary)]">Sales Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {displayedItemsForm.map((item, idx) => {
                      const realIndex = itemsForm.findIndex(i => i.product === item.product);

                      return (
                        <tr key={item.product} className="hover:bg-pink-50/20 transition-colors">
                          <td className="p-2.5 text-center font-bold text-gray-600 border-r border-gray-200">{idx + 1}</td>

                          <td className="p-2.5 font-extrabold text-gray-900 border-r border-gray-200">{item.productName}</td>

                          {/* Opening Stock (Yesterday's Unsold) */}
                          <td className="p-2.5 text-center border-r border-gray-200 bg-amber-50/50">
                            <input
                              type="number"
                              min="0"
                              value={item.openingQty}
                              onChange={(e) => handleItemFieldChange(realIndex, 'openingQty', e.target.value)}
                              className="w-16 bg-white border border-amber-300 rounded px-1.5 py-1 text-center font-mono font-bold text-amber-900"
                            />
                          </td>

                          {/* Taken Stock (Today's Loading from Cold Room) */}
                          <td className="p-2.5 text-center border-r border-gray-200 bg-blue-50/50">
                            <input
                              type="number"
                              min="0"
                              value={item.takenQty}
                              onChange={(e) => handleItemFieldChange(realIndex, 'takenQty', e.target.value)}
                              className="w-16 bg-white border border-blue-400 rounded px-1.5 py-1 text-center font-mono font-extrabold text-blue-900"
                            />
                          </td>

                          {/* Total Stock (Opening + Taken) */}
                          <td className="p-2.5 text-center font-mono font-black text-indigo-900 border-r border-gray-200 bg-indigo-50/50 text-sm">
                            {item.totalQty}
                          </td>

                          {/* Return Stock (Evening Unsold Return) */}
                          <td className="p-2.5 text-center border-r border-gray-200 bg-rose-50/50">
                            <input
                              type="number"
                              min="0"
                              max={item.totalQty}
                              value={item.returnQty}
                              onChange={(e) => handleItemFieldChange(realIndex, 'returnQty', e.target.value)}
                              className="w-16 bg-white border border-rose-400 rounded px-1.5 py-1 text-center font-mono font-bold text-rose-900"
                            />
                          </td>

                          {/* Net Sales Qty (Total - Return) */}
                          <td className="p-2.5 text-center font-mono font-black text-emerald-800 border-r border-gray-200 bg-emerald-50/50 text-sm">
                            {item.salesQty}
                          </td>

                          {/* Selling Rate */}
                          <td className="p-2.5 text-right font-mono border-r border-gray-200">
                            ₹{item.unitPrice}
                          </td>

                          {/* Total Sales Value */}
                          <td className="p-2.5 text-right font-mono font-black text-emerald-700 text-sm">
                            ₹{item.totalSalesValue?.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}

                    {displayedItemsForm.length === 0 && (
                      <tr>
                        <td colSpan="9" className="px-6 py-10 text-center text-gray-500 font-medium">
                          No active stock items for this Auto Van today. Click "+ Show All Master Products" to add products manually.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DAILY AUTO EXPENSES & CASH COLLECTION CALCULATOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-300">
              
              {/* Daily Auto Expenses Inputs */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Fuel size={16} className="text-[var(--color-primary)]" /> Daily Auto Expenses (Diesel & Repairs)
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold block">Diesel / Fuel (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={expenses.dieselCost}
                      onChange={(e) => setExpenses({ ...expenses, dieselCost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-gray-900 text-xs"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold block">Service / Repair (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={expenses.maintenanceCost}
                      onChange={(e) => setExpenses({ ...expenses, maintenanceCost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-gray-900 text-xs"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold block">Other Misc (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={expenses.otherCost}
                      onChange={(e) => setExpenses({ ...expenses, otherCost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-gray-900 text-xs"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Net Daily Cash Collection Summary */}
              <div className="bg-white p-4 rounded-xl border border-gray-300 flex flex-col justify-between text-right">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Gross Sales Value:</span>
                    <strong className="font-mono font-bold text-gray-900">₹{grossSalesTotal.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Less Daily Auto Expenses:</span>
                    <strong className="font-mono font-bold">- ₹{totalExpenses.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 mt-2 flex justify-between items-center">
                  <span className="text-xs font-black text-gray-800 uppercase">Net Cash Collection:</span>
                  <span className="text-xl font-black font-mono text-emerald-700">₹{netCollectionTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* DAILY COLLECTION PAYMENT BREAKDOWN (RECEIVED BY SALES DRIVER) */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border-2 border-emerald-300 space-y-3">
              <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  💵 Daily Collection Breakdown & Payment Modes (Received by Driver)
                </h4>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Auto Receipts Posted to Customer Ledger
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 block">💵 Cash Received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={collectionBreakdown.cashAmount}
                    onChange={(e) => setCollectionBreakdown({ ...collectionBreakdown, cashAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-emerald-400 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-emerald-950 shadow-sm"
                    placeholder="e.g. 5000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 block">📱 Paytm / QR Received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={collectionBreakdown.paytmAmount}
                    onChange={(e) => setCollectionBreakdown({ ...collectionBreakdown, paytmAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-emerald-400 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-blue-950 shadow-sm"
                    placeholder="e.g. 3000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 block">📲 GPay / Driver UPI (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={collectionBreakdown.gpayAmount}
                    onChange={(e) => setCollectionBreakdown({ ...collectionBreakdown, gpayAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-emerald-400 rounded-xl px-3 py-2 text-xs font-mono font-extrabold text-indigo-950 shadow-sm"
                    placeholder="e.g. 2000"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200 flex flex-wrap justify-between items-center text-xs">
                <div className="flex items-center gap-4">
                  <span>Target Net Collection: <strong className="font-mono font-extrabold text-gray-900">₹{netCollectionTotal.toFixed(2)}</strong></span>
                  <span>Total Collected: <strong className="font-mono font-extrabold text-emerald-800">₹{totalCollectedPayment.toFixed(2)}</strong></span>
                </div>

                <div>
                  {pendingCollectionDifference === 0 ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-extrabold border border-emerald-300">
                      ✓ Collection Matches Exactly
                    </span>
                  ) : pendingCollectionDifference > 0 ? (
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full font-extrabold border border-amber-300">
                      ⚠️ Pending Shortage: ₹{pendingCollectionDifference.toFixed(2)}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full font-extrabold border border-blue-300">
                      + Surplus Collected: ₹{Math.abs(pendingCollectionDifference).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-3 flex justify-end gap-3 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[var(--color-primary)] hover:bg-pink-700 text-white px-8 py-3 rounded-xl text-xs font-extrabold shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Save Daily Auto Stock Entry & Calculate Net Revenue
              </button>
            </div>

          </form>
        </div>
      )}

      {/* VIEW 2: DATE-WISE AUTO SALES LEDGER HISTORY */}
      {activeTab === 'Ledger History' && (
        <div className="space-y-4">
          
          {/* History Filter Toolbar */}
          <div className="bg-white/40 p-4 rounded-2xl border border-[var(--color-glass-border)] flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Calendar size={16} className="text-[var(--color-primary)]" /> Filter Auto Ledger:
            </span>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-white border border-pink-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800"
            />

            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="bg-white border border-pink-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800"
            >
              <option value="">-- All Auto Vehicles --</option>
              {customers.map(c => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>

            {(filterDate || filterVehicle) && (
              <button
                onClick={() => { setFilterDate(''); setFilterVehicle(''); }}
                className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold flex items-center gap-1"
              >
                <X size={12} /> Clear Filter
              </button>
            )}
          </div>

          {/* Ledger Table */}
          <div className="glass-panel overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-600 flex justify-center items-center gap-2">
                <Loader2 className="animate-spin text-[var(--color-primary)] text-xs" size={24} />
                Loading Auto Sales Ledger History...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Transfer No & Date</th>
                      <th className="px-6 py-4">Vehicle & Driver</th>
                      <th className="px-6 py-4 text-center">Opening / Taken / Return</th>
                      <th className="px-6 py-4 text-right text-gray-900">Gross Sales</th>
                      <th className="px-6 py-4 text-right text-rose-600">Diesel / Expenses</th>
                      <th className="px-6 py-4 text-right text-emerald-700">Net Collection</th>
                      <th className="px-6 py-4 text-center">Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)] font-medium">
                    {filteredEntries.map((entry) => {
                      const totalTaken = entry.items.reduce((sum, i) => sum + i.takenQty, 0);
                      const totalOpening = entry.items.reduce((sum, i) => sum + i.openingQty, 0);
                      const totalReturn = entry.items.reduce((sum, i) => sum + i.returnQty, 0);

                      return (
                        <tr key={entry._id} className="hover:bg-white/40 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-gray-900">{entry.transferNo}</span>
                            <span className="block text-[11px] text-gray-400 font-normal">
                              {new Date(entry.entryDate).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-bold text-gray-900">
                            {entry.vehicleNo}
                            <span className="block text-[11px] text-gray-400 font-normal">
                              Incharge: {entry.incharge?.name || 'Auto Driver'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center text-xs font-mono">
                            <span className="text-amber-700 font-bold">{totalOpening} Op</span> + <span className="text-blue-700 font-bold">{totalTaken} Tk</span> - <span className="text-rose-700 font-bold">{totalReturn} Ret</span>
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                            ₹{entry.grossSalesAmount?.toFixed(2)}
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                            - ₹{(entry.expenses?.totalExpenses || 0).toFixed(2)}
                            <span className="block text-[10px] text-gray-400 font-normal">
                              (Diesel: ₹{entry.expenses?.dieselCost || 0})
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-black text-emerald-700 text-base">
                            ₹{entry.netCollection?.toFixed(2)}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setSelectedEntryForPrint(entry)}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all flex items-center gap-1 inline-flex"
                            >
                              <Printer size={12} /> Print Sheet
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredEntries.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          No auto sales entries found for selected date/vehicle.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PRINTABLE AUTO SALES STOCK ENTRY VOUCHER (EXACT REPLICA OF USER SCREENSHOT) --- */}
      {selectedEntryForPrint && (
        <Modal isOpen={!!selectedEntryForPrint} onClose={() => setSelectedEntryForPrint(null)} title="Print Auto Sales Stock Entry Voucher">
          <div className="p-6 bg-white border border-gray-300 rounded-2xl text-gray-900 space-y-4 font-sans max-w-3xl mx-auto" id="printable-auto-sheet">
            
            {/* Header matching screenshot */}
            <div className="border-b-2 border-gray-900 pb-3 text-center">
              <h2 className="text-xl font-black font-display tracking-wide">SRI SARAVANASS ICE CREAMS</h2>
              <p className="text-xs text-gray-600 font-medium">144, MAIN FACTORY & DEPOT ROAD, TAMIL NADU</p>
              <h3 className="text-sm font-black text-gray-900 mt-1 uppercase font-mono tracking-wider">
                AUTO SALES — STOCK ENTRY
              </h3>
            </div>

            {/* Sub Header info */}
            <div className="grid grid-cols-2 text-xs border border-gray-800 p-2.5 font-bold space-y-1">
              <div>
                <p>TRANSFER NO : <span className="font-mono text-pink-700">{selectedEntryForPrint.transferNo}</span></p>
                <p>VEHICLE NO : <span className="font-mono text-gray-900">{selectedEntryForPrint.vehicleNo}</span></p>
              </div>
              <div>
                <p>TRANSFER DATE : <span className="font-mono">{new Date(selectedEntryForPrint.entryDate).toLocaleDateString()}</span></p>
                <p>INCHARGE NAME : <span>{selectedEntryForPrint.incharge?.name || 'Admin'}</span></p>
              </div>
            </div>

            {/* Items Table matching screenshot */}
            <div className="border border-gray-800 overflow-hidden">
              <table className="w-full text-left text-xs font-medium">
                <thead className="bg-gray-200 border-b border-gray-800 font-black uppercase text-gray-900">
                  <tr>
                    <th className="p-2 text-center border-r border-gray-400">S.No</th>
                    <th className="p-2 border-r border-gray-400">PRODUCT NAME</th>
                    <th className="p-2 text-right border-r border-gray-400">OPENING</th>
                    <th className="p-2 text-right border-r border-gray-400">TAKEN</th>
                    <th className="p-2 text-right border-r border-gray-400">TOTAL</th>
                    <th className="p-2 text-right border-r border-gray-400">RETURN</th>
                    <th className="p-2 text-right text-emerald-800">SALES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {selectedEntryForPrint.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-center font-mono border-r border-gray-300">{idx + 1}</td>
                      <td className="p-2 font-bold border-r border-gray-300">{item.product?.name || item.productName}</td>
                      <td className="p-2 text-right font-mono border-r border-gray-300">{item.openingQty?.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono border-r border-gray-300">{item.takenQty?.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-bold border-r border-gray-300">{item.totalQty?.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono text-rose-700 border-r border-gray-300">{item.returnQty?.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-700">{item.salesQty?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expenses & Financial Summary */}
            <div className="border border-gray-800 p-3 bg-gray-50 text-xs font-bold space-y-1">
              <div className="flex justify-between">
                <span>Gross Sales Value:</span>
                <span className="font-mono">₹{selectedEntryForPrint.grossSalesAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Daily Auto Expenses (Diesel: ₹{selectedEntryForPrint.expenses?.dieselCost || 0}, Repairs: ₹{selectedEntryForPrint.expenses?.maintenanceCost || 0}):</span>
                <span className="font-mono">- ₹{(selectedEntryForPrint.expenses?.totalExpenses || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-400 text-sm font-black text-emerald-800">
                <span>NET CASH COLLECTION:</span>
                <span className="font-mono">₹{selectedEntryForPrint.netCollection?.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setSelectedEntryForPrint(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-[var(--color-primary)] hover:bg-pink-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Auto Voucher
              </button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
};

export default AutoSalesLedger;
