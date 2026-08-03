import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  FileText, Plus, ShoppingBag, UserCheck, Calendar, CheckCircle2, 
  RotateCcw, Printer, Loader2, ArrowRight, Truck, Store, PartyPopper, MapPin, X, Wrench, Gift, User
} from 'lucide-react';
import Modal from '../../components/Modal';
import SearchableSelect from '../../components/SearchableSelect';

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

  // Print Official Sales GST Tax Invoice PDF
  const handlePrintInvoice = (invoice) => {
    if (!invoice) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow popups in your browser to print the Tax Invoice.');

    const companyName = "SRI SARAVANASS ICE CREAM & DAIRY PRODUCTS";
    const companyAddress = "Head Office & Factory: 66, Nataraja Theatre Road, Sattur, Virudhunagar - 626203, Tamil Nadu";
    const companyContact = "Phone: +91 99420 27197 | Email: accounts@saravanass.com | GSTIN: 33AAAFS1234A1Z1";

    const customerObj = invoice.customer || {};
    const salesOwnerObj = invoice.salesOwner || {};
    const items = invoice.items || [];

    const subTotal = invoice.subTotal || items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
    const isTaxable = (invoice.taxRate || 18) > 0;
    const sgst = isTaxable ? subTotal * 0.09 : 0;
    const cgst = isTaxable ? subTotal * 0.09 : 0;
    const grandTotal = invoice.grandTotal || (subTotal + sgst + cgst);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>GST Tax Invoice - ${invoice.invoiceNumber}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 25px; background: #fff; line-height: 1.4; }
            
            /* Letterhead Header */
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border-bottom: 3px double #d81b60; padding-bottom: 12px; }
            .header-logo { width: 68px; height: 68px; object-fit: cover; border-radius: 12px; }
            .company-title { font-size: 19px; font-weight: 900; color: #881337; text-transform: uppercase; letter-spacing: 0.5px; }
            .company-sub { font-size: 11px; color: #475569; font-weight: 600; margin-top: 2px; }
            .company-contact { font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace; }
            
            /* Document Title Bar */
            .doc-title-bar { background: linear-gradient(135deg, #881337 0%, #ad1457 100%); color: white; padding: 8px 14px; border-radius: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
            .doc-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .doc-date { font-size: 11px; opacity: 0.95; font-family: monospace; }

            /* Info Box Grid */
            .info-grid { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 16px; }
            .info-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 11px; }
            .info-box h4 { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #881337; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 0.5px; }
            .info-box p { margin: 2px 0; color: #334155; }
            .info-box strong { color: #0f172a; }

            /* Items Table */
            .table-container { border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 16px; }
            .po-table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .po-table th { background: #f1f5f9; text-align: left; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; font-weight: 800; color: #334155; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
            .po-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; }

            /* Summary Section */
            .summary-section { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
            .terms-box { flex: 1; font-size: 9.5px; color: #64748b; background: #fafafa; border: 1px solid #f1f5f9; padding: 10px; border-radius: 6px; }
            .totals-box { width: 240px; font-size: 11px; }
            .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
            .totals-grand { display: flex; justify-between: space-between; border-top: 2px solid #881337; padding-top: 6px; margin-top: 4px; font-weight: 900; font-size: 13px; color: #881337; }

            /* Signatures */
            .footer-section { margin-top: 30px; }
            .sig-grid { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 8px; }
            .sig-box { text-align: center; width: 170px; border-top: 1px dashed #94a3b8; padding-top: 4px; font-size: 9.5px; font-weight: 700; color: #475569; }
            .disclaimer { margin-top: 20px; text-align: center; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }

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
              <td style="width: 76px; vertical-align: top;">
                <img src="/logo.avif" alt="Logo" class="header-logo" />
              </td>
              <td style="vertical-align: top; padding-left: 10px;">
                <div class="company-title">${companyName}</div>
                <div class="company-sub">${companyAddress}</div>
                <div class="company-contact">${companyContact}</div>
              </td>
            </tr>
          </table>

          <!-- DOCUMENT TITLE BAR -->
          <div class="doc-title-bar">
            <span class="doc-title">TAX INVOICE — ${invoice.invoiceType || 'SALES'} (${invoice.invoiceNumber})</span>
            <span class="doc-date">Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</span>
          </div>

          <!-- INFO BOXES -->
          <div class="info-grid">
            <div class="info-box">
              <h4>Billed Customer / Outlet Details</h4>
              <p><strong>Customer Name:</strong> ${invoice.guestName || customerObj.name || 'Walk-in Customer'}</p>
              <p><strong>Customer Code:</strong> ${customerObj.customerCode || 'N/A'}</p>
              <p><strong>GSTIN Number:</strong> ${customerObj.gstinNumber || 'URD (Unregistered)'}</p>
              <p><strong>Billing Address:</strong> ${customerObj.billingAddress?.city || 'Tamil Nadu'}</p>
              <p><strong>Phone:</strong> ${customerObj.phone || 'N/A'}</p>
            </div>

            <div class="info-box">
              <h4>Invoice & Sales Dispatch Info</h4>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Invoice Type:</strong> ${invoice.invoiceType}</p>
              <p><strong>Sales Representative:</strong> ${salesOwnerObj.name || 'In-House Direct'}</p>
              <p><strong>Sales Designation:</strong> ${salesOwnerObj.designation || 'Sales Executive'}</p>
              <p><strong>Payment Status:</strong> <strong style="color: #047857;">${invoice.paymentStatus}</strong></p>
            </div>
          </div>

          <!-- ITEMS TABLE -->
          <div class="table-container">
            <table class="po-table">
              <thead>
                <tr>
                  <th style="width: 5%;">#</th>
                  <th>Product Description</th>
                  <th style="width: 14%;">Batch No</th>
                  <th class="text-right" style="width: 12%;">Boxes</th>
                  <th class="text-right" style="width: 12%;">Qty (Pcs)</th>
                  <th class="text-right" style="width: 15%;">Rate (₹/Pc)</th>
                  <th class="text-right" style="width: 18%;">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, idx) => {
                  const prod = item.product || {};
                  return `
                    <tr>
                      <td class="text-center font-mono">${idx + 1}</td>
                      <td><strong>${prod.name || 'Ice Cream Finished Good'}</strong></td>
                      <td class="font-mono">${item.batchNumber || 'COLD-ROOM'}</td>
                      <td class="text-right font-mono">${item.quantityBoxes || 0}</td>
                      <td class="text-right font-mono" style="font-weight: 700;">${item.quantityPcs}</td>
                      <td class="text-right font-mono">₹${(item.unitPrice || 0).toFixed(2)}</td>
                      <td class="text-right font-mono" style="font-weight: 800; color: #0f172a;">₹${(item.totalPrice || 0).toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- SUMMARY SECTION -->
          <div class="summary-section">
            <div class="terms-box">
              <strong style="color: #334155; display: block; margin-bottom: 3px;">Terms & Conditions:</strong>
              1. Goods once sold will not be taken back unless damaged prior to delivery.<br />
              2. Keep ice cream products stored at -18°C or below.<br />
              3. Subject to Sattur jurisdiction only.
            </div>

            <div class="totals-box">
              <div class="totals-row">
                <span>Subtotal Amount:</span>
                <span class="font-mono">₹${subTotal.toFixed(2)}</span>
              </div>
              ${isTaxable ? `
                <div class="totals-row">
                  <span>SGST (9%):</span>
                  <span class="font-mono">₹${sgst.toFixed(2)}</span>
                </div>
                <div class="totals-row">
                  <span>CGST (9%):</span>
                  <span class="font-mono">₹${cgst.toFixed(2)}</span>
                </div>
              ` : `
                <div class="totals-row">
                  <span>Tax (Exempted):</span>
                  <span class="font-mono">₹0.00</span>
                </div>
              `}
              <div class="totals-grand">
                <span>Grand Total:</span>
                <span class="font-mono">₹${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- FOOTER & SIGNATURES -->
          <div class="footer-section">
            <div class="sig-grid">
              <div class="sig-box">Customer Signature</div>
              <div class="sig-box">Sales Representative</div>
              <div class="sig-box">For SRI SARAVANASS<br /><strong style="font-size: 8.5px;">Authorized Signatory</strong></div>
            </div>
            <div class="disclaimer">
              This Tax Invoice is computer-generated by Sri Saravanaa ERP System.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50/70 rounded-2xl border border-gray-200 relative z-50">
              
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
                  <SearchableSelect
                    options={filteredCustomers.map(c => ({ value: c._id, label: c.name, code: c.customerCode }))}
                    value={selectedCustomerId}
                    onChange={(val) => handleCustomerChange(val)}
                    placeholder={`Choose Customer (${invoiceType})...`}
                    required
                  />
                </div>
              )}

              {/* SALES OWNER (AUTO SELECTED FROM CUSTOMER LINK) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block flex items-center justify-between">
                  <span>3. Sales Owner (Salesperson / Employee)</span>
                  {selectedSalesOwnerId && <span className="text-[10px] text-emerald-600 font-extrabold">✓ Auto Selected</span>}
                </label>
                <SearchableSelect
                  options={users.map(u => ({ value: u._id, label: u.name, sublabel: u.designation || u.username }))}
                  value={selectedSalesOwnerId}
                  onChange={(val) => setSelectedSalesOwnerId(val)}
                  placeholder="Select Sales Owner..."
                />
              </div>
            </div>

            {/* STEP 4: LINE ITEMS (FINISHED GOODS STOCK SELECTION) */}
            <div className="relative z-30">
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
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 bg-white border border-pink-200 rounded-xl shadow-sm relative" style={{ zIndex: 40 - idx }}>
                    {/* Item & Batch Picker */}
                    <div className="col-span-12 sm:col-span-5 space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Product & Cold Room Batch</label>
                      <SearchableSelect
                        options={inventory.map(inv => ({
                          value: inv.product?._id,
                          label: inv.product?.name,
                          code: `Batch: ${inv.batchNumber}`,
                          sublabel: `Available: ${inv.quantity} Pcs`
                        }))}
                        value={item.productId}
                        onChange={(val) => handleLineItemChange(idx, 'productId', val)}
                        placeholder="Select Finished Good..."
                        required
                      />
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
            {/* Professional Header Banner with Logo */}
            <div className="p-4 bg-gradient-to-r from-rose-900 via-pink-900 to-purple-950 text-white rounded-2xl shadow-md space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <img src="/logo.avif" alt="Company Logo" className="w-12 h-12 rounded-xl object-cover border-2 border-pink-300/40 shadow-sm" />
                  <div>
                    <h2 className="text-base font-black tracking-wider text-white">SRI SARAVANASS ICE CREAM & DAIRY</h2>
                    <p className="text-[11px] text-pink-200 font-medium">Head Office: 66, Nataraja Theatre Road, Sattur, Virudhunagar - 626203</p>
                    <p className="text-[10px] text-pink-300/80 font-mono mt-0.5">GSTIN: 33AAAFS1234A1Z1 | Phone: +91 99420 27197</p>
                  </div>
                </div>

                <button
                  onClick={() => handlePrintInvoice(selectedInvoiceForPrint)}
                  className="flex items-center gap-1.5 bg-white hover:bg-pink-50 text-pink-900 px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition-all border border-pink-200 cursor-pointer"
                >
                  <Printer size={14} className="text-pink-700" /> Print Tax Invoice
                </button>
              </div>

              <div className="pt-2 border-t border-pink-500/30 flex justify-between items-center text-xs font-mono">
                <div>
                  <span className="text-pink-300 font-semibold">Category Type:</span> <strong className="text-white text-sm ml-1">{selectedInvoiceForPrint.invoiceType} INVOICE</strong>
                </div>
                <div>
                  <span className="text-pink-300 font-semibold">Invoice #:</span> <strong className="text-white ml-1">{selectedInvoiceForPrint.invoiceNumber}</strong>
                </div>
              </div>
            </div>

            {/* Customer & Salesperson Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div>
                <span className="text-[10px] text-pink-900 font-extrabold uppercase tracking-wider block border-b border-gray-200 pb-1 mb-1">Billed To Customer / Outlet</span>
                <strong className="text-gray-900 block font-bold text-sm">{selectedInvoiceForPrint.guestName || selectedInvoiceForPrint.customer?.name || 'Walk-in Customer'}</strong>
                <span className="block text-[11px] text-gray-600">GSTIN: {selectedInvoiceForPrint.customer?.gstinNumber || 'URD (Unregistered)'}</span>
                <span className="block text-[11px] text-gray-600">Location: {selectedInvoiceForPrint.customer?.billingAddress?.city || 'Tamil Nadu'}</span>
              </div>

              <div>
                <span className="text-[10px] text-pink-900 font-extrabold uppercase tracking-wider block border-b border-gray-200 pb-1 mb-1">Salesperson / Representative</span>
                <strong className="text-gray-900 block font-bold text-sm">{selectedInvoiceForPrint.salesOwner?.name || 'In-House Direct'}</strong>
                <span className="block text-[11px] text-gray-600">{selectedInvoiceForPrint.salesOwner?.designation || 'Sales Executive'}</span>
                <span className="block text-[11px] text-emerald-700 font-bold">Payment: {selectedInvoiceForPrint.paymentStatus}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-hidden border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Finished Good Description</th>
                    <th className="p-2.5 text-center">Batch No</th>
                    <th className="p-2.5 text-right">Boxes</th>
                    <th className="p-2.5 text-right">Qty (Pcs)</th>
                    <th className="p-2.5 text-right">Rate (₹/Pc)</th>
                    <th className="p-2.5 text-right">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedInvoiceForPrint.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-2.5 font-bold text-gray-900">{item.product?.name || 'Ice Cream Finished Good'}</td>
                      <td className="p-2.5 text-center font-mono text-[11px] text-gray-600">{item.batchNumber || 'COLD-ROOM'}</td>
                      <td className="p-2.5 text-right font-mono text-gray-700">{item.quantityBoxes || 0}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-gray-900">{item.quantityPcs}</td>
                      <td className="p-2.5 text-right font-mono text-gray-700">₹{(item.unitPrice || 0).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-extrabold text-pink-950 bg-pink-50/30">₹{(item.totalPrice || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Total Summary */}
            <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-100">
              <div className="text-gray-500 text-[11px] italic">
                Status: <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">{selectedInvoiceForPrint.paymentStatus}</span>
              </div>

              <div className="text-right space-y-1">
                <div className="text-xs text-gray-600">Subtotal: <span className="font-mono font-bold text-gray-900">₹{(selectedInvoiceForPrint.subTotal || selectedInvoiceForPrint.grandTotal || 0).toFixed(2)}</span></div>
                <div className="text-xs text-gray-600">GST (18%): <span className="font-mono font-bold text-gray-900">₹{(selectedInvoiceForPrint.taxAmount || 0).toFixed(2)}</span></div>
                <div className="text-base font-black text-pink-950 font-mono">
                  Grand Total: ₹{selectedInvoiceForPrint.grandTotal?.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center border-t border-gray-200">
              <span className="text-[11px] text-gray-400 italic">Sri Saravanaa ERP System • Sales & Distribution</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPrint(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintInvoice(selectedInvoiceForPrint)}
                  className="bg-[var(--color-primary)] hover:bg-pink-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  <Printer size={14} /> Print Tax Invoice PDF
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SalesInvoice;
