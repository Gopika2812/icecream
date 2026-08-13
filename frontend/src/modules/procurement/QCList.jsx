import React, { useState, useEffect } from 'react';
import { 
  Plus, ArrowLeft, Loader2, FileText, CheckCircle2, AlertTriangle, ShieldCheck, 
  Thermometer, Calendar, Package, CornerUpLeft, Building2, CreditCard, Search, 
  ArrowUpRight, ArrowDownLeft, Wallet, Filter, DollarSign, Printer, X, Eye 
} from 'lucide-react';
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

const QCList = () => {
  const [activeTab, setActiveTab] = useState('QC Check');
  const [qcs, setQcs] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('ALL');
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Main Dashboard Date Filter State
  const [datePreset, setDatePreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const { startDate: s, endDate: e } = getPresetDates(preset);
    setStartDate(s);
    setEndDate(e);
  };

  // Vendor Ledger Modal & Date Filter State
  const [selectedLedgerVendorId, setSelectedLedgerVendorId] = useState(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [modalFromDate, setModalFromDate] = useState('');
  const [modalToDate, setModalToDate] = useState('');

  // Interactive Popup Detail Modals
  const [selectedQcDetails, setSelectedQcDetails] = useState(null);
  const [selectedStoreRoomGroup, setSelectedStoreRoomGroup] = useState(null);
  const [selectedReturnGroup, setSelectedReturnGroup] = useState(null);

  // Form State
  const [selectedPO, setSelectedPO] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [items, setItems] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [activeTab, startDate, endDate]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      let qcUrl = '/qc';
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) qcUrl += `?${params.join('&')}`;

      const [qcRes, pendingRes, invRes, vendorRes] = await Promise.all([
        api.get(qcUrl),
        api.get('/qc/pending-pos'),
        api.get('/inventory'),
        api.get('/vendors')
      ]);
      setQcs(qcRes.data.data || []);
      setPendingPOs(pendingRes.data.data || []);
      setInventory(invRes.data.data || []);
      setVendors(vendorRes.data.data || []);
    } catch (error) {
      console.error('Failed to load QC Dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePOChange = async (poId) => {
    setSelectedPO(poId);
    if (!poId) {
      setItems([]);
      setSelectedBranch('');
      return;
    }

    const selectedPoObj = pendingPOs.find(p => p._id === poId);
    if (selectedPoObj) {
      setSelectedBranch(selectedPoObj.branch?._id || selectedPoObj.branch);
      
      const today = new Date().toISOString().split('T')[0];
      const mapped = selectedPoObj.items.map(item => {
        return {
          product: item.product?._id || item.product,
          name: item.product?.name || 'Unknown Product',
          itemCode: item.product?.itemCode || '',
          unitOfMeasure: item.product?.unitOfMeasure || '',
          itemType: item.product?.itemType || 'Raw Material',
          receivedQty: item.orderedQty,
          passedQty: item.orderedQty,
          damagedQty: 0,
          mrp: item.product?.mrp || 0,
          purchasePrice: item.unitPrice || 0, // pre-fill from PO price
          manufacturingDate: today,
          expiryDate: '',
          temperature: '',
          remarks: ''
        };
      });
      setItems(mapped);
    }
  };

  const handlePassedQtyChange = (index, valStr) => {
    const newItems = [...items];
    const received = newItems[index].receivedQty;
    const passed = Math.min(received, Math.max(0, parseInt(valStr) || 0));
    
    newItems[index].passedQty = passed;
    newItems[index].damagedQty = received - passed;
    setItems(newItems);
  };

  const handleDamagedQtyChange = (index, valStr) => {
    const newItems = [...items];
    const received = newItems[index].receivedQty;
    const damaged = Math.min(received, Math.max(0, parseInt(valStr) || 0));
    
    newItems[index].damagedQty = damaged;
    newItems[index].passedQty = received - damaged;
    setItems(newItems);
  };

  const handleItemPropertyChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleRemarksChange = (index, value) => {
    const newItems = [...items];
    newItems[index].remarks = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPO) return alert('Please select a Purchase Order.');

    const selectedPoObj = pendingPOs.find(p => p._id === selectedPO);
    const invoiceNo = selectedPoObj?.supplierInvoiceNumber || supplierInvoiceNumber || 'N/A';
    
    // Check constraints
    for (const item of items) {
      if (item.damagedQty > 0 && !item.remarks.trim()) {
        return alert(`Please specify a return reason / remark for ${item.name} damages.`);
      }
      if (item.itemType === 'Finished Goods' && !item.temperature) {
        return alert(`Please record the cold chain temperature for ${item.name}.`);
      }
    }

    try {
      setSubmitting(true);
      
      const totalReceived = items.reduce((acc, i) => acc + i.receivedQty, 0);
      const totalPassed = items.reduce((acc, i) => acc + i.passedQty, 0);
      
      let status = 'Passed';
      if (totalPassed === 0) {
        status = 'Failed';
      } else if (totalPassed < totalReceived) {
        status = 'Partial';
      }

      const payload = {
        poReference: selectedPO,
        branch: selectedBranch,
        supplierInvoiceNumber: invoiceNo,
        status,
        items: items.map(i => ({
          product: i.product,
          passedQty: i.passedQty,
          damagedQty: i.damagedQty,
          purchasePrice: parseFloat(i.purchasePrice) || 0,
          mrp: parseFloat(i.mrp) || 0,
          manufacturingDate: i.manufacturingDate || undefined,
          expiryDate: i.expiryDate || undefined,
          temperature: i.temperature ? parseFloat(i.temperature) : undefined,
          remarks: i.remarks
        }))
      };

      await api.post('/qc', payload);
      alert('QC report submitted! Batch records created & GRN saved.');
      
      setSelectedPO('');
      setSupplierInvoiceNumber('');
      setItems([]);
      setIsCreating(false);
      
      fetchInitialData();
    } catch (error) {
      console.error('Failed to create QC report', error);
      alert(error.response?.data?.message || 'Error creating QC report');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to filter items by main date range
  const matchesMainDateRange = (dateStr) => {
    if (!dateStr) return true;
    const t = new Date(dateStr).getTime();
    if (startDate && t < new Date(startDate).setHours(0,0,0,0)) return false;
    if (endDate && t > new Date(endDate).setHours(23,59,59,999)) return false;
    return true;
  };

  // Filter local data for tabs (Sort newest stocked-in items first at top)
  const storeRoomStock = inventory
    .filter(i => i.inventoryType === 'Store Room' && matchesMainDateRange(i.lastUpdated || i.createdAt))
    .sort((a, b) => new Date(b.lastUpdated || b.updatedAt || b.createdAt || 0) - new Date(a.lastUpdated || a.updatedAt || a.createdAt || 0));

  const rejectedStock = inventory
    .filter(i => i.inventoryType === 'Rejected Stock' && matchesMainDateRange(i.lastUpdated || i.createdAt))
    .sort((a, b) => new Date(b.lastUpdated || b.updatedAt || b.createdAt || 0) - new Date(a.lastUpdated || a.updatedAt || a.createdAt || 0));

  // Helper to match vendor for an inventory item
  const getVendorForItem = (item) => {
    if (item.vendor?.name) return item.vendor.name;
    const matchingQc = qcs.find(qc => 
      qc.items?.some(i => (i.product?._id || i.product)?.toString() === (item.product?._id || item.product)?.toString() && i.batchNumber === item.batchNumber)
    );
    if (matchingQc?.grnReference?.poReference?.vendor?.name) {
      return matchingQc.grnReference.poReference.vendor.name;
    }
    return 'N/A';
  };

  // Group Inventory Items into single rows per receiving / QC / GRN / Vendor
  const groupInventoryByQC = (invList = []) => {
    const map = {};
    invList.forEach((item) => {
      const matchingQc = qcs.find(qc => 
        qc.items?.some(i => (i.product?._id || i.product)?.toString() === (item.product?._id || item.product)?.toString() && i.batchNumber === item.batchNumber)
      );
      const vendorName = getVendorForItem(item);
      const qcNumber = matchingQc?.qcNumber || 'QC-N/A';
      const grnNumber = matchingQc?.grnReference?.grnNumber || (typeof matchingQc?.grnReference === 'string' ? matchingQc.grnReference : 'GRN-N/A');
      const invoiceNumber = matchingQc?.supplierInvoiceNumber || matchingQc?.grnReference?.supplierInvoiceNumber || matchingQc?.grnReference?.poReference?.supplierInvoiceNumber || 'N/A';
      const poNumber = matchingQc?.grnReference?.poReference?.poNumber || 'N/A';
      const dateStr = matchingQc?.checkedDate || matchingQc?.createdAt || item.lastUpdated || item.createdAt;

      const groupKey = matchingQc?._id || `${vendorName}_${item.batchNumber}_${new Date(dateStr).toDateString()}`;

      if (!map[groupKey]) {
        map[groupKey] = {
          groupKey,
          qcNumber,
          grnNumber,
          poNumber,
          invoiceNumber,
          vendorName,
          branchName: matchingQc?.branch?.branchName || matchingQc?.branch?.name || item.branch?.branchName || 'Main Branch',
          dateStr,
          items: [],
          totalQty: 0,
          totalValue: 0
        };
      }

      const itemQty = Number(item.quantity || 0);
      const itemPrice = Number(item.purchasePrice || 0);
      map[groupKey].items.push({
        ...item,
        matchingQc
      });
      map[groupKey].totalQty += itemQty;
      map[groupKey].totalValue += (itemQty * itemPrice);
    });

    return Object.values(map).sort((a, b) => new Date(b.dateStr || 0) - new Date(a.dateStr || 0));
  };

  const groupedStoreRoom = groupInventoryByQC(storeRoomStock);
  const groupedReturnVendor = groupInventoryByQC(rejectedStock);

  // --- Vendor Ledger & Transactions Compilation ---
  const compileVendorLedgers = () => {
    const rawTransactions = [];

    (qcs || []).forEach((qc) => {
      const poObj = qc.grnReference?.poReference;
      const vendorObj = poObj?.vendor;
      
      const vendorId = vendorObj?._id ? vendorObj._id.toString() : (typeof vendorObj === 'string' ? vendorObj : null);
      const vendorName = vendorObj?.name || 'Unknown Vendor';
      const vendorCode = vendorObj?.vendorCode || 'V-N/A';

      (qc.items || []).forEach((item) => {
        let unitPrice = parseFloat(item.purchasePrice || 0);
        if (unitPrice === 0 && poObj?.items) {
          const matchingPoItem = poObj.items.find(pi => (pi.product?._id || pi.product)?.toString() === (item.product?._id || item.product)?.toString());
          if (matchingPoItem) unitPrice = parseFloat(matchingPoItem.unitPrice || 0);
        }

        const date = qc.checkedDate || qc.createdAt || new Date();
        const prodName = item.product?.name || 'Product';
        const itemCode = item.product?.itemCode || '';
        const uom = item.product?.unitOfMeasure || 'Pcs';

        // 1. Product Buy -> Credit to Vendor
        if (item.passedQty > 0) {
          rawTransactions.push({
            id: `BUY-${qc._id}-${item.product?._id || item.product}`,
            date,
            vendorId,
            vendorName,
            vendorCode,
            qcNumber: qc.qcNumber,
            grnNumber: qc.grnReference?.grnNumber || 'N/A',
            productName: prodName,
            itemCode,
            unitOfMeasure: uom,
            batchNumber: item.batchNumber || 'N/A',
            type: 'Product Buy',
            qty: item.passedQty,
            unitPrice,
            credit: item.passedQty * unitPrice,
            debit: 0,
            remarks: item.remarks || 'Stock Buy / Passed QC'
          });
        }

        // 2. Vendor Return -> Debit to Vendor
        if (item.damagedQty > 0) {
          rawTransactions.push({
            id: `RET-${qc._id}-${item.product?._id || item.product}`,
            date,
            vendorId,
            vendorName,
            vendorCode,
            qcNumber: qc.qcNumber,
            grnNumber: qc.grnReference?.grnNumber || 'N/A',
            productName: prodName,
            itemCode,
            unitOfMeasure: uom,
            batchNumber: item.batchNumber || 'N/A',
            type: 'Vendor Return',
            qty: item.damagedQty,
            unitPrice,
            credit: 0,
            debit: item.damagedQty * unitPrice,
            remarks: item.remarks || 'Vendor Return / QC Damaged'
          });
        }
      });
    });

    // Sort chronologically
    rawTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group ledger records by vendor
    const vendorMap = {};
    (vendors || []).forEach((v) => {
      const vId = v._id.toString();
      vendorMap[vId] = {
        vendorId: vId,
        vendorName: v.name,
        vendorCode: v.vendorCode,
        gstin: v.gstinNumber || '-',
        phone: v.phone || '-',
        openingBalance: parseFloat(v.openingBalance || 0),
        totalCredit: 0,
        totalDebit: 0,
        closingBalance: parseFloat(v.openingBalance || 0),
        transactions: []
      };
    });

    // Process transactions into vendor ledger map
    rawTransactions.forEach((tx) => {
      let ledger = vendorMap[tx.vendorId];
      if (!ledger) {
        if (!vendorMap['UNMAPPED']) {
          vendorMap['UNMAPPED'] = {
            vendorId: 'UNMAPPED',
            vendorName: tx.vendorName || 'General Supplier',
            vendorCode: tx.vendorCode || 'V-GEN',
            gstin: '-',
            phone: '-',
            openingBalance: 0,
            totalCredit: 0,
            totalDebit: 0,
            closingBalance: 0,
            transactions: []
          };
        }
        ledger = vendorMap['UNMAPPED'];
      }

      ledger.totalCredit += tx.credit;
      ledger.totalDebit += tx.debit;
      
      const prevBal = ledger.transactions.length > 0
        ? ledger.transactions[ledger.transactions.length - 1].runningBalance
        : ledger.openingBalance;

      const runningBalance = prevBal + tx.credit - tx.debit;

      ledger.transactions.push({
        ...tx,
        runningBalance
      });

      ledger.closingBalance = runningBalance;
    });

    return Object.values(vendorMap);
  };

  const allLedgers = compileVendorLedgers();

  // Filtered Ledgers based on dropdown filter AND search query
  let filteredLedgerList = selectedVendorFilter === 'ALL'
    ? allLedgers
    : allLedgers.filter(l => l.vendorId === selectedVendorFilter);

  if (vendorSearchQuery.trim()) {
    const q = vendorSearchQuery.toLowerCase();
    filteredLedgerList = filteredLedgerList.filter(l => {
      const matchVendorName = (l.vendorName || '').toLowerCase().includes(q);
      const matchVendorCode = (l.vendorCode || '').toLowerCase().includes(q);
      const matchGstin = (l.gstin || '').toLowerCase().includes(q);
      const matchPhone = (l.phone || '').toLowerCase().includes(q);
      const matchTx = l.transactions.some(tx => 
        (tx.productName || '').toLowerCase().includes(q) ||
        (tx.itemCode || '').toLowerCase().includes(q) ||
        (tx.qcNumber || '').toLowerCase().includes(q) ||
        (tx.grnNumber || '').toLowerCase().includes(q) ||
        (tx.batchNumber || '').toLowerCase().includes(q)
      );
      return matchVendorName || matchVendorCode || matchGstin || matchPhone || matchTx;
    });
  }

  // Summary Metrics based on currently visible/filtered ledgers
  const summaryOpeningBal = filteredLedgerList.reduce((sum, l) => sum + l.openingBalance, 0);
  const summaryTotalCredit = filteredLedgerList.reduce((sum, l) => sum + l.totalCredit, 0);
  const summaryTotalDebit = filteredLedgerList.reduce((sum, l) => sum + l.totalDebit, 0);
  const summaryClosingBal = summaryOpeningBal + summaryTotalCredit - summaryTotalDebit;

  // Active Ledger for Popup Modal
  const activeModalLedger = allLedgers.find(l => l.vendorId === selectedLedgerVendorId);

  // Compute Period-Specific Data for Popup Modal
  const getModalPeriodData = () => {
    if (!activeModalLedger) return { periodOpening: 0, periodCredit: 0, periodDebit: 0, periodClosing: 0, periodTransactions: [] };

    const fromTime = modalFromDate ? new Date(modalFromDate).setHours(0,0,0,0) : null;
    const toTime = modalToDate ? new Date(modalToDate).setHours(23,59,59,999) : null;

    let periodOpening = activeModalLedger.openingBalance;
    let periodCredit = 0;
    let periodDebit = 0;

    const allTx = activeModalLedger.transactions || [];

    // Transactions before From Date adjust period opening balance
    allTx.forEach(tx => {
      const txTime = new Date(tx.date).getTime();
      if (fromTime && txTime < fromTime) {
        periodOpening += (tx.credit - tx.debit);
      }
    });

    const periodTransactions = [];
    let cumulativeBal = periodOpening;

    allTx.forEach(tx => {
      const txTime = new Date(tx.date).getTime();
      const afterFrom = !fromTime || txTime >= fromTime;
      const beforeTo = !toTime || txTime <= toTime;

      if (afterFrom && beforeTo) {
        periodCredit += tx.credit;
        periodDebit += tx.debit;
        cumulativeBal += (tx.credit - tx.debit);
        periodTransactions.push({
          ...tx,
          runningBalance: cumulativeBal
        });
      }
    });

    const periodClosing = periodOpening + periodCredit - periodDebit;

    return {
      periodOpening,
      periodCredit,
      periodDebit,
      periodClosing,
      periodTransactions
    };
  };

  const modalPeriodData = getModalPeriodData();

  // Print PDF Statement for Vendor Ledger
  const handlePrintPDF = () => {
    if (!activeModalLedger) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow popups in your browser to download/print the PDF statement.');

    const { periodOpening, periodCredit, periodDebit, periodClosing, periodTransactions } = modalPeriodData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vendor Ledger - ${activeModalLedger.vendorName}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 25px; background: #fff; }
            .header-banner {
              background: linear-gradient(135deg, #d81b60 0%, #ad1457 100%);
              color: white;
              padding: 24px 30px;
              border-radius: 12px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 4px 12px rgba(216, 27, 96, 0.2);
            }
            .header-title { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin: 0; }
            .header-subtitle { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; }
            .brand-badge { background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
            .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
            .info-card h4 { margin: 0 0 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
            .info-card p { margin: 4px 0; font-size: 13px; color: #334155; }
            .info-card strong { color: #0f172a; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .summary-card { background: #f1f5f9; padding: 12px 16px; border-radius: 10px; text-align: center; border: 1px solid #cbd5e1; }
            .summary-card .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
            .summary-card .val { font-size: 16px; font-weight: 800; font-family: monospace; }
            .ledger-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            .ledger-table th { background: #f8fafc; text-align: left; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
            .ledger-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; }
            .credit-txt { color: #047857; font-weight: 700; }
            .debit-txt { color: #be123c; font-weight: 700; }
            .badge-buy { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; }
            .badge-return { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; }
            .footer-note { margin-top: 35px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <h1 class="header-title">Sri Saravanaa ERP System</h1>
              <div class="header-subtitle">Vendor Account Ledger Statement</div>
            </div>
            <div class="brand-badge">
              SARAVANASS
            </div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <h4>Vendor Information</h4>
              <p><strong>Company Name:</strong> ${activeModalLedger.vendorName}</p>
              <p><strong>Vendor Code:</strong> ${activeModalLedger.vendorCode}</p>
              <p><strong>GSTIN Number:</strong> ${activeModalLedger.gstin}</p>
              <p><strong>Contact Phone:</strong> ${activeModalLedger.phone}</p>
            </div>
            <div class="info-card">
              <h4>Statement Details</h4>
              <p><strong>Statement Period:</strong> ${modalFromDate || 'Beginning'} to ${modalToDate || 'Today'}</p>
              <p><strong>Generated On:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Total Transactions:</strong> ${periodTransactions.length}</p>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <span class="lbl">Period Opening</span>
              <span class="val" style="color: #334155;">₹${periodOpening.toFixed(2)}</span>
            </div>
            <div class="summary-card" style="background: #ecfdf5; border-color: #a7f3d0;">
              <span class="lbl" style="color: #065f46;">Purchases (Credit)</span>
              <span class="val" style="color: #047857;">+ ₹${periodCredit.toFixed(2)}</span>
            </div>
            <div class="summary-card" style="background: #fff1f2; border-color: #fecdd3;">
              <span class="lbl" style="color: #9f1239;">Returns (Debit)</span>
              <span class="val" style="color: #be123c;">- ₹${periodDebit.toFixed(2)}</span>
            </div>
            <div class="summary-card" style="background: #e0e7ff; border-color: #c7d2fe;">
              <span class="lbl" style="color: #3730a3;">Period Closing</span>
              <span class="val" style="color: #312e81;">₹${periodClosing.toFixed(2)}</span>
            </div>
          </div>

          <table class="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product Name & Code</th>
                <th class="text-center">QC / GRN Ref</th>
                <th class="text-center">Type</th>
                <th class="text-right">Qty & Rate</th>
                <th class="text-right">Credit Value</th>
                <th class="text-right">Debit Value</th>
                <th class="text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              ${periodTransactions.map(tx => `
                <tr>
                  <td>${new Date(tx.date).toLocaleDateString()}</td>
                  <td>
                    <strong>${tx.productName}</strong>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Code: ${tx.itemCode} | Batch: ${tx.batchNumber}</div>
                  </td>
                  <td class="text-center font-mono">${tx.qcNumber}</td>
                  <td class="text-center">
                    <span class="${tx.type === 'Product Buy' ? 'badge-buy' : 'badge-return'}">
                      ${tx.type}
                    </span>
                  </td>
                  <td class="text-right font-mono">${tx.qty} ${tx.unitOfMeasure} @ ₹${tx.unitPrice.toFixed(2)}</td>
                  <td class="text-right font-mono credit-txt">${tx.credit > 0 ? '+ ₹' + tx.credit.toFixed(2) : '-'}</td>
                  <td class="text-right font-mono debit-txt">${tx.debit > 0 ? '- ₹' + tx.debit.toFixed(2) : '-'}</td>
                  <td class="text-right font-mono" style="font-weight: 700; color: #0f172a;">₹${tx.runningBalance.toFixed(2)}</td>
                </tr>
              `).join('')}
              ${periodTransactions.length === 0 ? '<tr><td colSpan="8" style="text-align: center; padding: 30px; color: #64748b;">No transactions recorded for the selected date range.</td></tr>' : ''}
            </tbody>
          </table>

          <div class="footer-note">
            Generated automatically by Sri Saravanaa ERP System • Quality Control & Procurement Module
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

  const handleOpenLedgerModal = (vendorId) => {
    setSelectedLedgerVendorId(vendorId);
    setModalFromDate('');
    setModalToDate('');
    setIsLedgerModalOpen(true);
  };

  if (isCreating) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-4 mb-6">
          <button 
            type="button"
            onClick={() => setIsCreating(false)} 
            className="p-2 rounded-lg bg-white/50 border border-[var(--color-glass-border)] hover:bg-white/80 transition-colors text-gray-700"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Conduct Quality Control & Stock In</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-panel p-6 grid grid-cols-1 gap-6 relative z-20">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Select Pending Purchase Order *</label>
              <SearchableSelect
                options={pendingPOs.map(p => ({ 
                  value: p._id, 
                  label: p.poNumber, 
                  code: p.vendor?.name,
                  sublabel: `Total: ₹${p.totalAmount}${p.supplierInvoiceNumber ? ` | Inv: ${p.supplierInvoiceNumber}` : ''}`
                }))}
                value={selectedPO}
                onChange={(val) => handlePOChange(val)}
                placeholder="Search & Select Issued PO..."
                required
              />
            </div>
          </div>

          {items.length > 0 && (
            <div className="glass-panel p-6 space-y-6 relative z-30">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="text-green-600" size={20} />
                QC Checks & Batch Registries
              </h3>
              
              {items.map((item, index) => {
                const isPackingMaterial = (item.itemType || '').toLowerCase().includes('pack');

                return (
                  <div key={index} className="p-4 rounded-xl border border-[var(--color-glass-border)] bg-white/10 space-y-4">
                    <div className="flex justify-between items-start border-b border-[var(--color-glass-border)] pb-2">
                      <div>
                        <span className="font-bold text-gray-900">{item.name}</span>
                        <span className="text-xs text-gray-500 font-mono block">
                          Code: {item.itemCode} | Ordered Qty: {item.receivedQty} {item.unitOfMeasure} | Type: {item.itemType}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                        Batch Code Auto-Assigned
                      </span>
                    </div>

                    <div className={`grid grid-cols-1 ${isPackingMaterial ? 'md:grid-cols-3' : 'md:grid-cols-5'} gap-4`}>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Passed Qty *</label>
                        <input
                          type="number"
                          min="0"
                          max={item.receivedQty}
                          value={item.passedQty}
                          onChange={(e) => handlePassedQtyChange(index, e.target.value)}
                          required
                          className="w-full bg-white/50 border border-green-300 text-green-700 font-semibold rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Damaged (Return Qty) *</label>
                        <input
                          type="number"
                          min="0"
                          max={item.receivedQty}
                          value={item.damagedQty}
                          onChange={(e) => handleDamagedQtyChange(index, e.target.value)}
                          required
                          className="w-full bg-white/50 border border-red-300 text-red-700 font-semibold rounded px-3 py-1.5 text-sm focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Purchase Price (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.purchasePrice}
                          onChange={(e) => handleItemPropertyChange(index, 'purchasePrice', e.target.value)}
                          required
                          className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                      {!isPackingMaterial && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                            <Thermometer size={12} className="text-red-500" />
                            Temperature (°C) {item.itemType === 'Finished Goods' ? '*' : ''}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.temperature}
                            onChange={(e) => handleItemPropertyChange(index, 'temperature', e.target.value)}
                            required={item.itemType === 'Finished Goods'}
                            placeholder="e.g. -18"
                            className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded px-3 py-1 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </div>
                      )}
                      {!isPackingMaterial && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Mfg Date</label>
                          <input
                            type="date"
                            value={item.manufacturingDate}
                            onChange={(e) => handleItemPropertyChange(index, 'manufacturingDate', e.target.value)}
                            className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded px-3 py-1 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </div>
                      )}
                    </div>

                    <div className={`grid grid-cols-1 ${isPackingMaterial ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
                      {!isPackingMaterial && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date</label>
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => handleItemPropertyChange(index, 'expiryDate', e.target.value)}
                            className="w-full bg-white/50 border border-[var(--color-glass-border)] rounded px-3 py-1 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks / QC failure reason</label>
                        <input
                          type="text"
                          value={item.remarks}
                          onChange={(e) => handleRemarksChange(index, e.target.value)}
                          required={item.damagedQty > 0}
                          placeholder={item.damagedQty > 0 ? "Explain damage / vendor return reason *" : "Optional remarks"}
                          className={`w-full bg-white/50 border rounded px-3 py-1.5 text-xs focus:outline-none ${
                            item.damagedQty > 0 ? 'border-red-300 focus:border-red-500' : 'border-[var(--color-glass-border)] focus:border-[var(--color-primary)]'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
              disabled={submitting || items.length === 0}
              className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-[0_0_15px_rgba(216,27,96,0.3)] disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Submit QC Report & Stock In
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
          <h1 className="text-2xl font-semibold text-gray-900 font-display">Quality Control & Stock In</h1>
          <p className="text-xs text-gray-500 mt-0.5">QC checks, store room receiving & vendor return management</p>
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
            <Plus size={16} /> Perform QC Check
          </button>
        </div>
      </div>

      {/* Unified Navigation Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--color-glass-border)] pb-px">
        {['QC Check', 'Store Room', 'Return to Vendor'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 -mb-px ${
              activeTab === tab 
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="glass-panel overflow-hidden">
{loading ? (
          <div className="p-8 text-center text-gray-600 flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={20} />
            Loading...
          </div>
        ) : (
          <div>
            {activeTab === 'QC Check' && (
              <div className="space-y-6 p-4 sm:p-6">
                {/* --- PENDING PURCHASE ORDERS AWAITING QC BANNER --- */}
                {pendingPOs.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 rounded-2xl border-2 border-amber-400/40 p-4 sm:p-5 space-y-3 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-300/30 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                          <Package size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 tracking-wide uppercase">
                            Incoming Purchase Orders Awaiting Quality Inspection
                          </h3>
                          <p className="text-xs text-slate-600 font-medium">
                            {pendingPOs.length} Issued Purchase Order(s) ready for physical QC check &amp; Store Room receiving
                          </p>
                        </div>
                      </div>

                      <span className="self-start sm:self-auto bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-black font-mono shadow-xs">
                        {pendingPOs.length} PO Pending Inspection
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {pendingPOs.map((po) => {
                        const poId = po._id || po.id;
                        const vName = po.vendor?.name || 'Vendor';
                        const bName = po.branch?.branchName || po.branch?.name || po.branch || 'Main Branch';
                        const itemCount = (po.items || []).length;

                        return (
                          <div key={poId} className="bg-white p-4 rounded-2xl border border-amber-200 hover:border-amber-400 transition-all shadow-xs space-y-3 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-mono text-xs font-black text-rose-900 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl block w-fit">
                                    {po.poNumber || 'PO-Indent'}
                                  </span>
                                  <h4 className="font-extrabold text-sm text-slate-900 mt-1">{vName}</h4>
                                </div>
                                <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                  ₹{po.totalAmount ? Number(po.totalAmount).toLocaleString('en-IN') : '0'}
                                </span>
                              </div>

                              <div className="text-xs text-slate-600 space-y-1 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                <div className="flex justify-between">
                                  <span>Branch: <strong>{bName}</strong></span>
                                  <span className="font-mono text-[11px] text-slate-500">{new Date(po.orderDate || po.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
                                </div>
                                <div className="text-[11px] text-slate-700 font-semibold truncate">
                                  Items ({itemCount}): {(po.items || []).map(i => i.product?.name || 'Product').slice(0, 3).join(', ')}{itemCount > 3 ? '...' : ''}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setIsCreating(true);
                                handlePOChange(poId);
                              }}
                              className="w-full bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white py-2.5 px-4 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                              <ShieldCheck size={16} /> Perform QC Check &amp; Stock In
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* --- COMPLETED QC LOGS TABLE --- */}
                <div className="space-y-2">
                  <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider px-1">
                    Completed Quality Control History Logs
                  </h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                    <table className="w-full text-left text-sm text-gray-700">
                      <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                        <tr>
                          <th className="px-6 py-4">QC Report No</th>
                          <th className="px-6 py-4">Vendor Name</th>
                          <th className="px-6 py-4">GRN Ref</th>
                          <th className="px-6 py-4">Branch</th>
                          <th className="px-6 py-4">Checked Date</th>
                          <th className="px-6 py-4">QC Status</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-glass-border)]">
                        {qcs.map((qc) => (
                          <tr 
                            key={qc._id} 
                            onClick={() => setSelectedQcDetails(qc)}
                            className="hover:bg-pink-50/40 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4 font-mono text-xs font-bold text-pink-700 flex items-center gap-2">
                              <FileText size={14} className="text-pink-500" />
                              {qc.qcNumber}
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {qc.grnReference?.poReference?.vendor?.name || qc.vendor?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs">{qc.grnReference?.grnNumber || (typeof qc.grnReference === 'string' ? qc.grnReference : 'N/A')}</td>
                            <td className="px-6 py-4">{qc.branch?.branchName || qc.branch?.name || qc.branchName || 'Main Branch'}</td>
                            <td className="px-6 py-4 text-xs font-semibold">
                              {qc.checkedDate || qc.createdAt ? new Date(qc.checkedDate || qc.createdAt).toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                                qc.status === 'Passed' ? 'bg-green-50 text-green-700 border border-green-200' :
                                qc.status === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {qc.status === 'Passed' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                {qc.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedQcDetails(qc);
                                }}
                                className="px-3 py-1 bg-pink-50 text-pink-700 hover:bg-pink-100 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                              >
                                <Eye size={12} /> View Breakdown
                              </button>
                            </td>
                          </tr>
                        ))}
                        {qcs.length === 0 && (
                          <tr>
                            <td colSpan="7" className="px-6 py-8 text-center text-gray-600">
                              No completed QC logs found yet. Perform a QC check on incoming POs above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Store Room' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                    <tr>
                      <th className="px-6 py-4">QC / GRN Ref</th>
                      <th className="px-6 py-4">Vendor Name</th>
                      <th className="px-6 py-4">Invoice / PO Ref</th>
                      <th className="px-6 py-4 text-center">Items Received</th>
                      <th className="px-6 py-4 text-right">Total In-Stock Qty</th>
                      <th className="px-6 py-4 text-right">Total Stock Value</th>
                      <th className="px-6 py-4 text-center">Date Received</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)]">
                    {groupedStoreRoom.map((group) => (
                      <tr 
                        key={group.groupKey} 
                        onClick={() => setSelectedStoreRoomGroup(group)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-mono text-xs font-bold text-blue-700 flex items-center gap-2">
                          <Package size={14} className="text-blue-500" />
                          {group.qcNumber !== 'QC-N/A' ? group.qcNumber : group.grnNumber}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{group.vendorName}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                          {group.invoiceNumber !== 'N/A' ? `Inv: ${group.invoiceNumber}` : `PO: ${group.poNumber}`}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                            {group.items.length} Product{group.items.length > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-green-600">
                          {group.totalQty} Units
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          ₹{group.totalValue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium">
                          {new Date(group.dateStr).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedStoreRoomGroup(group); }}
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> View Breakdown
                          </button>
                        </td>
                      </tr>
                    ))}
                    {groupedStoreRoom.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-8 text-center text-gray-600">
                          No items currently in Store Room inventory.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'Return to Vendor' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-glass-border)] text-gray-600 font-semibold">
                    <tr>
                      <th className="px-6 py-4">QC / GRN Ref</th>
                      <th className="px-6 py-4">Vendor Name</th>
                      <th className="px-6 py-4">Invoice / PO Ref</th>
                      <th className="px-6 py-4 text-center">Damaged Products</th>
                      <th className="px-6 py-4 text-right">Return Qty</th>
                      <th className="px-6 py-4 text-right">Return Value</th>
                      <th className="px-6 py-4 text-center">Date Logged</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-glass-border)]">
                    {groupedReturnVendor.map((group) => (
                      <tr 
                        key={group.groupKey} 
                        onClick={() => setSelectedReturnGroup(group)}
                        className="hover:bg-red-50/40 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-mono text-xs font-bold text-red-700 flex items-center gap-2">
                          <CornerUpLeft size={14} className="text-red-500" />
                          {group.qcNumber !== 'QC-N/A' ? group.qcNumber : group.grnNumber}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{group.vendorName}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                          {group.invoiceNumber !== 'N/A' ? `Inv: ${group.invoiceNumber}` : `PO: ${group.poNumber}`}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                            {group.items.length} Product{group.items.length > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-red-600">
                          {group.totalQty} Pcs
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          ₹{group.totalValue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium">
                          {new Date(group.dateStr).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedReturnGroup(group); }}
                            className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> View Returns
                          </button>
                        </td>
                      </tr>
                    ))}
                    {groupedReturnVendor.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-8 text-center text-gray-600">
                          No vendor returns logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'Vendor Payment' && (
              <div className="p-6 space-y-6">
                {/* 1. Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border border-[var(--color-glass-border)] bg-white/40 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Opening Balance</p>
                      <p className="text-xl font-bold text-gray-900 font-mono mt-0.5">
                        ₹{summaryOpeningBal.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <ArrowUpRight size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Product Buy (Credit)</p>
                      <p className="text-xl font-bold text-emerald-700 font-mono mt-0.5">
                        + ₹{summaryTotalCredit.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-rose-100 text-rose-700 border border-rose-200">
                      <ArrowDownLeft size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Vendor Return (Debit)</p>
                      <p className="text-xl font-bold text-rose-700 font-mono mt-0.5">
                        - ₹{summaryTotalDebit.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Net Closing Balance</p>
                      <p className="text-xl font-bold text-indigo-900 font-mono mt-0.5">
                        ₹{summaryClosingBal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Search & Filter Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/30 p-4 rounded-xl border border-[var(--color-glass-border)]">
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Filter size={18} className="text-gray-500" />
                    <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Filter Vendor:</label>
                    <select
                      value={selectedVendorFilter}
                      onChange={(e) => setSelectedVendorFilter(e.target.value)}
                      className="bg-white border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 text-sm font-medium text-gray-800 focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="ALL">All Vendors ({allLedgers.length})</option>
                      {allLedgers.map((l) => (
                        <option key={l.vendorId} value={l.vendorId}>
                          {l.vendorName} ({l.vendorCode}) - Closing: ₹{l.closingBalance.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative w-full md:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vendor, product, code, ref..."
                      value={vendorSearchQuery}
                      onChange={(e) => setVendorSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-white border border-[var(--color-glass-border)] rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {/* 3. Vendor Master Summary Table */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Building2 size={16} className="text-[var(--color-primary)]" />
                    Vendors Summary Records & Accounts Balance
                    {vendorSearchQuery.trim() && (
                      <span className="text-xs font-normal text-gray-500">
                        (Filtered: {filteredLedgerList.length} of {allLedgers.length} vendors)
                      </span>
                    )}
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-[var(--color-glass-border)] bg-white/20">
                    <table className="w-full text-left text-sm text-gray-700">
                      <thead className="bg-gray-50/80 border-b border-[var(--color-glass-border)] text-gray-600 font-semibold text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Vendor Code</th>
                          <th className="px-6 py-3">Vendor Name</th>
                          <th className="px-6 py-3 text-right">Opening Balance</th>
                          <th className="px-6 py-3 text-right text-emerald-700">Product Buy (Credit)</th>
                          <th className="px-6 py-3 text-right text-rose-700">Vendor Return (Debit)</th>
                          <th className="px-6 py-3 text-right text-indigo-900 font-bold">Closing Balance</th>
                          <th className="px-6 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-glass-border)]">
                        {filteredLedgerList.map((l) => (
                          <tr key={l.vendorId} className="hover:bg-white/40 transition-colors">
                            <td className="px-6 py-3.5 font-mono text-xs font-semibold text-gray-600">{l.vendorCode}</td>
                            <td className="px-6 py-3.5 font-bold text-gray-900">{l.vendorName}</td>
                            <td className="px-6 py-3.5 text-right font-mono font-medium text-gray-700">₹{l.openingBalance.toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-right font-mono font-semibold text-emerald-600">+ ₹{l.totalCredit.toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-right font-mono font-semibold text-rose-600">- ₹{l.totalDebit.toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-right font-mono font-bold text-indigo-900">₹{l.closingBalance.toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-center">
                              <button
                                onClick={() => handleOpenLedgerModal(l.vendorId)}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-soft)] transition-all shadow-[0_0_10px_rgba(216,27,96,0.2)]"
                              >
                                View Ledger
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredLedgerList.length === 0 && (
                          <tr>
                            <td colSpan="7" className="px-6 py-6 text-center text-gray-500">
                              No vendor records match your filter criteria "{vendorSearchQuery}".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- POPUP MODAL: VENDOR LEDGER STATEMENT & DATE FILTRATION & PDF PRINT --- */}
      {isLedgerModalOpen && activeModalLedger && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/60 backdrop-blur-md overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0"
            onClick={() => setIsLedgerModalOpen(false)}
          ></div>

          {/* Modal Container */}
          <div className="relative glass-panel w-full max-w-5xl bg-white border border-[var(--color-glass-border)] shadow-2xl rounded-2xl z-[100000] overflow-hidden flex flex-col my-auto max-h-[85vh] animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--color-glass-border)] bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--color-primary)] text-white shadow-md">
                  <Building2 size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {activeModalLedger.vendorName}
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 font-semibold">
                      {activeModalLedger.vendorCode}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    GSTIN: {activeModalLedger.gstin} | Phone: {activeModalLedger.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintPDF}
                  className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(216,27,96,0.3)]"
                >
                  <Printer size={16} /> Download Ledger PDF
                </button>
                <button
                  onClick={() => setIsLedgerModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Date Filter & Summary Toolbar */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Calendar size={18} className="text-[var(--color-primary)]" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Date Filtration:</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 font-semibold">From Date:</label>
                    <input
                      type="date"
                      value={modalFromDate}
                      onChange={(e) => setModalFromDate(e.target.value)}
                      className="bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 font-semibold">To Date:</label>
                    <input
                      type="date"
                      value={modalToDate}
                      onChange={(e) => setModalToDate(e.target.value)}
                      className="bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  {(modalFromDate || modalToDate) && (
                    <button
                      onClick={() => { setModalFromDate(''); setModalToDate(''); }}
                      className="text-xs text-[var(--color-primary)] font-semibold hover:underline"
                    >
                      Reset Dates
                    </button>
                  )}
                </div>
              </div>

              {/* Financial Summary Cards for Selected Date Period */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Period Opening</span>
                  <span className="text-base font-extrabold text-gray-900 font-mono mt-0.5 block">
                    ₹{modalPeriodData.periodOpening.toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-sm">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Purchases (Credit)</span>
                  <span className="text-base font-extrabold text-emerald-700 font-mono mt-0.5 block">
                    + ₹{modalPeriodData.periodCredit.toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 shadow-sm">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Returns (Debit)</span>
                  <span className="text-base font-extrabold text-rose-700 font-mono mt-0.5 block">
                    - ₹{modalPeriodData.periodDebit.toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 shadow-sm">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">Period Closing Balance</span>
                  <span className="text-base font-extrabold text-indigo-950 font-mono mt-0.5 block">
                    ₹{modalPeriodData.periodClosing.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Transactions Table for Modal */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Product & Details</th>
                      <th className="px-4 py-3 text-center">QC / GRN Ref</th>
                      <th className="px-4 py-3 text-center">Type</th>
                      <th className="px-4 py-3 text-right">Qty & Rate</th>
                      <th className="px-4 py-3 text-right text-emerald-700">Credit Value</th>
                      <th className="px-4 py-3 text-right text-rose-700">Debit Value</th>
                      <th className="px-4 py-3 text-right text-indigo-900 font-bold">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {modalPeriodData.periodTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-gray-600 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {tx.productName}
                          <span className="block font-mono text-[10px] text-gray-400 font-normal">Code: {tx.itemCode} | Batch: {tx.batchNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 font-semibold">
                            {tx.qcNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.type === 'Product Buy' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Product Buy
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Vendor Return
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-gray-700">
                          {tx.qty} {tx.unitOfMeasure} @ ₹{tx.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          {tx.credit > 0 ? `+ ₹${tx.credit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                          {tx.debit > 0 ? `- ₹${tx.debit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-indigo-950">
                          ₹{tx.runningBalance.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {modalPeriodData.periodTransactions.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500 font-medium">
                          No transactions recorded for the selected date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 3. Ultra-Clean Modern Modal for QC Check Report */}
      {selectedQcDetails && (() => {
        const poObj = selectedQcDetails.grnReference?.poReference;
        const vendorName = poObj?.vendor?.name || selectedQcDetails.vendor?.name || 'N/A';
        const grnNo = selectedQcDetails.grnReference?.grnNumber || (typeof selectedQcDetails.grnReference === 'string' ? selectedQcDetails.grnReference : 'N/A');
        const poNo = poObj?.poNumber || 'N/A';
        const branchName = selectedQcDetails.branch?.branchName || selectedQcDetails.branch?.name || selectedQcDetails.branchName || 'Main Branch';
        const checkedDateStr = selectedQcDetails.checkedDate || selectedQcDetails.createdAt ? new Date(selectedQcDetails.checkedDate || selectedQcDetails.createdAt).toLocaleString() : 'N/A';

        // Calculate items with resolved unit prices & totals
        const itemsWithPrices = (selectedQcDetails.items || []).map(item => {
          let price = Number(item.purchasePrice || 0);
          if (price === 0 && poObj?.items) {
            const matchingPoItem = poObj.items.find(pi => (pi.product?._id || pi.product)?.toString() === (item.product?._id || item.product)?.toString());
            if (matchingPoItem) price = Number(matchingPoItem.unitPrice || 0);
          }
          if (price === 0 && item.product) {
            price = Number(item.product.purchasePrice || item.product.wholesalePrice || 0);
          }
          return {
            ...item,
            resolvedUnitPrice: price,
            lineTotal: Number(item.passedQty || 0) * price
          };
        });

        const totalPassedValue = itemsWithPrices.reduce((acc, i) => acc + i.lineTotal, 0);
        const totalPassedQty = itemsWithPrices.reduce((acc, i) => acc + Number(i.passedQty || 0), 0);
        const totalDamagedQty = itemsWithPrices.reduce((acc, i) => acc + Number(i.damagedQty || 0), 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[88vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
              {/* Ultra-Clean Header */}
              <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold font-mono text-slate-900 tracking-tight">{selectedQcDetails.qcNumber}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                      selectedQcDetails.status === 'Passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      selectedQcDetails.status === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedQcDetails.status === 'Passed' ? 'bg-emerald-500' :
                        selectedQcDetails.status === 'Partial' ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`} />
                      {selectedQcDetails.status} QC Report
                    </span>
                  </div>
                  <p className="text-slate-700 text-xs font-medium mt-2">
                    Vendor: <span className="font-semibold text-slate-900">{vendorName}</span> | GRN: <span className="font-mono text-slate-900 font-semibold">{grnNo}</span> | PO: <span className="font-mono text-slate-900 font-semibold">{poNo}</span>
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Checked Date: <span className="font-medium text-slate-700">{checkedDateStr}</span> | Branch: <span className="font-medium text-slate-700">{branchName}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedQcDetails(null)}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
                {/* Modern Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 text-center shadow-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Items Checked</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{itemsWithPrices.length} Products</p>
                  </div>
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 text-center shadow-xs">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Passed Qty (Stock In)</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{totalPassedQty} Units</p>
                  </div>
                  <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200/80 text-center shadow-xs">
                    <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Return / Damaged Qty</p>
                    <p className="text-xl font-bold text-rose-700 mt-1">{totalDamagedQty > 0 ? `${totalDamagedQty} Pcs` : '0 Pcs'}</p>
                  </div>
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200/80 text-center shadow-xs">
                    <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Total Passed Value</p>
                    <p className="text-xl font-bold text-indigo-900 font-mono mt-1">
                      ₹{totalPassedValue.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Items Breakdown Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-100/70 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3.5">Product Name</th>
                        <th className="px-4 py-3.5 text-center">Batch No</th>
                        <th className="px-4 py-3.5 text-right">Passed Qty</th>
                        <th className="px-4 py-3.5 text-right text-rose-600">Damaged Qty</th>
                        <th className="px-4 py-3.5 text-right">Unit Price</th>
                        <th className="px-4 py-3.5 text-center">Temp Log</th>
                        <th className="px-4 py-3.5">Remarks / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemsWithPrices.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {item.product?.name || item.productName || 'Product'}
                            <span className="block font-mono text-[11px] text-slate-500 font-medium mt-0.5">Code: {item.product?.itemCode || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-semibold">
                              {item.batchNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                            {item.passedQty} {item.product?.unitOfMeasure || ''}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-rose-600">
                            {item.damagedQty > 0 ? `${item.damagedQty} ${item.product?.unitOfMeasure || ''}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-800">
                            ₹{item.resolvedUnitPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-slate-700">
                            {item.temperature !== undefined && item.temperature !== null ? `${item.temperature} °C` : 'N/A'}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                            {item.remarks || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={14} /> Print Report
                </button>
                <button
                  onClick={() => setSelectedQcDetails(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  Close Breakdown
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. Ultra-Clean Modern Modal for Store Room Grouped Receiving */}
      {selectedStoreRoomGroup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[88vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                    {selectedStoreRoomGroup.qcNumber !== 'QC-N/A' ? selectedStoreRoomGroup.qcNumber : selectedStoreRoomGroup.grnNumber}
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Store Room Receiving
                  </span>
                </div>
                <p className="text-slate-700 text-xs font-medium mt-2">
                  Vendor: <span className="font-semibold text-slate-900">{selectedStoreRoomGroup.vendorName}</span> | Invoice Ref: <span className="font-mono text-slate-900 font-semibold">{selectedStoreRoomGroup.invoiceNumber}</span>
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Date Received: <span className="font-medium text-slate-700">{new Date(selectedStoreRoomGroup.dateStr).toLocaleString()}</span> | Branch: <span className="font-medium text-slate-700">{selectedStoreRoomGroup.branchName}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedStoreRoomGroup(null)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 text-center shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Products Received</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{selectedStoreRoomGroup.items.length} Products</p>
                </div>
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 text-center shadow-xs">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total In-Stock Qty</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">{selectedStoreRoomGroup.totalQty} Units</p>
                </div>
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200/80 text-center shadow-xs">
                  <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Total Stock Valuation</p>
                  <p className="text-xl font-bold text-indigo-900 font-mono mt-1">
                    ₹{selectedStoreRoomGroup.totalValue.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100/70 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5">Product Name</th>
                      <th className="px-4 py-3.5 text-center">Batch No</th>
                      <th className="px-4 py-3.5 text-right">In-Stock Qty</th>
                      <th className="px-4 py-3.5 text-right">Unit Price</th>
                      <th className="px-4 py-3.5 text-right">Total Line Value</th>
                      <th className="px-4 py-3.5 text-center">Temp Log</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedStoreRoomGroup.items.map((item, idx) => {
                      const qty = Number(item.quantity || 0);
                      const price = Number(item.purchasePrice || 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {item.product?.name || item.productName || item.name || 'Product'}
                            <span className="block font-mono text-[11px] text-slate-500 font-medium mt-0.5">Code: {item.product?.itemCode || item.itemCode || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-semibold">
                              {item.batchNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                            {qty} {item.product?.unitOfMeasure || ''}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-800">
                            ₹{price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                            ₹{(qty * price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-slate-700">
                            {item.temperature !== undefined && item.temperature !== null ? `${item.temperature} °C` : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStoreRoomGroup(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Ultra-Clean Modern Modal for Return to Vendor Group */}
      {selectedReturnGroup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[88vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                    {selectedReturnGroup.qcNumber !== 'QC-N/A' ? selectedReturnGroup.qcNumber : selectedReturnGroup.grnNumber}
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Vendor Return Log
                  </span>
                </div>
                <p className="text-slate-700 text-xs font-medium mt-2">
                  Vendor: <span className="font-semibold text-slate-900">{selectedReturnGroup.vendorName}</span> | Invoice Ref: <span className="font-mono text-slate-900 font-semibold">{selectedReturnGroup.invoiceNumber}</span>
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Date Logged: <span className="font-medium text-slate-700">{new Date(selectedReturnGroup.dateStr).toLocaleString()}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedReturnGroup(null)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 text-center shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Damaged Products</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{selectedReturnGroup.items.length} Products</p>
                </div>
                <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200/80 text-center shadow-xs">
                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Total Return Quantity</p>
                  <p className="text-xl font-bold text-rose-700 mt-1">{selectedReturnGroup.totalQty} Pcs</p>
                </div>
                <div className="p-4 bg-rose-100/50 rounded-2xl border border-rose-300/80 text-center shadow-xs">
                  <p className="text-[10px] font-bold text-rose-900 uppercase tracking-wider">Total Return Debit Value</p>
                  <p className="text-xl font-bold text-rose-950 font-mono mt-1">
                    ₹{selectedReturnGroup.totalValue.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100/70 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5">Product Name</th>
                      <th className="px-4 py-3.5 text-center">Batch No</th>
                      <th className="px-4 py-3.5 text-right">Damaged Qty</th>
                      <th className="px-4 py-3.5 text-right">Unit Rate</th>
                      <th className="px-4 py-3.5 text-right">Total Debit Value</th>
                      <th className="px-4 py-3.5">QC Failure Reason / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReturnGroup.items.map((item, idx) => {
                      const qty = Number(item.quantity || 0);
                      const price = Number(item.purchasePrice || 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {item.product?.name || item.productName || item.name || 'Product'}
                            <span className="block font-mono text-[11px] text-slate-500 font-medium mt-0.5">Code: {item.product?.itemCode || item.itemCode || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-2.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-mono text-xs font-semibold">
                              {item.batchNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-rose-600">
                            {qty} {item.product?.unitOfMeasure || ''}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-800">
                            ₹{price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-700">
                            ₹{(qty * price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-medium text-amber-700">
                            {item.remarks || 'QC Damaged / Ready for return'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedReturnGroup(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Close Vendor Returns
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QCList;
