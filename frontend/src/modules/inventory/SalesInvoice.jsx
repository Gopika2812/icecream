import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  FileText, Plus, ShoppingBag, UserCheck, Calendar, CheckCircle2, 
  RotateCcw, Printer, Loader2, ArrowRight, Truck, Store, PartyPopper, MapPin, X, Wrench, Gift, User
} from 'lucide-react';
import Modal from '../../components/Modal';

const SalesInvoice = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs: 'Invoices' | 'New Invoice' | 'Auto Sales Returns'
  const [activeTab, setActiveTab] = useState('Invoices');

  // New Invoice Form State
  const [invoiceType, setInvoiceType] = useState('Party Order');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [selectedSalesOwnerId, setSelectedSalesOwnerId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [remarks, setRemarks] = useState('');

  // Invoice Line Items
  const [lineItems, setLineItems] = useState([
    { productId: '', batchNumber: '', quantityBoxes: 1, quantityPcs: 12, unitPrice: 0, totalPrice: 0 }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState(null);

  // Auto Return Modal
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState(null);
  const [returnItemsForm, setReturnItemsForm] = useState([]);
  const [returnRemarks, setReturnRemarks] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [soRes, custRes, userRes, invRes] = await Promise.all([
        api.get('/sales-orders'),
        api.get('/customers'),
        api.get('/users'),
        api.get('/inventory')
      ]);

      setSalesOrders(soRes.data.data || []);
      setCustomers(custRes.data.data || []);
      setUsers(userRes.data.data || []);
      
      // Filter Cold Room inventory
      const coldRoomInv = (invRes.data.data || []).filter(i => i.inventoryType === 'Cold Room' && i.quantity > 0);
      setInventory(coldRoomInv);
    } catch (error) {
      console.error('Failed to load sales data', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Customers based on selected Invoice Type
  const filteredCustomers = customers.filter(c => {
    if (!invoiceType) return true;
    if (invoiceType === 'Sample Products') return true; // Show all registered customers for Sample Products!
    if (invoiceType === 'Guest') return false; // Guest uses manual name input!
    return (c.customerType || '').toLowerCase() === invoiceType.toLowerCase();
  });

  // Helper to calculate price with customer owner margin
  const getCustomerMarginPrice = (basePrice, custId) => {
    const cust = customers.find(c => c._id === (custId || selectedCustomerId));
    const marginPercent = cust?.ownerMarginPercentage || 0;
    if (!marginPercent) return basePrice;
    const finalPrice = basePrice * (1 + (marginPercent / 100));
    return parseFloat(finalPrice.toFixed(2));
  };

  // Handle Customer Selection -> Auto Select Sales Owner & Apply Owner Margin!
  const handleCustomerChange = (customerId) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find(c => c._id === customerId);
    if (cust && cust.salesOwner) {
      const ownerId = typeof cust.salesOwner === 'object' ? cust.salesOwner._id : cust.salesOwner;
      setSelectedSalesOwnerId(ownerId);
    } else {
      setSelectedSalesOwnerId('');
    }

    // Recalculate existing line item prices with new customer margin
    if (lineItems.length > 0) {
      const updated = lineItems.map(item => {
        if (!item.productId) return item;
        const availableBatches = inventory.filter(i => i.product?._id === item.productId);
        const batchObj = availableBatches.length > 0 ? availableBatches[0] : null;
        const basePrice = batchObj ? (batchObj.purchasePrice || batchObj.product?.wholesalePrice || 20) : item.unitPrice;
        const newUnitPrice = getCustomerMarginPrice(basePrice, customerId);
        const pcs = parseInt(item.quantityPcs) || 0;
        return {
          ...item,
          unitPrice: newUnitPrice,
          totalPrice: pcs * newUnitPrice
        };
      });
      setLineItems(updated);
    }
  };

  // Line Item Logic
  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;

    // If product changed, set default batch & unit price with owner margin
    if (field === 'productId') {
      const availableBatches = inventory.filter(i => i.product?._id === value);
      if (availableBatches.length > 0) {
        const batchObj = availableBatches[0];
        updated[index].batchNumber = batchObj.batchNumber;
        const basePrice = batchObj.purchasePrice || batchObj.product?.wholesalePrice || 20;
        const calculatedPrice = getCustomerMarginPrice(basePrice, selectedCustomerId);
        updated[index].unitPrice = calculatedPrice;
        const pPerBox = batchObj.product?.piecesPerBox || 12;
        updated[index].quantityBoxes = 1;
        updated[index].quantityPcs = pPerBox;
        updated[index].totalPrice = pPerBox * calculatedPrice;
      }
    }

    if (field === 'quantityBoxes') {
      const pId = updated[index].productId;
      const batchObj = inventory.find(i => i.product?._id === pId);
      const pPerBox = batchObj?.product?.piecesPerBox || 12;
      const boxes = parseInt(value) || 0;
      updated[index].quantityPcs = boxes * pPerBox;
      updated[index].totalPrice = updated[index].quantityPcs * (updated[index].unitPrice || 0);
    }

    if (field === 'unitPrice' || field === 'quantityPcs') {
      const pcs = parseInt(updated[index].quantityPcs) || 0;
      const price = parseFloat(updated[index].unitPrice) || 0;
      updated[index].totalPrice = pcs * price;
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { productId: '', batchNumber: '', quantityBoxes: 1, quantityPcs: 12, unitPrice: 0, totalPrice: 0 }
    ]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Compute Invoice Summary Totals
  const subTotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
  const taxAmount = subTotal * 0.18;
  const grandTotal = subTotal + taxAmount;

  // Submit Invoice Creation
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (invoiceType !== 'Guest' && !selectedCustomerId) {
      return alert('Please select a customer.');
    }
    if (invoiceType === 'Guest' && !guestName.trim()) {
      return alert('Please enter Guest / Receiver Name.');
    }
    if (!lineItems.some(i => i.productId && i.quantityPcs > 0)) {
      return alert('Please select at least 1 finished good item with valid quantity.');
    }

    try {
      setSubmitting(true);
      const itemsPayload = lineItems.filter(i => i.productId).map(i => ({
        product: i.productId,
        batchNumber: i.batchNumber || 'COLD-ROOM',
        quantityBoxes: parseInt(i.quantityBoxes) || 0,
        quantityPcs: parseInt(i.quantityPcs) || 0,
        unitPrice: parseFloat(i.unitPrice) || 0
      }));

      const res = await api.post('/sales-orders', {
        invoiceType,
        customer: selectedCustomerId || undefined,
        guestName: invoiceType === 'Guest' ? guestName : undefined,
        salesOwner: selectedSalesOwnerId,
        items: itemsPayload,
        taxRate: (invoiceType === 'Sample Products' || invoiceType === 'Guest') ? 0 : 18,
        paymentStatus,
        remarks
      });

      alert(`Sales Invoice ${res.data.data.invoiceNumber} Generated Successfully! Stock reduced from Cold Room.`);
      setSelectedInvoiceForPrint(res.data.data);
      setActiveTab('Invoices');
      fetchInitialData();

      // Reset Form
      setSelectedCustomerId('');
      setGuestName('');
      setSelectedSalesOwnerId('');
      setRemarks('');
      setLineItems([{ productId: '', batchNumber: '', quantityBoxes: 1, quantityPcs: 12, unitPrice: 0, totalPrice: 0 }]);
    } catch (error) {
      console.error('Failed to create sales invoice', error);
      alert(error.response?.data?.message || 'Error generating sales invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto Sales Return State
  const [returnMode, setReturnMode] = useState('daily_auto'); // 'daily_auto' | 'cold_room'

  // Auto Sales Stock Return Handler
  const handleOpenAutoReturn = (order, mode = 'daily_auto') => {
    setSelectedInvoiceForReturn(order);
    setReturnMode(mode);
    
    // Automatically populate item details from invoice
    setReturnItemsForm(order.items.map(i => ({
      product: i.product?._id || i.product,
      productName: i.product?.name || 'Finished Good',
      batchNumber: i.batchNumber,
      dispatchedPcs: i.quantityPcs,
      returnedPcs: Math.floor(i.quantityPcs * 0.1) // Auto pre-fill default sample return or 0
    })));

    if (mode === 'daily_auto') {
      setReturnRemarks('Daily evening return — Stock retained inside Auto Van cold storage for tomorrow');
    } else {
      setReturnRemarks('Vehicle maintenance return — Unsold stock unloaded back to Main Cold Storage');
    }
  };

  const handleSubmitAutoReturn = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceForReturn) return;

    try {
      setSubmitting(true);
      await api.post(`/sales-orders/${selectedInvoiceForReturn._id}/auto-return`, {
        returnMode,
        returnedItems: returnItemsForm,
        remarks: returnRemarks
      });

      const modeText = returnMode === 'daily_auto' 
        ? 'Daily Van Return logged! Unsold stock saved inside Auto Van for tomorrow opening.' 
        : 'Maintenance Return logged! Unsold stock restored to Main Cold Storage Room.';

      alert(modeText);
      setSelectedInvoiceForReturn(null);
      fetchInitialData();
    } catch (error) {
      console.error('Failed to log auto sales return', error);
      alert(error.response?.data?.message || 'Error logging auto sales return');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper Badge Colors for Invoice Categories
  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'Party Order':
        return { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: PartyPopper };
      case 'Auto Sales':
        return { color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Truck };
      case 'Dealer':
        return { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Store };
      case 'Sample Products':
        return { color: 'bg-teal-100 text-teal-800 border-teal-300', icon: Gift };
      case 'Guest':
        return { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: User };
      default:
        return { color: 'bg-pink-100 text-pink-800 border-pink-300', icon: MapPin };
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            <FileText className="text-[var(--color-primary)]" size={26} />
            Sales Orders & GST Invoicing
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Categorized sales billing for Party Orders, Auto Vans, Dealers & Regional Branch Depots
          </p>
        </div>

        <button
          onClick={() => setActiveTab(activeTab === 'New Invoice' ? 'Invoices' : 'New Invoice')}
          className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md text-xs font-extrabold"
        >
          {activeTab === 'New Invoice' ? 'View All Invoices' : '+ Create New Sales Invoice'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/40 p-1.5 rounded-2xl border border-[var(--color-glass-border)] w-fit">
        <button
          onClick={() => setActiveTab('Invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'Invoices'
              ? 'bg-white text-[var(--color-primary)] shadow-md ring-2 ring-pink-500/20'
              : 'text-gray-600 hover:bg-white/60'
          }`}
        >
          Sales Invoice History ({salesOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('New Invoice')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'New Invoice'
              ? 'bg-white text-[var(--color-primary)] shadow-md ring-2 ring-pink-500/20'
              : 'text-gray-600 hover:bg-white/60'
          }`}
        >
          + Create New Invoice
        </button>
      </div>

      {/* VIEW 1: SALES INVOICES LIST */}
      {activeTab === 'Invoices' && (
        <div className="glass-panel overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-600 flex justify-center items-center gap-2">
              <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
              Loading Sales Invoices...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Invoice # & Date</th>
                    <th className="px-6 py-4 text-center">Category Type</th>
                    <th className="px-6 py-4">Customer / Outlet</th>
                    <th className="px-6 py-4">Sales Owner (Employee)</th>
                    <th className="px-6 py-4 text-right">Grand Total</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-glass-border)] font-medium">
                  {salesOrders.map((order) => {
                    const badge = getCategoryBadge(order.invoiceType);
                    const CategoryIcon = badge.icon;
                    const isAutoSales = order.invoiceType === 'Auto Sales';

                    return (
                      <tr key={order._id} className="hover:bg-white/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-gray-900">{order.invoiceNumber}</span>
                          <span className="block text-[11px] text-gray-400 font-normal">
                            {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-extrabold border inline-flex items-center gap-1.5 ${badge.color}`}>
                            <CategoryIcon size={13} /> {order.invoiceType}
                          </span>
                        </td>

                        <td className="px-6 py-4 font-bold text-gray-900">
                          {order.customer?.name || 'Walk-in Customer'}
                          <span className="block text-[11px] text-gray-400 font-normal">GSTIN: {order.customer?.gstinNumber || 'N/A'}</span>
                        </td>

                        <td className="px-6 py-4">
                          {order.salesOwner ? (
                            <div className="flex items-center gap-1.5 font-bold text-gray-800">
                              <UserCheck size={14} className="text-[var(--color-primary)] shrink-0" />
                              <div>
                                <span>{order.salesOwner.name}</span>
                                <span className="block text-[10px] text-gray-400 font-normal">{order.salesOwner.designation || 'Sales Owner'}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right font-mono font-extrabold text-emerald-700 text-base">
                          ₹{order.grandTotal?.toFixed(2)}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {order.autoSalesReturnLogged ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Unsold Stock Returned ({order.returnedPcs} Pcs)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Dispatched / Paid
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedInvoiceForPrint(order)}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <Printer size={12} /> Print Invoice
                            </button>

                            {isAutoSales && !order.autoSalesReturnLogged && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleOpenAutoReturn(order, 'daily_auto')}
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                  title="Daily Evening Return — Keep unsold stock in Auto Van for tomorrow"
                                >
                                  <Truck size={12} /> Daily Van Return
                                </button>

                                <button
                                  onClick={() => handleOpenAutoReturn(order, 'cold_room')}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                  title="Unload Auto Van stock back to Cold Storage Room for Vehicle Maintenance / Service"
                                >
                                  <Wrench size={12} /> Cold Room Return
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {salesOrders.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        No sales invoices logged yet. Click "+ Create New Sales Invoice" to generate one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CREATE NEW SALES INVOICE FORM */}
      {activeTab === 'New Invoice' && (
        <div className="glass-panel p-6 w-full border-t-4 border-t-[var(--color-primary)] shadow-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-pink-200 flex items-center gap-2">
            <ShoppingBag className="text-[var(--color-primary)]" size={20} />
            Generate Sales Invoice & Outward Dispatch
          </h2>

          <form onSubmit={handleCreateInvoice} className="space-y-6">
            {/* STEP 1: SELECT INVOICE CATEGORY TYPE */}
            <div>
              <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block mb-2">
                1. Select Invoice Category Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {[
                  { type: 'Party Order', label: 'Party Order', icon: PartyPopper, desc: 'Birthday & Functions' },
                  { type: 'Auto Sales', label: 'Auto Sales', icon: Truck, desc: 'Mobile Street Van' },
                  { type: 'Dealer', label: 'Dealer', icon: Store, desc: 'Regular Parlours' },
                  { type: 'Coimbatore', label: 'Coimbatore', icon: MapPin, desc: 'Branch Outlet' },
                  { type: 'Madurai', label: 'Madurai', icon: MapPin, desc: 'Branch Outlet' },
                  { type: 'Kerala', label: 'Kerala', icon: MapPin, desc: 'Branch Outlet' },
                  { type: 'Sample Products', label: 'Sample Products', icon: Gift, desc: 'Promotional Samples' },
                  { type: 'Guest', label: 'Guest', icon: User, desc: 'Complimentary / Guest' }
                ].map(item => {
                  const IconComp = item.icon;
                  const isSelected = invoiceType === item.type;

                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setInvoiceType(item.type);
                        setSelectedCustomerId('');
                        setGuestName('');
                        setSelectedSalesOwnerId('');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-pink-50 border-[var(--color-primary)] ring-2 ring-pink-500/20 shadow-sm'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <IconComp size={18} className={isSelected ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
                      <div className="mt-2">
                        <span className={`block text-xs font-extrabold ${isSelected ? 'text-[var(--color-primary)]' : 'text-gray-800'}`}>
                          {item.label}
                        </span>
                        <span className="text-[10px] text-gray-400 leading-tight block">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2 & 3: CUSTOMER / GUEST SELECTION & AUTO-SELECTED SALES OWNER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50/70 rounded-2xl border border-gray-200">
              
              {/* If Guest -> Manual Guest / Receiver Name Entry */}
              {invoiceType === 'Guest' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    2. Guest / Receiver Name (Manual Entry) *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-white border border-pink-200 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                    placeholder="e.g. Mr. Venkatesh (VIP Guest / Function)"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span>2. Select Customer ({filteredCustomers.length} Available) *</span>
                    {selectedCustomerId && (() => {
                      const cObj = customers.find(c => c._id === selectedCustomerId);
                      const m = cObj?.ownerMarginPercentage || 0;
                      if (!m) return null;
                      return (
                        <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border ${
                          m > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          Owner Margin: {m > 0 ? `+${m}%` : `${m}%`}
                        </span>
                      );
                    })()}
                  </label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full bg-white border border-pink-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  >
                    <option value="">-- Choose Customer ({invoiceType}) --</option>
                    {filteredCustomers.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.customerCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* SALES OWNER (AUTO SELECTED FROM CUSTOMER LINK) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block flex items-center justify-between">
                  <span>3. Sales Owner (Salesperson / Employee)</span>
                  {selectedSalesOwnerId && <span className="text-[10px] text-emerald-600 font-extrabold">✓ Auto Selected</span>}
                </label>
                <select
                  value={selectedSalesOwnerId}
                  onChange={(e) => setSelectedSalesOwnerId(e.target.value)}
                  className="w-full bg-white border border-pink-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">-- Select Sales Owner --</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.designation || u.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* STEP 4: LINE ITEMS (FINISHED GOODS STOCK SELECTION) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block">
                  4. Select Finished Goods Stock from Cold Room *
                </label>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add Another Item
                </button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 bg-white border border-pink-200 rounded-xl shadow-sm">
                    {/* Item & Batch Picker */}
                    <div className="col-span-12 sm:col-span-5 space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Product & Cold Room Batch</label>
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleLineItemChange(idx, 'productId', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-900"
                      >
                        <option value="">-- Select Finished Good --</option>
                        {inventory.map(inv => (
                          <option key={inv._id} value={inv.product?._id}>
                            {inv.product?.name} | Batch: {inv.batchNumber} (Available: {inv.quantity} Pcs)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Boxes */}
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Boxes</label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantityBoxes}
                        onChange={(e) => handleLineItemChange(idx, 'quantityBoxes', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold text-right font-mono"
                      />
                    </div>

                    {/* Total Pieces */}
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Total Pcs</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantityPcs}
                        onChange={(e) => handleLineItemChange(idx, 'quantityPcs', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold text-right font-mono text-emerald-700"
                      />
                    </div>

                    {/* Price per Piece */}
                    <div className="col-span-3 sm:col-span-2 space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Rate (₹/Pc)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={item.unitPrice}
                        onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold text-right font-mono"
                      />
                    </div>

                    {/* Delete Item */}
                    <div className="col-span-1 text-center pt-3">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 5: TOTAL SUMMARY & PAYMENT STATUS */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-200 gap-4">
              <div className="space-y-1 w-full sm:w-auto">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900"
                >
                  <option value="Paid">🟢 Paid (Cash / UPI)</option>
                  <option value="Pending">🟡 Pending Payment</option>
                  <option value="Credit">🔵 Customer Credit Account</option>
                </select>
              </div>

              <div className="text-right w-full sm:w-auto space-y-0.5">
                <div className="text-xs text-gray-500 font-semibold">Subtotal: ₹{subTotal.toFixed(2)}</div>
                <div className="text-xs text-gray-500 font-semibold">GST Tax (18%): ₹{taxAmount.toFixed(2)}</div>
                <div className="text-lg font-black text-emerald-700 font-mono">
                  Grand Total: ₹{grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2 flex justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('Invoices')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[var(--color-primary)] hover:bg-pink-700 text-white px-8 py-2.5 rounded-xl text-xs font-extrabold shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Generate Sales Invoice & Outward Dispatch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL: AUTO SALES RETURN (DAILY VAN VS COLD ROOM MAINTENANCE) --- */}
      {selectedInvoiceForReturn && (
        <Modal 
          isOpen={!!selectedInvoiceForReturn} 
          onClose={() => setSelectedInvoiceForReturn(null)} 
          title={returnMode === 'daily_auto' ? '🚚 Daily Van Evening Return (Auto Storage)' : '🔧 Vehicle Maintenance — Cold Room Stock Unload'}
        >
          <form onSubmit={handleSubmitAutoReturn} className="space-y-4">
            
            {returnMode === 'daily_auto' ? (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                <p className="font-extrabold flex items-center gap-1 text-indigo-900">
                  🚚 Overnight Auto Van Storage Routine:
                </p>
                <p className="text-[11px] leading-relaxed">
                  Unsold ice cream stays <strong>inside the Auto Van's cold box overnight</strong>. 
                  The returned quantities below will automatically populate as <strong>tomorrow's OPENING stock</strong> for this vehicle!
                </p>
                <div className="pt-2 border-t border-indigo-200 grid grid-cols-2 gap-2 text-[11px]">
                  <p><strong>Invoice #:</strong> {selectedInvoiceForReturn.invoiceNumber}</p>
                  <p><strong>Van / Driver:</strong> {selectedInvoiceForReturn.salesOwner?.name || 'Auto Driver'}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-extrabold flex items-center gap-1 text-amber-900">
                  ⚠️ Vehicle Service / Maintenance Unload:
                </p>
                <p className="text-[11px] leading-relaxed">
                  The Auto Van is going for maintenance/service. Unsold stock will be <strong>unloaded and restored back to the Main Cold Storage Room</strong>.
                </p>
                <div className="pt-2 border-t border-amber-200 grid grid-cols-2 gap-2 text-[11px]">
                  <p><strong>Invoice #:</strong> {selectedInvoiceForReturn.invoiceNumber}</p>
                  <p><strong>Van / Driver:</strong> {selectedInvoiceForReturn.salesOwner?.name || 'Auto Driver'}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Auto-Populated Return Quantities (Pcs)</label>
              {returnItemsForm.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div>
                    <span className="font-bold text-xs text-gray-900 block">{item.productName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">Dispatched: {item.dispatchedPcs} Pcs</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600">Unsold Returned:</span>
                    <input
                      type="number"
                      min="0"
                      max={item.dispatchedPcs}
                      value={item.returnedPcs}
                      onChange={(e) => {
                        const updated = [...returnItemsForm];
                        updated[idx].returnedPcs = parseInt(e.target.value) || 0;
                        setReturnItemsForm(updated);
                      }}
                      className="w-20 bg-white border border-indigo-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Return Remarks</label>
              <input
                type="text"
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <button type="button" onClick={() => setSelectedInvoiceForReturn(null)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancel</button>
              <button 
                type="submit" 
                disabled={submitting} 
                className={`px-6 py-2 rounded-xl text-xs font-bold text-white shadow-md ${
                  returnMode === 'daily_auto' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {submitting ? 'Logging Return...' : (returnMode === 'daily_auto' ? 'Log Daily Return (Auto Storage)' : 'Unload Stock to Main Cold Room')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL: PRINTABLE GST SALES INVOICE RECEIPT --- */}
      {selectedInvoiceForPrint && (
        <Modal isOpen={!!selectedInvoiceForPrint} onClose={() => setSelectedInvoiceForPrint(null)} title="Print GST Tax Invoice">
          <div className="p-4 bg-white rounded-2xl border border-gray-200 text-gray-800 space-y-4" id="printable-invoice">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-lg font-black text-[var(--color-primary)] font-display">SRI SARAVANASS ICE CREAMS</h3>
                <p className="text-[11px] text-gray-500">Factory & Cold Storage Depot, Main Road</p>
                <p className="text-[11px] text-gray-500">GSTIN: 33AAAAA1234A1Z0 | State Code: 33</p>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-0.5 rounded bg-pink-100 text-[var(--color-primary)] font-mono text-xs font-extrabold">
                  {selectedInvoiceForPrint.invoiceType} INVOICE
                </span>
                <h4 className="font-mono font-bold text-gray-900 text-sm mt-1">{selectedInvoiceForPrint.invoiceNumber}</h4>
                <p className="text-[10px] text-gray-400">{new Date(selectedInvoiceForPrint.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Customer & Salesperson Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-pink-50/50 p-3 rounded-xl border border-pink-100">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Billed To Customer</span>
                <strong className="text-gray-900 block font-bold">{selectedInvoiceForPrint.customer?.name}</strong>
                <span className="block text-[11px] text-gray-600">GSTIN: {selectedInvoiceForPrint.customer?.gstinNumber || 'N/A'}</span>
                <span className="block text-[11px] text-gray-600">{selectedInvoiceForPrint.customer?.billingAddress?.city || 'Tamil Nadu'}</span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Salesperson / Representative</span>
                <strong className="text-gray-900 block font-bold">{selectedInvoiceForPrint.salesOwner?.name || 'In-House Direct'}</strong>
                <span className="block text-[11px] text-gray-600">{selectedInvoiceForPrint.salesOwner?.designation || 'Sales Incharge'}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 text-center">Batch</th>
                    <th className="p-2.5 text-right">Qty (Pcs)</th>
                    <th className="p-2.5 text-right">Rate</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedInvoiceForPrint.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-gray-900">{item.product?.name || 'Ice Cream Item'}</td>
                      <td className="p-2.5 text-center font-mono text-[11px]">{item.batchNumber}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{item.quantityPcs}</td>
                      <td className="p-2.5 text-right font-mono">₹{item.unitPrice?.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{item.totalPrice?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Total */}
            <div className="flex justify-between items-center text-xs pt-2">
              <div className="text-gray-500 italic">
                Payment Status: <span className="font-bold text-emerald-700 uppercase">{selectedInvoiceForPrint.paymentStatus}</span>
              </div>

              <div className="text-right space-y-1">
                <div>Subtotal: <span className="font-mono font-bold">₹{selectedInvoiceForPrint.subTotal?.toFixed(2)}</span></div>
                <div>GST (18%): <span className="font-mono font-bold">₹{selectedInvoiceForPrint.taxAmount?.toFixed(2)}</span></div>
                <div className="text-base font-black text-[var(--color-primary)] font-mono">
                  Grand Total: ₹{selectedInvoiceForPrint.grandTotal?.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setSelectedInvoiceForPrint(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-[var(--color-primary)] hover:bg-pink-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Tax Invoice
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SalesInvoice;
