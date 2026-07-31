import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Users, Search, Calendar, FileText, ArrowUpRight, ArrowDownLeft, 
  CreditCard, Plus, Printer, Loader2, CheckCircle2, UserCheck, Phone, MapPin, Tag, RefreshCw, Eye, ChevronRight
} from 'lucide-react';
import Modal from '../../components/Modal';

const CustomerLedgers = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Customer for Detailed Ledger Statement Modal
  const [activeLedgerCustomer, setActiveLedgerCustomer] = useState(null);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Customer Financial Summaries Map (for main table overview)
  const [customerBalances, setCustomerBalances] = useState({});
  const [allSalesOrders, setAllSalesOrders] = useState([]);

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptCustomer, setReceiptCustomer] = useState(null);
  const [receiptForm, setReceiptForm] = useState({
    receiptDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'Cash',
    referenceNo: '',
    remarks: 'Customer Payment Collection'
  });
  const [submittingReceipt, setSubmittingReceipt] = useState(false);

  const categories = [
    { id: 'All', label: 'All Customers', color: 'bg-gray-100 text-gray-800' },
    { id: 'Auto Sales', label: '🚚 Auto Sales', color: 'bg-amber-100 text-amber-800' },
    { id: 'Dealer', label: '🏪 Dealer', color: 'bg-blue-100 text-blue-800' },
    { id: 'Party Order', label: '🎉 Party Order', color: 'bg-purple-100 text-purple-800' },
    { id: 'Coimbatore', label: '🏢 Coimbatore', color: 'bg-pink-100 text-pink-800' },
    { id: 'Madurai', label: '🏢 Madurai', color: 'bg-emerald-100 text-emerald-800' },
    { id: 'Kerala', label: '🏢 Kerala', color: 'bg-indigo-100 text-indigo-800' },
    { id: 'Sample Products', label: '🎁 Sample Products', color: 'bg-teal-100 text-teal-800' },
    { id: 'Guest', label: '👤 Guest / Complimentary', color: 'bg-orange-100 text-orange-800' }
  ];

  useEffect(() => {
    fetchCustomersAndBalances();
  }, [startDate, endDate]);

  const fetchCustomersAndBalances = async () => {
    try {
      setLoadingCustomers(true);
      let url = '/customer-ledger/summaries/all';
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) url += `?${params.join('&')}`;

      const [cRes, bRes, soRes] = await Promise.all([
        api.get('/customers'),
        api.get(url),
        api.get('/sales-orders')
      ]);

      setCustomers(cRes.data.data || []);
      setCustomerBalances(bRes.data.data || {});
      setAllSalesOrders(soRes.data.data || []);
    } catch (e) {
      console.error('Failed to fetch customers', e);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleOpenLedgerModal = async (customer) => {
    setActiveLedgerCustomer(customer);
    try {
      setLoadingLedger(true);
      let url = `/customer-ledger/${customer._id}`;
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) url += `?${params.join('&')}`;

      const res = await api.get(url);
      setLedgerSummary(res.data.summary || null);
      setLedgerData(res.data.data || []);
    } catch (e) {
      console.error('Failed to load ledger modal data', e);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleOpenReceiptModal = (customer) => {
    setReceiptCustomer(customer);
    setReceiptForm({
      receiptDate: new Date().toISOString().split('T')[0],
      amount: '',
      paymentMode: 'Cash',
      referenceNo: '',
      remarks: 'Customer Payment Collection'
    });
    setIsReceiptModalOpen(true);
  };

  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    if (!receiptCustomer || !receiptForm.amount) return;

    try {
      setSubmittingReceipt(true);
      await api.post('/customer-ledger/receipt', {
        customerId: receiptCustomer._id,
        ...receiptForm
      });

      alert('Payment receipt recorded successfully!');
      setIsReceiptModalOpen(false);
      fetchCustomersAndBalances();

      if (activeLedgerCustomer && activeLedgerCustomer._id === receiptCustomer._id) {
        handleOpenLedgerModal(activeLedgerCustomer);
      }
    } catch (e) {
      console.error('Failed to record receipt', e);
      alert(e.response?.data?.message || 'Error recording payment receipt');
    } finally {
      setSubmittingReceipt(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'Party Order':
      case 'Party order':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Auto Sales':
      case 'Vechicle sales':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Dealer':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Coimbatore':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'Madurai':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Kerala':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Filter Customers by Category and Search Query
  const filteredCustomers = customers.filter(c => {
    const matchesCategory = selectedCategory === 'All' || c.customerType === selectedCategory;
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.customerCode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Total Portfolio KPI Summaries
  const totalDebitSum = Object.values(customerBalances).reduce((acc, curr) => acc + (curr.totalDebit || 0), 0);
  const totalCreditSum = Object.values(customerBalances).reduce((acc, curr) => acc + (curr.totalCredit || 0), 0);
  const totalClosingBalanceSum = Object.values(customerBalances).reduce((acc, curr) => acc + (curr.closingBalance || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* PAGE TITLE & TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Customer Ledgers & Financial Hub</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Category-wise master ledger summary table for Party Orders, Auto Vans, Dealers & Branch Depots
          </p>
        </div>

        {/* DATE RANGE FILTRATION */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm text-xs">
          <Calendar size={14} className="text-gray-400" />
          <span className="font-bold text-gray-700">Period:</span>
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
      </div>

      {/* PORTFOLIO SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 block">Total Sales Invoiced (Debit)</span>
          <span className="text-2xl font-mono font-black text-blue-950 mt-1 block">₹{totalDebitSum.toFixed(2)}</span>
        </div>

        <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">Total Payments Received (Credit)</span>
          <span className="text-2xl font-mono font-black text-emerald-950 mt-1 block">₹{totalCreditSum.toFixed(2)}</span>
        </div>

        <div className="p-4 bg-gradient-to-r from-pink-50 to-pink-100/50 border border-pink-200 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-pink-700 block">Net Outstanding Closing Balance</span>
          <span className="text-2xl font-mono font-black text-pink-950 mt-1 block">₹{totalClosingBalanceSum.toFixed(2)}</span>
        </div>
      </div>

      {/* CATEGORY TABS & SEARCH BAR */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  selectedCategory === cat.id 
                    ? 'bg-[var(--color-primary)] text-white shadow-md scale-105' 
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name / code..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* FULL-WIDTH MASTER CUSTOMER LEDGER TABLE */}
      <div className="glass-panel overflow-hidden">
        {loadingCustomers ? (
          <div className="p-12 text-center text-gray-500 font-medium flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-pink-600" size={18} /> Loading customer financial ledgers...
          </div>
        ) : (selectedCategory === 'Sample Products' || selectedCategory === 'Guest') ? (
          /* --- SPECIAL DISPATCH TABLE FOR SAMPLE PRODUCTS & GUEST --- */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-gray-700">
              <thead className="bg-gradient-to-r from-teal-700 to-emerald-800 text-white uppercase tracking-wider text-[11px] font-black">
                <tr>
                  <th className="px-4 py-3.5">Invoice #</th>
                  <th className="px-4 py-3.5">Customer / Guest Receiver</th>
                  <th className="px-4 py-3.5 text-center">Category</th>
                  <th className="px-4 py-3.5">Dispatched Products</th>
                  <th className="px-4 py-3.5 text-center">Total Quantity (Pcs)</th>
                  <th className="px-4 py-3.5 text-right">Invoice Total (₹)</th>
                  <th className="px-4 py-3.5 text-center">Dispatch Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allSalesOrders
                  .filter(so => so.invoiceType === selectedCategory)
                  .filter(so => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    const name = (so.customer?.name || so.guestName || '').toLowerCase();
                    const inv = (so.invoiceNumber || '').toLowerCase();
                    return name.includes(q) || inv.includes(q);
                  })
                  .map((so) => {
                    const totalPcs = (so.items || []).reduce((sum, item) => sum + (item.quantityPcs || 0), 0);

                    return (
                      <tr key={so._id} className="hover:bg-teal-50/30 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-gray-800">
                          <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
                            {so.invoiceNumber}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-extrabold text-gray-900 text-sm">
                          {so.customer?.name || so.guestName || 'Guest Receiver'}
                          {so.customer?.customerCode && (
                            <span className="block text-[11px] text-gray-400 font-mono font-normal">
                              Code: {so.customer.customerCode}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                            so.invoiceType === 'Sample Products' ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-orange-100 text-orange-800 border-orange-300'
                          }`}>
                            {so.invoiceType === 'Sample Products' ? '🎁 Sample Products' : '👤 Guest Complimentary'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-gray-800">
                          {(so.items || []).map((item, idx) => (
                            <div key={idx} className="font-semibold text-gray-900">
                              • {item.product?.name || 'Ice Cream Product'} ({item.quantityPcs} pcs)
                            </div>
                          ))}
                        </td>

                        <td className="px-4 py-3.5 text-center font-mono font-extrabold text-teal-900 text-sm">
                          {totalPcs} pcs
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono font-extrabold text-gray-900 text-sm">
                          ₹{so.grandTotal?.toFixed(2) || '0.00'}
                        </td>

                        <td className="px-4 py-3.5 text-center font-mono text-xs text-gray-600">
                          {new Date(so.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}

                {allSalesOrders.filter(so => so.invoiceType === selectedCategory).length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400 font-medium">
                      No outward dispatches logged under {selectedCategory} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-gray-700">
              <thead className="bg-gradient-to-r from-pink-700 to-[var(--color-primary)] text-white uppercase tracking-wider text-[11px] font-black">
                <tr>
                  <th className="px-4 py-3.5">Customer Code</th>
                  <th className="px-4 py-3.5">Customer / Outlet Name</th>
                  <th className="px-4 py-3.5 text-center">Category Type</th>
                  <th className="px-4 py-3.5">Sales Owner (Employee)</th>
                  <th className="px-4 py-3.5 text-right bg-amber-700/80">Opening (₹)</th>
                  <th className="px-4 py-3.5 text-right bg-blue-800/80">Sales (Debit ₹)</th>
                  <th className="px-4 py-3.5 text-right bg-emerald-800/80">Receipt / Credit (₹)</th>
                  <th className="px-4 py-3.5 text-right bg-rose-900/90">Closing Bal (₹)</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((cust) => {
                  const summary = customerBalances[cust._id] || { openingBalance: 0, totalDebit: 0, totalCredit: 0, closingBalance: 0 };

                  return (
                    <tr key={cust._id} className="hover:bg-pink-50/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-gray-800">
                        <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
                          {cust.customerCode}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-gray-900 text-sm">
                        {cust.name}
                        <span className="block text-[11px] text-gray-400 font-normal">GSTIN: {cust.gstinNumber || 'N/A'}</span>
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${getTypeBadge(cust.customerType)}`}>
                          {cust.customerType}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {cust.salesOwner ? (
                          <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                            <UserCheck size={14} className="text-[var(--color-primary)] shrink-0" />
                            <span>{cust.salesOwner.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-900 bg-amber-50/30">
                        ₹{summary.openingBalance?.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-extrabold text-blue-900 bg-blue-50/30">
                        ₹{summary.totalDebit?.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-extrabold text-emerald-800 bg-emerald-50/30">
                        ₹{summary.totalCredit?.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-black text-pink-900 text-sm bg-pink-50/40">
                        ₹{summary.closingBalance?.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenLedgerModal(cust)}
                            className="px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-[var(--color-primary)] text-xs font-bold transition-all border border-pink-200 flex items-center gap-1 shadow-sm"
                            title="View Detailed Statement of Accounts"
                          >
                            <Eye size={13} /> View Ledger
                          </button>

                          <button
                            onClick={() => handleOpenReceiptModal(cust)}
                            className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                            title="Log Customer Receipt Payment"
                          >
                            <Plus size={13} /> Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-400 font-medium">
                      No customer ledgers found matching your search or category filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL: DETAILED STATEMENT OF ACCOUNT FOR CUSTOMER --- */}
      {activeLedgerCustomer && (
        <Modal
          isOpen={!!activeLedgerCustomer}
          onClose={() => setActiveLedgerCustomer(null)}
          title={`Statement of Account — ${activeLedgerCustomer.name} (${activeLedgerCustomer.customerCode})`}
        >
          <div className="space-y-4">
            
            {/* Customer Details Banner */}
            <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl text-xs flex justify-between items-center">
              <div>
                <p><strong>Customer Category:</strong> {activeLedgerCustomer.customerType}</p>
                <p className="mt-0.5"><strong>Sales Owner:</strong> {activeLedgerCustomer.salesOwner?.name || 'Unassigned'}</p>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 bg-white border border-pink-300 hover:bg-pink-100 text-pink-900 px-3 py-1.5 rounded-lg font-bold text-xs"
              >
                <Printer size={13} /> Print Statement
              </button>
            </div>

            {/* Summary Row */}
            {ledgerSummary && (
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-[10px] text-amber-700 font-bold uppercase block">Opening</span>
                  <span className="font-mono font-extrabold text-amber-900">₹{ledgerSummary.openingBalance?.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">Total Sales</span>
                  <span className="font-mono font-extrabold text-blue-900">₹{ledgerSummary.totalDebit?.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Receipts</span>
                  <span className="font-mono font-extrabold text-emerald-900">₹{ledgerSummary.totalCredit?.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-pink-50 border border-pink-200 rounded-lg">
                  <span className="text-[10px] text-pink-700 font-bold uppercase block">Closing Bal</span>
                  <span className="font-mono font-black text-pink-900">₹{ledgerSummary.closingBalance?.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Detailed Ledger Transactions Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-xs font-medium">
                <thead className="bg-gray-100 text-gray-700 uppercase tracking-wider font-extrabold text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Voucher #</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Particulars</th>
                    <th className="p-2.5 text-right">Debit (₹)</th>
                    <th className="p-2.5 text-right">Credit (₹)</th>
                    <th className="p-2.5 text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ledgerData.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-pink-50/20">
                      <td className="p-2.5 font-mono text-[11px] text-gray-600">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="p-2.5 font-mono font-extrabold text-gray-900">{tx.voucherNo}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          tx.type === 'Sales Invoice' ? 'bg-blue-100 text-blue-800' :
                          tx.type === 'Payment Receipt' ? 'bg-emerald-100 text-emerald-800' :
                          tx.type === 'Store Room Return' ? 'bg-rose-100 text-rose-800' :
                          tx.type === 'Auto Expenses' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-2.5 text-gray-800">{tx.particulars}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-900">{tx.debit > 0 ? `₹${tx.debit.toFixed(2)}` : '-'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">{tx.credit > 0 ? `₹${tx.credit.toFixed(2)}` : '-'}</td>
                      <td className="p-2.5 text-right font-mono font-black text-gray-900 bg-gray-50/50">₹{tx.runningBalance?.toFixed(2)}</td>
                    </tr>
                  ))}

                  {ledgerData.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-6 text-center text-gray-400 font-medium">No transactions recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setActiveLedgerCustomer(null)} className="px-5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- MODAL: CREATE CUSTOMER PAYMENT RECEIPT --- */}
      {isReceiptModalOpen && receiptCustomer && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title={`Log Customer Payment Receipt — ${receiptCustomer.name}`}
        >
          <form onSubmit={handleSubmitReceipt} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              <p><strong>Customer:</strong> {receiptCustomer.name} ({receiptCustomer.customerCode})</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Receipt Date *</label>
                <input
                  type="date"
                  required
                  value={receiptForm.receiptDate}
                  onChange={(e) => setReceiptForm({ ...receiptForm, receiptDate: e.target.value })}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-gray-900 text-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Amount Received (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={receiptForm.amount}
                  onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-extrabold"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Payment Mode *</label>
                <select
                  value={receiptForm.paymentMode}
                  onChange={(e) => setReceiptForm({ ...receiptForm, paymentMode: e.target.value })}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-gray-900 text-sm font-bold"
                >
                  <option value="Cash">Cash Collection</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                  <option value="Cheque">Cheque Payment</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Reference / UTR / Cheque #</label>
                <input
                  type="text"
                  value={receiptForm.referenceNo}
                  onChange={(e) => setReceiptForm({ ...receiptForm, referenceNo: e.target.value })}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-bold"
                  placeholder="e.g. UPI12938192"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Remarks</label>
              <input
                type="text"
                value={receiptForm.remarks}
                onChange={(e) => setReceiptForm({ ...receiptForm, remarks: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium"
                placeholder="Remarks or notes..."
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <button type="button" onClick={() => setIsReceiptModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancel</button>
              <button
                type="submit"
                disabled={submittingReceipt}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1 disabled:opacity-50"
              >
                {submittingReceipt ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save Receipt Entry
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default CustomerLedgers;
