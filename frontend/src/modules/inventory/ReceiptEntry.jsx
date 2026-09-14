import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Receipt, Plus, FileText, CheckCircle2, Loader2, DollarSign, 
  Truck, Calendar, User, Search, Printer, X, Wrench, Fuel, 
  ArrowRight, Filter, AlertCircle, History, Sparkles, Building2,
  ChevronRight
} from 'lucide-react';
import Modal from '../../components/Modal';

const ReceiptEntry = () => {
  // Navigation Tabs: 'standard' | 'auto_settlement' | 'history'
  const [activeTab, setActiveTab] = useState('standard');
  const [loading, setLoading] = useState(true);

  // Common Data
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [receiptHistory, setReceiptHistory] = useState([]);

  // Filters for Standard Invoices
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Unpaid' | 'Partially Paid' | 'Paid'
  const [customerFilter, setCustomerFilter] = useState('');

  // Filters for Auto Sales Invoices
  const [autoSearch, setAutoSearch] = useState('');
  const [autoStatusFilter, setAutoStatusFilter] = useState('All');

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [generalReceiptModalOpen, setGeneralReceiptModalOpen] = useState(false);
  const [autoSettlementModalOpen, setAutoSettlementModalOpen] = useState(false);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState(null);

  // Standard Receipt Form State
  const [receiptForm, setReceiptForm] = useState({
    customerId: '',
    salesOrderId: '',
    receiptType: 'AGAINST_INVOICE',
    receiptDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'Cash',
    referenceNo: '',
    remarks: ''
  });

  // Auto Sales Settlement Modal Form State
  const [activeAutoSO, setActiveAutoSO] = useState(null);
  const [autoDate, setAutoDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAutoCustomerId, setSelectedAutoCustomerId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [inchargeId, setInchargeId] = useState('');
  const [autoItems, setAutoItems] = useState([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [autoExpenses, setAutoExpenses] = useState({
    dieselCost: 0,
    maintenanceCost: 0,
    otherCost: 0
  });
  const [autoCollection, setAutoCollection] = useState({
    cashAmount: 0,
    paytmAmount: 0,
    gpayAmount: 0
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [custRes, usersRes, prodRes, invRes, rcRes] = await Promise.all([
        api.get('/customers'),
        api.get('/users'),
        api.get('/products'),
        api.get('/customer-ledger/pending-invoices'),
        api.get('/customer-ledger/receipts/all')
      ]);

      const custData = custRes.data.data || [];
      setCustomers(custData);
      setUsers(usersRes.data.data || []);
      
      const fgProds = (prodRes.data.data || []).filter(p => p.itemType === 'Finished Goods');
      setProducts(fgProds.length > 0 ? fgProds : prodRes.data.data || []);
      
      setPendingInvoices(invRes.data.data || []);
      setReceiptHistory(rcRes.data.data || []);

      // Initialize Auto Sales products form
      initAutoItemsForm(fgProds.length > 0 ? fgProds : prodRes.data.data || []);
    } catch (error) {
      console.error('Failed to load receipt entry data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshInvoicesAndReceipts = async () => {
    try {
      const [invRes, rcRes] = await Promise.all([
        api.get('/customer-ledger/pending-invoices'),
        api.get('/customer-ledger/receipts/all')
      ]);
      setPendingInvoices(invRes.data.data || []);
      setReceiptHistory(rcRes.data.data || []);
    } catch (e) {
      console.error('Failed to refresh invoices', e);
    }
  };

  const initAutoItemsForm = (prodList, previousOpening = {}) => {
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
    setAutoItems(list);
  };

  // Open Auto Settlement Modal for a specific Auto Sales Order
  const handleOpenAutoSettlementForSO = async (so) => {
    setActiveAutoSO(so);
    const soDate = so.createdAt ? new Date(so.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setAutoDate(soDate);

    const custId = so.customer?._id || so.customer?.id || so.customer;
    setSelectedAutoCustomerId(custId);

    const cust = customers.find(c => c._id === custId || c.id === custId);
    setVehicleNo(so.vehicleNo || cust?.customerCode || cust?.name || 'Auto Van');

    if (cust && cust.salesOwner) {
      const ownerId = typeof cust.salesOwner === 'object' ? (cust.salesOwner._id || cust.salesOwner.id) : cust.salesOwner;
      const matched = users.find(u => (u._id || u.id) === ownerId || u.name === cust.salesOwner?.name);
      setInchargeId(matched?._id || matched?.id || ownerId || '');
    } else if (so.salesOwner) {
      const soOwnerId = typeof so.salesOwner === 'object' ? (so.salesOwner._id || so.salesOwner.id) : so.salesOwner;
      setInchargeId(soOwnerId || '');
    }

    // Map Taken stock directly from this Sales Order's items
    const soTakenMap = {};
    if (Array.isArray(so.items)) {
      so.items.forEach(it => {
        if (it && it.product) {
          const pId = (it.product._id || it.product.id || it.product).toString();
          soTakenMap[pId] = (soTakenMap[pId] || 0) + (it.quantityPcs || 0);
        }
      });
    }

    // Fetch previous day opening stock
    try {
      const res = await api.get(`/auto-sales/previous-opening?customerId=${custId}&date=${soDate}`);
      const { openingMap = {} } = res.data.data || {};

      setAutoItems(prev => prev.map(item => {
        const prevOp = openingMap[item.product] || 0;
        const soTaken = soTakenMap[item.product] || 0;
        const tot = prevOp + soTaken;
        const ret = 0;
        const sQty = tot;
        const rate = item.unitPrice || 20;
        return {
          ...item,
          openingQty: prevOp,
          takenQty: soTaken,
          totalQty: tot,
          returnQty: ret,
          salesQty: sQty,
          totalSalesValue: sQty * rate
        };
      }));
    } catch (e) {
      console.error('Failed to load previous opening stock', e);
    }

    // Reset expenses and collection form
    setAutoExpenses({ dieselCost: 0, maintenanceCost: 0, otherCost: 0 });
    setAutoCollection({ cashAmount: 0, paytmAmount: 0, gpayAmount: 0 });
    setAutoSettlementModalOpen(true);
  };

  // Open Direct / Manual Auto Settlement Modal
  const handleOpenDirectAutoSettlement = () => {
    setActiveAutoSO(null);
    setSelectedAutoCustomerId('');
    setVehicleNo('');
    setInchargeId('');
    initAutoItemsForm(products);
    setAutoExpenses({ dieselCost: 0, maintenanceCost: 0, otherCost: 0 });
    setAutoCollection({ cashAmount: 0, paytmAmount: 0, gpayAmount: 0 });
    setAutoSettlementModalOpen(true);
  };

  // Handle Auto Van Selection inside modal
  const handleAutoVehicleChangeInModal = async (customerId, dateStr = autoDate) => {
    setSelectedAutoCustomerId(customerId);
    const cust = customers.find(c => c._id === customerId);

    if (cust) {
      setVehicleNo(cust.customerCode || cust.name);
      if (cust.salesOwner) {
        const ownerId = typeof cust.salesOwner === 'object' ? (cust.salesOwner._id || cust.salesOwner.id) : cust.salesOwner;
        const matched = users.find(u => (u._id || u.id) === ownerId || u.name === cust.salesOwner?.name);
        setInchargeId(matched?._id || matched?.id || ownerId || '');
      }
    }

    if (!customerId) return;

    try {
      const res = await api.get(`/auto-sales/previous-opening?customerId=${customerId}&date=${dateStr}`);
      const { openingMap = {}, takenMap = {} } = res.data.data || {};

      setAutoItems(prev => prev.map(item => {
        const prevOp = openingMap[item.product] || 0;
        const todayTaken = takenMap[item.product] || 0;
        const tot = prevOp + todayTaken;
        const sQty = tot;
        const rate = item.unitPrice || 20;
        return {
          ...item,
          openingQty: prevOp,
          takenQty: todayTaken,
          totalQty: tot,
          returnQty: 0,
          salesQty: sQty,
          totalSalesValue: sQty * rate
        };
      }));
    } catch (e) {
      console.error('Failed to load auto stock data', e);
    }
  };

  const handleAutoItemReturnChange = (index, value) => {
    const updated = [...autoItems];
    const retVal = parseFloat(value) || 0;
    updated[index].returnQty = retVal;

    const tot = (updated[index].openingQty || 0) + (updated[index].takenQty || 0);
    updated[index].totalQty = tot;
    const sQty = Math.max(0, tot - retVal);
    updated[index].salesQty = sQty;
    updated[index].totalSalesValue = sQty * (updated[index].unitPrice || 0);

    setAutoItems(updated);
  };

  // Auto Computations
  const autoGrossSalesTotal = autoItems.reduce((sum, item) => sum + (item.totalSalesValue || 0), 0);
  const autoTotalExpenses = (parseFloat(autoExpenses.dieselCost) || 0) + 
                            (parseFloat(autoExpenses.maintenanceCost) || 0) + 
                            (parseFloat(autoExpenses.otherCost) || 0);
  const autoNetCollectionTotal = Math.max(0, autoGrossSalesTotal - autoTotalExpenses);
  const autoTotalCollected = (parseFloat(autoCollection.cashAmount) || 0) + 
                             (parseFloat(autoCollection.paytmAmount) || 0) + 
                             (parseFloat(autoCollection.gpayAmount) || 0);
  const autoPendingDifference = autoNetCollectionTotal - autoTotalCollected;

  // Submit Auto Settlement
  const handleSubmitAutoSettlement = async (e) => {
    e.preventDefault();
    if (!selectedAutoCustomerId) return alert('Please select an Auto Van / Vehicle.');

    const activeItems = autoItems.filter(i => i.totalQty > 0 || i.takenQty > 0 || i.openingQty > 0);
    if (activeItems.length === 0) {
      return alert('No active stock items found for this Auto Van.');
    }

    try {
      setSubmitting(true);
      const res = await api.post('/customer-ledger/auto-settlement', {
        entryDate: autoDate,
        vehicleNo,
        customer: selectedAutoCustomerId,
        incharge: inchargeId,
        items: autoItems.filter(i => i.totalQty > 0 || i.takenQty > 0 || i.openingQty > 0),
        expenses: autoExpenses,
        collectionBreakdown: autoCollection,
        salesOrderId: activeAutoSO?._id || activeAutoSO?.id || null
      });

      alert(res.data.message || 'Auto Sales Daily Settlement Completed!');
      if (res.data.data?.receipts && res.data.data.receipts.length > 0) {
        setSelectedReceiptForPrint(res.data.data.receipts[0]);
      }

      setAutoSettlementModalOpen(false);
      await refreshInvoicesAndReceipts();
    } catch (error) {
      console.error('Failed to submit auto settlement', error);
      alert(error.response?.data?.message || 'Error processing Auto Sales settlement');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Payment Modal for a Standard Invoice
  const handleOpenPaymentModal = (invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setReceiptForm({
      customerId: invoice.customer?._id || invoice.customer?.id || invoice.customer,
      salesOrderId: invoice._id || invoice.id,
      receiptType: 'AGAINST_INVOICE',
      receiptDate: new Date().toISOString().split('T')[0],
      amount: invoice.pendingAmount || invoice.grandTotal || '',
      paymentMode: 'Cash',
      referenceNo: '',
      remarks: `Payment against Invoice ${invoice.invoiceNumber || invoice.id}`
    });
    setPaymentModalOpen(true);
  };

  // Open General Standalone Receipt Modal
  const handleOpenGeneralReceiptModal = () => {
    setReceiptForm({
      customerId: '',
      salesOrderId: '',
      receiptType: 'GENERAL',
      receiptDate: new Date().toISOString().split('T')[0],
      amount: '',
      paymentMode: 'Cash',
      referenceNo: '',
      remarks: 'General Customer Receipt'
    });
    setGeneralReceiptModalOpen(true);
  };

  // Submit Standard Receipt
  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    if (!receiptForm.customerId) return alert('Please select a Customer.');
    if (!receiptForm.amount || parseFloat(receiptForm.amount) <= 0) {
      return alert('Please enter a valid payment amount.');
    }

    try {
      setSubmitting(true);
      const res = await api.post('/customer-ledger/receipt', {
        ...receiptForm,
        amount: parseFloat(receiptForm.amount)
      });

      alert(res.data.message || 'Payment Receipt Generated Successfully!');
      setSelectedReceiptForPrint(res.data.data);
      setPaymentModalOpen(false);
      setGeneralReceiptModalOpen(false);
      await refreshInvoicesAndReceipts();
    } catch (error) {
      console.error('Failed to create receipt', error);
      alert(error.response?.data?.message || 'Error creating payment receipt');
    } finally {
      setSubmitting(false);
    }
  };

  // FILTER 1: STANDARD INVOICES ONLY (Exclude Auto Sales)
  const standardInvoices = pendingInvoices.filter(inv => (inv.invoiceType || '').toLowerCase() !== 'auto sales');
  const filteredStandardInvoices = standardInvoices.filter(inv => {
    if (statusFilter !== 'All') {
      const pStatus = inv.paymentStatus?.toLowerCase() || '';
      if (statusFilter === 'Unpaid' && pStatus !== 'unpaid') return false;
      if (statusFilter === 'Partially Paid' && pStatus !== 'partially paid') return false;
      if (statusFilter === 'Paid' && pStatus !== 'paid') return false;
    }
    if (customerFilter && (inv.customer?._id !== customerFilter && inv.customer?.id !== customerFilter)) {
      return false;
    }
    if (invoiceSearch) {
      const term = invoiceSearch.toLowerCase();
      const invNo = (inv.invoiceNumber || inv.id || '').toLowerCase();
      const cName = (inv.customer?.name || '').toLowerCase();
      if (!invNo.includes(term) && !cName.includes(term)) return false;
    }
    return true;
  });

  // FILTER 2: AUTO SALES ORDERS ONLY
  const autoSalesInvoices = pendingInvoices.filter(inv => (inv.invoiceType || '').toLowerCase() === 'auto sales');
  const filteredAutoSalesInvoices = autoSalesInvoices.filter(inv => {
    if (autoStatusFilter !== 'All') {
      const pStatus = inv.paymentStatus?.toLowerCase() || '';
      if (autoStatusFilter === 'Unpaid' && pStatus !== 'unpaid') return false;
      if (autoStatusFilter === 'Paid' && pStatus !== 'paid') return false;
    }
    if (autoSearch) {
      const term = autoSearch.toLowerCase();
      const invNo = (inv.invoiceNumber || inv.id || '').toLowerCase();
      const cName = (inv.customer?.name || '').toLowerCase();
      if (!invNo.includes(term) && !cName.includes(term)) return false;
    }
    return true;
  });

  const autoCustomers = customers.filter(c => 
    (c.customerType || '').toLowerCase().includes('auto') || 
    (c.customerType || '').toLowerCase().includes('vechicle') ||
    (c.name || '').toLowerCase().includes('auto')
  );

  const displayedAutoItems = autoItems.filter(item => {
    if (showAllProducts || !selectedAutoCustomerId) return true;
    return (item.openingQty > 0 || item.takenQty > 0 || item.returnQty > 0);
  });

  const standardPendingCount = standardInvoices.filter(i => i.paymentStatus !== 'Paid').length;
  const autoPendingCount = autoSalesInvoices.filter(i => i.paymentStatus !== 'Paid').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-pink-200/60 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-pink-500 text-white shadow-md">
              <Receipt size={24} />
            </span>
            Receipt Entry & Daily Settlement
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Collect payments against Sales Invoices, log General Receipts, & settle Auto Van daily stock and diesel expenses.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('standard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'standard'
                ? 'bg-[var(--color-primary)] text-white shadow-md shadow-pink-500/20'
                : 'bg-white text-gray-600 hover:bg-pink-50 border border-pink-200'
            }`}
          >
            <FileText size={15} /> Standard Receipts ({standardPendingCount} Pending)
          </button>

          <button
            onClick={() => setActiveTab('auto_settlement')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'auto_settlement'
                ? 'bg-[var(--color-primary)] text-white shadow-md shadow-pink-500/20'
                : 'bg-white text-gray-600 hover:bg-pink-50 border border-pink-200'
            }`}
          >
            <Truck size={15} /> Auto Sales Daily Settlement ({autoPendingCount} Pending)
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-[var(--color-primary)] text-white shadow-md shadow-pink-500/20'
                : 'bg-white text-gray-600 hover:bg-pink-50 border border-pink-200'
            }`}
          >
            <History size={15} /> Receipt History ({receiptHistory.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 bg-white/60 rounded-2xl border border-pink-100">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={36} />
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: STANDARD RECEIPTS (EXCLUDES AUTO SALES INVOICES)                   */}
          {/* ========================================================================= */}
          {activeTab === 'standard' && (
            <div className="space-y-6">
              {/* Top Controls & Search Bar */}
              <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-pink-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap flex-1">
                  <div className="relative min-w-[240px] flex-1">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search Invoice # or Customer Name..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs focus:ring-2 focus:ring-pink-400 outline-none"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs font-semibold text-gray-700 outline-none"
                  >
                    <option value="All">All Payment Status</option>
                    <option value="Unpaid">Unpaid Only</option>
                    <option value="Partially Paid">Partially Paid Only</option>
                    <option value="Paid">Paid Invoices</option>
                  </select>

                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs font-semibold text-gray-700 outline-none max-w-[200px]"
                  >
                    <option value="">All Customers</option>
                    {customers.filter(c => !(c.customerType || '').toLowerCase().includes('auto')).map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleOpenGeneralReceiptModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all shrink-0"
                >
                  <Plus size={16} /> Create General Receipt (Advance)
                </button>
              </div>

              {/* Standard Invoices List Table */}
              <div className="bg-white rounded-2xl border border-pink-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-pink-50 to-white border-b border-pink-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <FileText size={16} className="text-[var(--color-primary)]" />
                    Standard Sales Invoices with Outstanding Balance ({filteredStandardInvoices.length})
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    Party Orders, Dealers & Regular Sales Invoices
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gradient-to-r from-[var(--color-primary)] to-pink-600 text-white uppercase text-[10px] tracking-wider font-extrabold">
                      <tr>
                        <th className="px-5 py-3.5">Invoice # & Date</th>
                        <th className="px-5 py-3.5">Customer / Outlet</th>
                        <th className="px-4 py-3.5">Sales Owner</th>
                        <th className="px-4 py-3.5 text-right">Grand Total (₹)</th>
                        <th className="px-4 py-3.5 text-right">Paid (₹)</th>
                        <th className="px-4 py-3.5 text-right">Pending Balance (₹)</th>
                        <th className="px-4 py-3.5 text-center">Status</th>
                        <th className="px-5 py-3.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStandardInvoices.map((inv) => {
                        const grandTotal = inv.grandTotal || 0;
                        const paid = inv.paidAmount || 0;
                        const pending = inv.pendingAmount !== undefined ? inv.pendingAmount : Math.max(0, grandTotal - paid);
                        const isPaid = pending <= 0.01;
                        const isPartial = paid > 0 && pending > 0.01;

                        return (
                          <tr key={inv._id || inv.id} className="hover:bg-pink-50/40 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-gray-900">
                              <div>{inv.invoiceNumber || inv.id}</div>
                              <div className="text-[10px] text-gray-400 font-normal">
                                {new Date(inv.createdAt).toLocaleDateString('en-GB')}
                              </div>
                            </td>

                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-gray-900">{inv.customer?.name || 'Walk-in Customer'}</div>
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200 mt-0.5">
                                {inv.invoiceType || 'Party Order'}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-gray-600">
                              {inv.salesOwner?.name || 'Admin'}
                            </td>

                            <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">
                              ₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="px-4 py-3.5 text-right font-black text-rose-600 text-sm">
                              ₹{pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              {isPaid ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-300">
                                  PAID
                                </span>
                              ) : isPartial ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-300">
                                  PARTIALLY PAID
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300">
                                  UNPAID
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              {!isPaid ? (
                                <button
                                  onClick={() => handleOpenPaymentModal(inv)}
                                  className="px-3 py-1.5 bg-[var(--color-primary)] hover:bg-pink-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto"
                                >
                                  <DollarSign size={13} /> Receive Payment
                                </button>
                              ) : (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                                  <CheckCircle2 size={13} /> Settled
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredStandardInvoices.length === 0 && (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center text-gray-400 font-medium">
                            No matching standard sales invoices found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: AUTO SALES DAILY SETTLEMENT (LISTS AUTO SOs -> OPENS MODAL)        */}
          {/* ========================================================================= */}
          {activeTab === 'auto_settlement' && (
            <div className="space-y-6">
              {/* Top Controls & Action Bar */}
              <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-pink-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap flex-1">
                  <div className="relative min-w-[240px] flex-1">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search Auto Invoice # or Van Driver Name..."
                      value={autoSearch}
                      onChange={(e) => setAutoSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs focus:ring-2 focus:ring-pink-400 outline-none"
                    />
                  </div>

                  <select
                    value={autoStatusFilter}
                    onChange={(e) => setAutoStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs font-semibold text-gray-700 outline-none"
                  >
                    <option value="All">All Settlement Status</option>
                    <option value="Unpaid">Pending Settlement</option>
                    <option value="Paid">Settled</option>
                  </select>
                </div>

                <button
                  onClick={handleOpenDirectAutoSettlement}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all shrink-0"
                >
                  <Plus size={16} /> + Direct Van Stock Settlement
                </button>
              </div>

              {/* Auto Sales Orders List Table */}
              <div className="bg-white rounded-2xl border border-pink-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-pink-50 to-white border-b border-pink-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <Truck size={16} className="text-[var(--color-primary)]" />
                    Auto Sales Daily Dispatches & Invoices ({filteredAutoSalesInvoices.length})
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    Click "Settle Van & Stock Return" to calculate sold qty, deduct diesel expenses & finalize receipt
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gradient-to-r from-[var(--color-primary)] to-pink-600 text-white uppercase text-[10px] tracking-wider font-extrabold">
                      <tr>
                        <th className="px-5 py-3.5">Invoice # & Date</th>
                        <th className="px-5 py-3.5">Auto Van / Driver</th>
                        <th className="px-4 py-3.5">Sales Owner</th>
                        <th className="px-4 py-3.5 text-right">Dispatched Value (₹)</th>
                        <th className="px-4 py-3.5 text-right">Settled Amount (₹)</th>
                        <th className="px-4 py-3.5 text-center">Status</th>
                        <th className="px-5 py-3.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAutoSalesInvoices.map((so) => {
                        const grandTotal = so.grandTotal || 0;
                        const paid = so.paidAmount || 0;
                        const isSettled = so.paymentStatus === 'Paid' || so.status === 'Paid';

                        return (
                          <tr key={so._id || so.id} className="hover:bg-pink-50/40 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-gray-900">
                              <div>{so.invoiceNumber || so.id}</div>
                              <div className="text-[10px] text-gray-400 font-normal">
                                {new Date(so.createdAt).toLocaleDateString('en-GB')}
                              </div>
                            </td>

                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-gray-900">{so.customer?.name || 'Auto Van Driver'}</div>
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 mt-0.5">
                                {so.customer?.customerCode || 'Auto Van'}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-gray-600">
                              {so.salesOwner?.name || 'Staff'}
                            </td>

                            <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">
                              ₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              {isSettled ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-300">
                                  SETTLED
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300">
                                  PENDING SETTLEMENT
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              <button
                                onClick={() => handleOpenAutoSettlementForSO(so)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto ${
                                  isSettled
                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    : 'bg-gradient-to-r from-indigo-600 to-[var(--color-primary)] text-white hover:opacity-95'
                                }`}
                              >
                                <Truck size={13} /> {isSettled ? 'Re-settle Van' : 'Settle Van & Stock Return'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredAutoSalesInvoices.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-gray-400 font-medium">
                            No Auto Sales orders found. You can also click "+ Direct Van Stock Settlement" to reconcile without an SO.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: RECEIPT HISTORY & VOUCHERS                                          */}
          {/* ========================================================================= */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl border border-pink-200 shadow-sm overflow-hidden space-y-4">
              <div className="p-4 bg-gradient-to-r from-pink-50 to-white border-b border-pink-200 flex items-center justify-between">
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Receipt size={16} className="text-[var(--color-primary)]" />
                  Generated Customer Payment Receipts ({receiptHistory.length})
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gradient-to-r from-[var(--color-primary)] to-pink-600 text-white uppercase text-[10px] tracking-wider font-extrabold">
                    <tr>
                      <th className="px-5 py-3.5">Receipt # & Date</th>
                      <th className="px-5 py-3.5">Customer / Van</th>
                      <th className="px-4 py-3.5">Receipt Type</th>
                      <th className="px-4 py-3.5">Payment Mode</th>
                      <th className="px-4 py-3.5">Reference No / Remarks</th>
                      <th className="px-4 py-3.5 text-right">Amount Received (₹)</th>
                      <th className="px-5 py-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {receiptHistory.map((rc) => (
                      <tr key={rc._id || rc.id} className="hover:bg-pink-50/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-gray-900">
                          <div>{rc.receiptNo || rc.id}</div>
                          <div className="text-[10px] text-gray-400 font-normal">
                            {new Date(rc.receiptDate).toLocaleDateString('en-GB')}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-semibold text-gray-900">
                          {rc.customer?.name || 'Walk-in Customer'}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rc.receiptType === 'AUTO_SALES_SETTLEMENT'
                              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                              : rc.receiptType === 'AGAINST_INVOICE'
                              ? 'bg-pink-100 text-pink-700 border border-pink-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {rc.receiptType || 'STANDARD'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-bold text-gray-700">
                          {rc.paymentMode || 'Cash'}
                        </td>

                        <td className="px-4 py-3.5 text-gray-500 max-w-[200px] truncate">
                          {rc.referenceNo ? `[${rc.referenceNo}] ` : ''}{rc.remarks || '—'}
                        </td>

                        <td className="px-4 py-3.5 text-right font-black text-emerald-600 text-sm">
                          ₹{(rc.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => setSelectedReceiptForPrint(rc)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 mx-auto"
                          >
                            <Printer size={12} /> Print
                          </button>
                        </td>
                      </tr>
                    ))}

                    {receiptHistory.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                          No customer receipts recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AUTO SALES DAILY STOCK SETTLEMENT & EXPENSE VOUCHER                */}
      {/* ========================================================================= */}
      {autoSettlementModalOpen && (
        <Modal
          isOpen={autoSettlementModalOpen}
          onClose={() => setAutoSettlementModalOpen(false)}
          title={activeAutoSO ? `Auto Sales Settlement — ${activeAutoSO.invoiceNumber || activeAutoSO.id}` : 'Auto Van Daily Stock & Expense Settlement'}
        >
          <form onSubmit={handleSubmitAutoSettlement} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
            {/* Header info */}
            <div className="bg-pink-50/70 p-4 rounded-xl border border-pink-200 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Settlement Date *</label>
                <input
                  type="date"
                  value={autoDate}
                  onChange={(e) => {
                    setAutoDate(e.target.value);
                    if (selectedAutoCustomerId) handleAutoVehicleChangeInModal(selectedAutoCustomerId, e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-pink-200 rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Auto Sales Van *</label>
                <select
                  value={selectedAutoCustomerId}
                  onChange={(e) => handleAutoVehicleChangeInModal(e.target.value, autoDate)}
                  className="w-full px-2.5 py-1.5 bg-white border border-pink-200 rounded-lg text-xs font-bold"
                  required
                >
                  <option value="">-- Choose Auto Van --</option>
                  {autoCustomers.map(c => (
                    <option key={c._id} value={c._id}>{c.name} ({c.customerCode || 'Van'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Vehicle Reg No</label>
                <input
                  type="text"
                  value={vehicleNo}
                  readOnly
                  placeholder="Auto Reg No"
                  className="w-full px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Driver / Incharge</label>
                <select
                  value={inchargeId}
                  onChange={(e) => setInchargeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-pink-200 rounded-lg text-xs font-semibold"
                >
                  <option value="">-- Select Driver --</option>
                  {users.map(u => (
                    <option key={u._id || u.id} value={u._id || u.id}>{u.name} ({u.employeeId || 'Staff'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock Reconciliation Grid */}
            <div className="bg-white rounded-xl border border-pink-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-gradient-to-r from-pink-50 to-white border-b border-pink-200 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Fill Unsold Returns to Calculate Sales Value ({displayedAutoItems.length} Products)
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllProducts(!showAllProducts)}
                  className="px-2.5 py-0.5 rounded bg-pink-100 hover:bg-pink-200 text-pink-800 text-[10px] font-bold transition-all"
                >
                  {showAllProducts ? 'Show Only Active Products' : '+ Show All Products'}
                </button>
              </div>

              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs text-gray-800">
                  <thead className="bg-gray-100 text-gray-700 uppercase text-[10px] font-extrabold sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-center w-10">#</th>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-2 py-2 text-center bg-amber-100 text-amber-900">Opening</th>
                      <th className="px-2 py-2 text-center bg-blue-100 text-blue-900">Taken (SO)</th>
                      <th className="px-2 py-2 text-center bg-indigo-100 text-indigo-900">Total</th>
                      <th className="px-2 py-2 text-center bg-rose-100 text-rose-900">Return Unsold</th>
                      <th className="px-2 py-2 text-center bg-emerald-100 text-emerald-900">Sold</th>
                      <th className="px-2 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayedAutoItems.map((item, idx) => {
                      const originalIdx = autoItems.findIndex(i => i.product === item.product);
                      return (
                        <tr key={item.product || idx} className="hover:bg-pink-50/20">
                          <td className="px-3 py-2 text-center text-gray-400 font-bold">{idx + 1}</td>
                          <td className="px-3 py-2 font-bold text-gray-900">{item.productName}</td>
                          <td className="px-2 py-2 text-center font-black text-amber-700 bg-amber-50/40">{item.openingQty || 0}</td>
                          <td className="px-2 py-2 text-center font-black text-blue-700 bg-blue-50/40">{item.takenQty || 0}</td>
                          <td className="px-2 py-2 text-center font-black text-indigo-900 bg-indigo-50/40">{item.totalQty || 0}</td>
                          <td className="px-2 py-2 text-center bg-rose-50/40">
                            <input
                              type="number"
                              min="0"
                              max={item.totalQty || 9999}
                              value={item.returnQty === 0 ? '' : item.returnQty}
                              placeholder="0"
                              onChange={(e) => handleAutoItemReturnChange(originalIdx, e.target.value)}
                              className="w-16 px-1.5 py-0.5 bg-white border border-rose-300 rounded text-center font-black text-rose-700 outline-none focus:ring-1 focus:ring-rose-400"
                            />
                          </td>
                          <td className="px-2 py-2 text-center font-black text-emerald-800 bg-emerald-50/40">{item.salesQty || 0}</td>
                          <td className="px-2 py-2 text-right font-semibold text-gray-700">₹{item.unitPrice}</td>
                          <td className="px-3 py-2 text-right font-black text-gray-900">
                            ₹{(item.totalSalesValue || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses & Collection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Daily Expenses */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
                <div className="font-bold text-gray-800 flex items-center gap-1">
                  <Fuel size={14} className="text-amber-600" /> Daily Expenses (Deducted from Collection)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Diesel (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={autoExpenses.dieselCost || ''}
                      placeholder="0.00"
                      onChange={(e) => setAutoExpenses({ ...autoExpenses, dieselCost: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Repairs (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={autoExpenses.maintenanceCost || ''}
                      placeholder="0.00"
                      onChange={(e) => setAutoExpenses({ ...autoExpenses, maintenanceCost: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Other (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={autoExpenses.otherCost || ''}
                      placeholder="0.00"
                      onChange={(e) => setAutoExpenses({ ...autoExpenses, otherCost: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold"
                    />
                  </div>
                </div>
                <div className="text-right font-black text-rose-600 text-[11px] pt-1">
                  Total Deductions: - ₹{autoTotalExpenses.toFixed(2)}
                </div>
              </div>

              {/* Settlement Summary */}
              <div className="bg-pink-50/70 p-3.5 rounded-xl border border-pink-200 space-y-2 text-xs">
                <div className="flex justify-between font-semibold text-gray-700">
                  <span>Gross Sold Value:</span>
                  <span className="font-bold text-gray-900">₹{autoGrossSalesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-rose-600">
                  <span>Less Expenses:</span>
                  <span>- ₹{autoTotalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-pink-200">
                  <span className="font-black text-gray-900 text-sm">Net Handover Amount:</span>
                  <span className="text-base font-black text-emerald-600">₹{autoNetCollectionTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Collection Breakdown */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-gray-700">Received Collection Breakdown:</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Cash (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={autoCollection.cashAmount || ''}
                    placeholder="0.00"
                    onChange={(e) => setAutoCollection({ ...autoCollection, cashAmount: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-pink-200 rounded-lg text-xs font-bold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Paytm (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={autoCollection.paytmAmount || ''}
                    placeholder="0.00"
                    onChange={(e) => setAutoCollection({ ...autoCollection, paytmAmount: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-pink-200 rounded-lg text-xs font-bold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">GPay / UPI (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={autoCollection.gpayAmount || ''}
                    placeholder="0.00"
                    onChange={(e) => setAutoCollection({ ...autoCollection, gpayAmount: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-pink-200 rounded-lg text-xs font-bold text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAutoSettlementModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-pink-600 hover:opacity-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-pink-500/20 disabled:opacity-50"
              >
                {submitting ? 'Finalizing...' : 'Finalize Settlement & Generate Receipt'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECEIVE PAYMENT AGAINST STANDARD INVOICE                           */}
      {/* ========================================================================= */}
      {paymentModalOpen && selectedInvoiceForPayment && (
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title={`Receive Payment — ${selectedInvoiceForPayment.invoiceNumber || selectedInvoiceForPayment.id}`}
        >
          <form onSubmit={handleSubmitReceipt} className="space-y-4">
            <div className="bg-pink-50/70 p-4 rounded-xl border border-pink-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-bold text-gray-900">{selectedInvoiceForPayment.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Total:</span>
                <span className="font-bold text-gray-900">₹{selectedInvoiceForPayment.grandTotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Already Paid:</span>
                <span className="font-semibold text-emerald-600">₹{selectedInvoiceForPayment.paidAmount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-pink-200 text-sm font-black">
                <span className="text-rose-600">Outstanding Balance:</span>
                <span className="text-rose-600">₹{selectedInvoiceForPayment.pendingAmount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Receipt Date *</label>
                <input
                  type="date"
                  value={receiptForm.receiptDate}
                  onChange={(e) => setReceiptForm({ ...receiptForm, receiptDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs font-semibold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Payment Mode *</label>
                <select
                  value={receiptForm.paymentMode}
                  onChange={(e) => setReceiptForm({ ...receiptForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI / GPay">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Payment Amount to Receive (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedInvoiceForPayment.pendingAmount || 999999}
                value={receiptForm.amount}
                onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full px-3 py-2 bg-white border-2 border-[var(--color-primary)] rounded-xl text-sm font-black text-gray-900 outline-none"
                required
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Allow partial payment. Remaining balance will stay active until fully settled.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Reference No / Cheque No / UPI Ref</label>
              <input
                type="text"
                value={receiptForm.referenceNo}
                onChange={(e) => setReceiptForm({ ...receiptForm, referenceNo: e.target.value })}
                placeholder="e.g. UPI-99201948 or Cheque 00192"
                className="w-full px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Remarks</label>
              <input
                type="text"
                value={receiptForm.remarks}
                onChange={(e) => setReceiptForm({ ...receiptForm, remarks: e.target.value })}
                placeholder="Optional notes"
                className="w-full px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-500/20 disabled:opacity-50"
              >
                {submitting ? 'Recording Receipt...' : 'Save & Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE GENERAL STANDALONE RECEIPT                                  */}
      {/* ========================================================================= */}
      {generalReceiptModalOpen && (
        <Modal
          isOpen={generalReceiptModalOpen}
          onClose={() => setGeneralReceiptModalOpen(false)}
          title="Create General Customer Receipt (Advance / On-Account)"
        >
          <form onSubmit={handleSubmitReceipt} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Select Customer *</label>
              <select
                value={receiptForm.customerId}
                onChange={(e) => setReceiptForm({ ...receiptForm, customerId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs font-semibold outline-none"
                required
              >
                <option value="">-- Choose Customer --</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.name} (Code: {c.customerCode || 'N/A'})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Receipt Date *</label>
                <input
                  type="date"
                  value={receiptForm.receiptDate}
                  onChange={(e) => setReceiptForm({ ...receiptForm, receiptDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs font-semibold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Payment Mode *</label>
                <select
                  value={receiptForm.paymentMode}
                  onChange={(e) => setReceiptForm({ ...receiptForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI / GPay">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Amount Received (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={receiptForm.amount}
                onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                placeholder="Enter amount"
                className="w-full px-3 py-2 bg-white border-2 border-emerald-500 rounded-xl text-sm font-black text-gray-900 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Reference No / Cheque No / UPI Ref</label>
              <input
                type="text"
                value={receiptForm.referenceNo}
                onChange={(e) => setReceiptForm({ ...receiptForm, referenceNo: e.target.value })}
                placeholder="e.g. Advance cash or UPI Ref"
                className="w-full px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Remarks</label>
              <input
                type="text"
                value={receiptForm.remarks}
                onChange={(e) => setReceiptForm({ ...receiptForm, remarks: e.target.value })}
                placeholder="Optional notes"
                className="w-full px-3 py-2 bg-gray-50 border border-pink-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGeneralReceiptModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {submitting ? 'Creating Receipt...' : 'Record General Receipt'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE RECEIPT VOUCHER                                          */}
      {/* ========================================================================= */}
      {selectedReceiptForPrint && (
        <Modal
          isOpen={!!selectedReceiptForPrint}
          onClose={() => setSelectedReceiptForPrint(null)}
          title="Payment Receipt Voucher"
        >
          <div className="space-y-4">
            <div id="printable-receipt" className="p-6 bg-white border border-gray-200 rounded-xl space-y-4 text-xs text-gray-800 font-sans">
              <div className="text-center border-b border-gray-200 pb-3">
                <div className="flex justify-center mb-2">
                  <img src="/logo.avif" alt="Logo" className="w-12 h-12 object-cover rounded-lg" />
                </div>
                <h3 className="text-base font-black text-gray-900 tracking-wider">SRI SARAVANASS ICE CREAMS</h3>
                <p className="text-[10px] text-gray-500">Main Factory & Cold Storage Warehouse Depot</p>
                <div className="inline-block px-3 py-0.5 rounded-full bg-pink-100 text-[var(--color-primary)] font-black text-[10px] tracking-wider mt-1 border border-pink-200">
                  OFFICIAL PAYMENT RECEIPT VOUCHER
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-gray-100 pb-3">
                <div>
                  <span className="text-gray-400">Receipt No:</span>
                  <span className="font-bold text-gray-900 ml-1">{selectedReceiptForPrint.receiptNo || selectedReceiptForPrint.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400">Date:</span>
                  <span className="font-bold text-gray-900 ml-1">
                    {new Date(selectedReceiptForPrint.receiptDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Customer:</span>
                  <span className="font-bold text-gray-900 ml-1">{selectedReceiptForPrint.customer?.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400">Payment Mode:</span>
                  <span className="font-bold text-gray-900 ml-1">{selectedReceiptForPrint.paymentMode}</span>
                </div>
              </div>

              <div className="p-4 bg-pink-50/50 rounded-xl border border-pink-200 flex justify-between items-center">
                <span className="font-black text-gray-800 text-sm">AMOUNT RECEIVED:</span>
                <span className="text-2xl font-black text-emerald-600">
                  ₹{(selectedReceiptForPrint.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {selectedReceiptForPrint.referenceNo && (
                <div className="text-[11px] text-gray-600">
                  <span className="font-bold text-gray-700">Ref / UPI No:</span> {selectedReceiptForPrint.referenceNo}
                </div>
              )}

              {selectedReceiptForPrint.remarks && (
                <div className="text-[11px] text-gray-600">
                  <span className="font-bold text-gray-700">Remarks:</span> {selectedReceiptForPrint.remarks}
                </div>
              )}

              <div className="pt-8 grid grid-cols-2 text-center text-[10px] text-gray-400">
                <div>
                  <div className="border-t border-gray-300 w-3/4 mx-auto pt-1 font-semibold text-gray-600">
                    Customer / Driver Signature
                  </div>
                </div>
                <div>
                  <div className="border-t border-gray-300 w-3/4 mx-auto pt-1 font-semibold text-gray-600">
                    Authorized Cashier Signature
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedReceiptForPrint(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const printContents = document.getElementById('printable-receipt').innerHTML;
                  const win = window.open('', '', 'height=600,width=800');
                  win.document.write('<html><head><title>Receipt Voucher</title>');
                  win.document.write('<style>body{font-family:sans-serif;padding:20px;}</style>');
                  win.document.write('</head><body>');
                  win.document.write(printContents);
                  win.document.write('</body></html>');
                  win.document.close();
                  win.print();
                }}
                className="flex-1 py-2 bg-[var(--color-primary)] hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-pink-500/20"
              >
                <Printer size={14} /> Print Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReceiptEntry;
