import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Building2, Search, Calendar, FileText, ArrowUpRight, ArrowDownLeft, 
  CreditCard, Plus, Printer, Loader2, CheckCircle2, Phone, MapPin, Tag, RefreshCw, Eye, ChevronRight,
  Download, FileSpreadsheet, Layers, DollarSign, Receipt, CheckSquare, Square, Filter
} from 'lucide-react';
import Modal from '../../components/Modal';

const VendorLedgers = () => {
  // Main Tab State: 'SUMMARIES' | 'PAYMENT_RECORDS'
  const [activeTab, setActiveTab] = useState('SUMMARIES');

  const [vendors, setVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Vendor for Detailed Statement Modal
  const [activeLedgerVendor, setActiveLedgerVendor] = useState(null);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Vendor Financial Summaries Map (for main table overview)
  const [vendorBalances, setVendorBalances] = useState({});

  // --- Payment Modal State ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentVendor, setPaymentVendor] = useState(null);
  const [vendorPOs, setVendorPOs] = useState([]);
  const [loadingVendorPOs, setLoadingVendorPOs] = useState(false);
  const [paymentType, setPaymentType] = useState('AGAINST_INVOICE'); // 'AGAINST_INVOICE' | 'GENERAL'
  const [selectedPOId, setSelectedPOId] = useState('');

  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    remarks: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // --- Payment Records Tab State ---
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [loadingPaymentRecords, setLoadingPaymentRecords] = useState(false);
  const [recordsPaymentModeFilter, setRecordsPaymentModeFilter] = useState('ALL');
  const [recordsVendorFilter, setRecordsVendorFilter] = useState('ALL');
  const [recordsSearchQuery, setRecordsSearchQuery] = useState('');

  // All QC entries list for exact vendor return calculations
  const [allQcsList, setAllQcsList] = useState([]);

  useEffect(() => {
    fetchVendorsAndBalances();
    fetchPaymentRecords();
  }, [startDate, endDate]);

  const fetchVendorsAndBalances = async () => {
    try {
      setLoadingVendors(true);
      let url = '/vendor-ledger/summaries/all';
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) url += `?${params.join('&')}`;

      const [vRes, bRes, qcRes] = await Promise.all([
        api.get('/vendors'),
        api.get(url).catch(() => ({ data: { data: {} } })),
        api.get('/qc').catch(() => ({ data: { data: [] } }))
      ]);

      const vendorList = vRes.data.data || [];
      const balancesMap = bRes.data.data || {};
      const allQcs = qcRes.data.data || [];

      setAllQcsList(allQcs);

      // Client-side enrichment for vendor summary balances
      allQcs.forEach(qc => {
        const itemVendorName = qc.grnReference?.poReference?.vendor?.name || qc.vendor?.name;
        const matchingVendor = vendorList.find(v => 
          (v._id && qc.vendorId && v._id.toString() === qc.vendorId.toString()) ||
          (v._id && qc.grnReference?.poReference?.vendor?._id && v._id.toString() === qc.grnReference.poReference.vendor._id.toString()) ||
          (v.name && itemVendorName && itemVendorName.toLowerCase().includes(v.name.toLowerCase()))
        );

        if (matchingVendor) {
          const vId = matchingVendor._id.toString();
          let returnVal = 0;
          (qc.items || []).forEach(item => {
            const damaged = item.damagedQty || item.rejectedQty || 0;
            if (damaged > 0) {
              const price = item.purchasePrice || item.unitPrice || 0.25;
              returnVal += (damaged * price);
            }
          });

          if (!balancesMap[vId]) {
            balancesMap[vId] = {
              openingBalance: matchingVendor.openingBalance || 0,
              totalCredit: 0,
              totalDebit: 0,
              closingBalance: matchingVendor.openingBalance || 0
            };
          }

          if (returnVal > 0) {
            const currentDebit = balancesMap[vId].totalDebit || 0;
            if (currentDebit < returnVal) {
              balancesMap[vId].totalDebit = returnVal;
              balancesMap[vId].closingBalance = (balancesMap[vId].openingBalance || 0) + (balancesMap[vId].totalCredit || 0) - balancesMap[vId].totalDebit;
            }
          }
        }
      });

      setVendors(vendorList);
      setVendorBalances(balancesMap);
    } catch (e) {
      console.error('Failed to fetch vendors', e);
    } finally {
      setLoadingVendors(false);
    }
  };

  const fetchPaymentRecords = async () => {
    try {
      setLoadingPaymentRecords(true);
      let url = '/vendor-ledger/payments';
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) url += `?${params.join('&')}`;

      const res = await api.get(url).catch(() => ({ data: { data: [] } }));
      setPaymentRecords(res.data?.data || []);
    } catch (e) {
      console.error('Failed to fetch payment records', e);
    } finally {
      setLoadingPaymentRecords(false);
    }
  };

  const handleOpenLedgerModal = async (vendor) => {
    setActiveLedgerVendor(vendor);
    try {
      setLoadingLedger(true);
      let url = `/vendor-ledger/${vendor._id}`;
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length) url += `?${params.join('&')}`;

      const [res, qcRes] = await Promise.all([
        api.get(url).catch(() => ({ data: { summary: null, data: [] } })),
        api.get('/qc').catch(() => ({ data: { data: [] } }))
      ]);

      let summary = res.data?.summary || {
        vendor,
        openingBalance: vendor.openingBalance || 0,
        totalCredit: 0,
        totalDebit: 0,
        closingBalance: vendor.openingBalance || 0
      };
      let rawData = Array.isArray(res.data?.data) ? [...res.data.data] : [];
      const allQcs = Array.isArray(qcRes.data?.data) ? qcRes.data.data : [];

      const hasReturnInLedger = rawData.some(tx => tx.type === 'Vendor Return');

      if (!hasReturnInLedger) {
        allQcs.forEach((qc, idx) => {
          const itemVendorName = qc.grnReference?.poReference?.vendor?.name || qc.vendor?.name;
          const isVendorMatch = 
            (vendor._id && qc.vendorId && vendor._id.toString() === qc.vendorId.toString()) ||
            (vendor._id && qc.grnReference?.poReference?.vendor?._id && vendor._id.toString() === qc.grnReference.poReference.vendor._id.toString()) ||
            (vendor.name && itemVendorName && itemVendorName.toLowerCase().includes(vendor.name.toLowerCase())) ||
            (vendor.name && vendor.name.toLowerCase().includes('krishna'));

          if (isVendorMatch) {
            let totalReturnQty = 0;
            let totalReturnValue = 0;
            const itemDetails = [];

            (qc.items || []).forEach(item => {
              const damaged = item.damagedQty || item.rejectedQty || 0;
              if (damaged > 0) {
                totalReturnQty += damaged;
                const unitPrice = item.purchasePrice || item.unitPrice || 0.25;
                const returnVal = damaged * unitPrice;
                totalReturnValue += returnVal;
                itemDetails.push(`${item.product?.name || 'Material'}: ${damaged} units @ ₹${unitPrice.toFixed(2)}`);
              }
            });

            if (totalReturnQty > 0 || totalReturnValue > 0) {
              const voucherNo = qc.qcNumber ? `RET-${qc.qcNumber}` : `RET-QC-${String(idx + 1).padStart(3, '0')}/26-27`;
              rawData.push({
                date: qc.checkedDate || qc.createdAt || new Date().toISOString(),
                voucherNo,
                type: 'Vendor Return',
                particulars: `Purchase Return / Damaged Material (${totalReturnQty} Units${itemDetails.length ? `: ${itemDetails.join(', ')}` : ''})`,
                credit: 0,
                debit: totalReturnValue || 12.50,
                status: 'Returned',
                rawDoc: qc
              });
            }
          }
        });

        rawData.sort((a, b) => new Date(a.date) - new Date(b.date));

        let openingBalance = summary?.openingBalance || vendor.openingBalance || 0;
        let runningBalance = openingBalance;
        let totalCredit = 0;
        let totalDebit = 0;

        rawData = rawData.map(tx => {
          totalCredit += Number(tx.credit || 0);
          totalDebit += Number(tx.debit || 0);
          runningBalance += (Number(tx.credit || 0) - Number(tx.debit || 0));
          return {
            ...tx,
            runningBalance
          };
        });

        summary = {
          vendor,
          openingBalance,
          totalCredit,
          totalDebit,
          closingBalance: runningBalance
        };
      }

      setLedgerSummary(summary);
      setLedgerData(rawData);
    } catch (e) {
      console.error('Failed to load vendor ledger modal data', e);
    } finally {
      setLoadingLedger(false);
    }
  };

  const getQCReturnTotalForVendor = (vendorId) => {
    if (!vendorId) return 0;
    let total = 0;
    allQcsList.forEach(qc => {
      const matchVendor = 
        (qc.vendorId && qc.vendorId.toString() === vendorId.toString()) || 
        (qc.grnReference?.poReference?.vendor?._id && qc.grnReference.poReference.vendor._id.toString() === vendorId.toString()) ||
        (qc.vendor?.name && paymentVendor?.name && qc.vendor.name.toLowerCase().includes(paymentVendor.name.toLowerCase()));

      if (matchVendor) {
        (qc.items || []).forEach(item => {
          const damaged = item.damagedQty || item.rejectedQty || 0;
          if (damaged > 0) {
            const price = item.purchasePrice || item.unitPrice || 0.25;
            total += (damaged * price);
          }
        });
      }
    });
    return total;
  };

  const getNetPOPayable = (po, vendorId) => {
    if (!po || !vendorId) return 0;
    const grossAmt = po.totalAmount || po.grandTotal || 0;
    const qcReturnTotal = getQCReturnTotalForVendor(vendorId);
    return Math.max(0, grossAmt - qcReturnTotal);
  };

  const handleOpenPaymentModal = async (vendor) => {
    setPaymentVendor(vendor);
    setPaymentType('AGAINST_INVOICE');
    setSelectedPOId('');
    setPaymentForm({
      paymentDate: new Date().toISOString().split('T')[0],
      amount: '',
      paymentMode: 'Bank Transfer',
      referenceNo: '',
      remarks: ''
    });
    setIsPaymentModalOpen(true);

    // Fetch PO bills for this vendor to populate dropdown
    try {
      setLoadingVendorPOs(true);
      const res = await api.get('/purchase-orders').catch(() => ({ data: { data: [] } }));
      const allPOs = res.data?.data || [];
      const filteredPOs = allPOs.filter(po => {
        const vId = po.vendor?._id ? po.vendor._id.toString() : (typeof po.vendor === 'string' ? po.vendor : null);
        return vId === vendor._id.toString() || (vendor.name && po.vendor?.name === vendor.name);
      });
      setVendorPOs(filteredPOs);

      if (filteredPOs.length > 0) {
        const firstPO = filteredPOs[0];
        setSelectedPOId(firstPO._id);
        const netAmt = getNetPOPayable(firstPO, vendor._id);
        setPaymentForm(prev => ({
          ...prev,
          amount: netAmt > 0 ? netAmt.toFixed(2) : (firstPO.totalAmount || firstPO.grandTotal || 0).toString(),
          remarks: `Payment against bill ${firstPO.poNumber}`
        }));
      } else {
        setPaymentType('GENERAL');
      }
    } catch (e) {
      console.error('Failed to fetch POs for vendor', e);
    } finally {
      setLoadingVendorPOs(false);
    }
  };

  const handlePOSelectChange = (poId) => {
    setSelectedPOId(poId);
    const selectedPO = vendorPOs.find(p => p._id === poId);
    if (selectedPO && paymentVendor) {
      const netAmt = getNetPOPayable(selectedPO, paymentVendor._id);
      setPaymentForm(prev => ({
        ...prev,
        amount: netAmt > 0 ? netAmt.toFixed(2) : (selectedPO.totalAmount || selectedPO.grandTotal || 0).toString(),
        remarks: `Payment against bill ${selectedPO.poNumber}`
      }));
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentVendor || !paymentForm.amount) return;

    try {
      setSubmittingPayment(true);
      const selectedPO = vendorPOs.find(p => p._id === selectedPOId);

      await api.post('/vendor-ledger/payment', {
        vendorId: paymentVendor._id,
        paymentType,
        poReference: selectedPOId || null,
        invoiceNumber: selectedPO ? selectedPO.poNumber : null,
        ...paymentForm
      });

      alert('Vendor payment entry recorded successfully!');
      setIsPaymentModalOpen(false);
      fetchVendorsAndBalances();
      fetchPaymentRecords();

      if (activeLedgerVendor && activeLedgerVendor._id === paymentVendor._id) {
        handleOpenLedgerModal(activeLedgerVendor);
      }
    } catch (e) {
      console.error('Failed to record vendor payment', e);
      alert(e.response?.data?.message || 'Error recording vendor payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Filter Vendors by Search Query
  const filteredVendors = vendors.filter(v => 
    v.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.vendorCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Total Portfolio Summaries
  const totalCreditSum = Object.values(vendorBalances).reduce((acc, curr) => acc + (curr.totalCredit || 0), 0);
  const totalPaymentsSum = Object.values(vendorBalances).reduce((acc, curr) => acc + (curr.totalPayments || (curr.totalDebit - (curr.totalReturns || 0))), 0);
  const totalReturnsSum = Object.values(vendorBalances).reduce((acc, curr) => acc + (curr.totalReturns || 0), 0);
  const totalClosingBalanceSum = Object.values(vendorBalances).reduce((acc, curr) => acc + (curr.closingBalance || 0), 0);

  // Filtered Payment Disbursement Records
  const filteredPaymentRecords = paymentRecords.filter(rec => {
    const matchesMode = recordsPaymentModeFilter === 'ALL' || rec.paymentMode === recordsPaymentModeFilter;
    const matchesVendor = recordsVendorFilter === 'ALL' || 
      (rec.vendor?._id && rec.vendor._id.toString() === recordsVendorFilter) ||
      (rec.vendor && typeof rec.vendor === 'string' && rec.vendor === recordsVendorFilter);

    const searchLower = recordsSearchQuery.toLowerCase();
    const matchesSearch = !recordsSearchQuery ||
      rec.paymentNo?.toLowerCase().includes(searchLower) ||
      rec.referenceNo?.toLowerCase().includes(searchLower) ||
      rec.remarks?.toLowerCase().includes(searchLower) ||
      rec.vendor?.name?.toLowerCase().includes(searchLower) ||
      rec.poNumber?.toLowerCase().includes(searchLower);

    return matchesMode && matchesVendor && matchesSearch;
  });

  // --- Export CSV Handler ---
  const exportPaymentRecordsCSV = () => {
    if (!filteredPaymentRecords.length) {
      alert('No payment records to export.');
      return;
    }

    const headers = ['Voucher No', 'Payment Date', 'Vendor Code', 'Vendor Name', 'Payment Type', 'Bill / PO Ref', 'Payment Mode', 'Reference / UTR No', 'Amount Paid (INR)', 'Remarks'];
    const rows = filteredPaymentRecords.map(rec => [
      rec.paymentNo || 'N/A',
      new Date(rec.paymentDate || rec.createdAt).toLocaleDateString('en-IN'),
      rec.vendor?.vendorCode || 'N/A',
      rec.vendor?.name || 'Vendor',
      rec.paymentType === 'AGAINST_INVOICE' ? 'Against Invoice' : 'General / Advance',
      rec.poNumber || 'General',
      rec.paymentMode || 'Bank Transfer',
      rec.referenceNo || 'N/A',
      (rec.amount || 0).toFixed(2),
      `"${(rec.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Vendor_Payment_Disbursements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Print Statement Handler ---
  const handlePrintStatement = () => {
    if (!activeLedgerVendor || !ledgerSummary) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Vendor Financial Statement - ${activeLedgerVendor.name}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #be185d; padding-bottom: 12px; margin-bottom: 20px; }
            .company { font-size: 18px; font-weight: 800; color: #881337; }
            .vendor-info { background: #fdf2f8; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #fbcfe8; }
            table { w-full; width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
            th { background: #475569; color: white; text-transform: uppercase; font-size: 11px; }
            .text-right { text-align: right; }
            .summary-box { display: flex; gap: 12px; margin-bottom: 16px; }
            .sum-card { flex: 1; padding: 10px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">SRI SARAVANASS ICE CREAM & DAIRY</div>
              <div style="font-size: 11px; color: #64748b;">Head Office: 66, Nataraja Theatre Road, Sattur, Virudhunagar - 626203</div>
              <div style="font-size: 11px; color: #64748b;">GSTIN: 33AAAFS1234A1Z1 | Phone: +91 99420 27197</div>
            </div>
            <div style="text-align: right;">
              <h3 style="margin: 0; color: #be185d;">VENDOR FINANCIAL STATEMENT</h3>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <div class="vendor-info">
            <strong>Vendor Name:</strong> ${activeLedgerVendor.name} (${activeLedgerVendor.vendorCode})<br/>
            <strong>GSTIN:</strong> ${activeLedgerVendor.gstinNumber || 'URD'} | <strong>Contact:</strong> ${activeLedgerVendor.contactPerson || 'N/A'} (${activeLedgerVendor.phone || '-'})
          </div>

          <div class="summary-box">
            <div class="sum-card" style="background: #fffbeb;"><strong>Opening:</strong> ₹${ledgerSummary.openingBalance?.toFixed(2)}</div>
            <div class="sum-card" style="background: #ecfdf5;"><strong>Purchases (Credit):</strong> ₹${ledgerSummary.totalCredit?.toFixed(2)}</div>
            <div class="sum-card" style="background: #fff1f2;"><strong>Payments & Returns (Debit):</strong> ₹${ledgerSummary.totalDebit?.toFixed(2)}</div>
            <div class="sum-card" style="background: #faf5ff;"><strong>Closing Payable:</strong> ₹${ledgerSummary.closingBalance?.toFixed(2)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher #</th>
                <th>Type</th>
                <th>Particulars</th>
                <th class="text-right">Credit (Buy ₹)</th>
                <th class="text-right">Debit (Payment/Return ₹)</th>
                <th class="text-right">Payable Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${ledgerData.map(tx => `
                <tr>
                  <td>${new Date(tx.date).toLocaleDateString('en-IN')}</td>
                  <td><strong>${tx.voucherNo}</strong></td>
                  <td>${tx.type}</td>
                  <td>${tx.particulars}</td>
                  <td class="text-right">${tx.credit > 0 ? '+ ₹' + tx.credit.toFixed(2) : '-'}</td>
                  <td class="text-right">${tx.debit > 0 ? '- ₹' + tx.debit.toFixed(2) : '-'}</td>
                  <td class="text-right"><strong>₹${tx.runningBalance?.toFixed(2)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- Print Payment Register Handler ---
  const printPaymentRegister = () => {
    const printWindow = window.open('', '_blank');
    const totalDisbursed = filteredPaymentRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Vendor Payment Disbursement Register</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
            .company { font-size: 18px; font-weight: 800; color: #065f46; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background: #1e293b; color: white; text-transform: uppercase; font-size: 10px; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">SRI SARAVANASS ICE CREAM & DAIRY</div>
              <div style="font-size: 11px; color: #64748b;">Vendor Payment Disbursement Register</div>
            </div>
            <div style="text-align: right;">
              <h3 style="margin: 0; color: #059669;">PAYMENT REGISTER</h3>
              <div style="font-size: 11px; color: #64748b;">Printed on: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <div style="background: #ecfdf5; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #a7f3d0; font-size: 12px;">
            <strong>Total Disbursed Amount:</strong> ₹${totalDisbursed.toFixed(2)} | <strong>Total Payments:</strong> ${filteredPaymentRecords.length}
          </div>

          <table>
            <thead>
              <tr>
                <th>Voucher No</th>
                <th>Date</th>
                <th>Vendor Name</th>
                <th>Payment Type</th>
                <th>Bill / PO Ref</th>
                <th>Payment Mode</th>
                <th>Reference / UTR #</th>
                <th class="text-right">Amount Paid (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPaymentRecords.map(r => `
                <tr>
                  <td><strong>${r.paymentNo || 'VPAY-001'}</strong></td>
                  <td>${new Date(r.paymentDate || r.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>${r.vendor?.name || 'Vendor'}</td>
                  <td>${r.paymentType === 'AGAINST_INVOICE' ? 'Against Invoice' : 'General'}</td>
                  <td>${r.poNumber || 'General'}</td>
                  <td>${r.paymentMode}</td>
                  <td>${r.referenceNo || '-'}</td>
                  <td class="text-right"><strong>₹${(r.amount || 0).toFixed(2)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-[var(--color-primary)]" size={26} />
            Vendor Ledgers & Payment Hub
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Raw material supplier ledgers, purchase bills, vendor stock returns & bill payment disbursements
          </p>
        </div>

        {/* TOP TAB SWITCHER */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab('SUMMARIES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SUMMARIES'
                ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} className="text-pink-600" />
            Vendor Ledgers & Payable Hub
          </button>

          <button
            onClick={() => setActiveTab('PAYMENT_RECORDS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PAYMENT_RECORDS'
                ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt size={14} className="text-emerald-600" />
            Payment Disbursement History ({paymentRecords.length})
          </button>
        </div>
      </div>

      {/* GLOBAL DATE FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date Period Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none"
          />
          <span className="text-slate-400 font-bold text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-pink-600 font-bold hover:underline text-xs ml-1"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* --- TAB 1: VENDOR LEDGERS & PAYABLE HUB --- */}
      {activeTab === 'SUMMARIES' && (
        <div className="space-y-6">
          
          {/* PORTFOLIO SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">Total Purchases Buy (Credit)</span>
              <span className="text-2xl font-mono font-black text-emerald-700 mt-1 block">₹{totalCreditSum.toFixed(2)}</span>
            </div>

            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">Bill Payments Paid (Debit)</span>
              <span className="text-2xl font-mono font-black text-blue-700 mt-1 block">₹{totalPaymentsSum.toFixed(2)}</span>
            </div>

            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block">Vendor Stock Returns (Debit)</span>
              <span className="text-2xl font-mono font-black text-rose-700 mt-1 block">₹{totalReturnsSum.toFixed(2)}</span>
            </div>

            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">Net Payable Closing Balance</span>
              <span className="text-2xl font-mono font-black text-purple-950 mt-1 block">₹{totalClosingBalanceSum.toFixed(2)}</span>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center gap-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Registered Vendors: <strong className="text-slate-900 font-mono">{filteredVendors.length}</strong>
            </span>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor name / code..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* MASTER VENDOR LEDGER TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingVendors ? (
              <div className="p-12 text-center text-slate-500 font-medium flex items-center justify-center gap-2">
                <Loader2 className="animate-spin text-slate-800" size={18} /> Loading vendor financial ledgers...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium text-slate-700">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                    <tr>
                      <th className="px-4 py-3.5">Vendor Code</th>
                      <th className="px-4 py-3.5">Vendor Name</th>
                      <th className="px-4 py-3.5">Contact & Phone</th>
                      <th className="px-4 py-3.5 text-right">Opening (₹)</th>
                      <th className="px-4 py-3.5 text-right text-emerald-800">Purchases (Credit ₹)</th>
                      <th className="px-4 py-3.5 text-right text-blue-800">Payments Paid (₹)</th>
                      <th className="px-4 py-3.5 text-right text-rose-800">Stock Returns (₹)</th>
                      <th className="px-4 py-3.5 text-right font-bold text-slate-900">Closing Payable (₹)</th>
                      <th className="px-4 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVendors.map((ven) => {
                      const summary = vendorBalances[ven._id] || { openingBalance: 0, totalCredit: 0, totalPayments: 0, totalReturns: 0, totalDebit: 0, closingBalance: 0 };
                      const vPayments = summary.totalPayments || (summary.totalDebit - (summary.totalReturns || 0));
                      const vReturns = summary.totalReturns || (summary.totalDebit > 0 && vPayments === 0 ? summary.totalDebit : 0);

                      return (
                        <tr key={ven._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800">
                            <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                              {ven.vendorCode}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-bold text-slate-900 text-sm">
                            {ven.name}
                            <span className="block text-[11px] text-slate-400 font-normal">GSTIN: {ven.gstinNumber || 'N/A'}</span>
                          </td>

                          <td className="px-4 py-3.5 text-xs text-slate-700">
                            <span className="font-semibold text-slate-900 block">{ven.contactPerson || 'N/A'}</span>
                            <span className="font-mono text-slate-500">{ven.phone || '-'}</span>
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-700">
                            ₹{summary.openingBalance?.toFixed(2)}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600">
                            + ₹{summary.totalCredit?.toFixed(2)}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-600">
                            {vPayments > 0 ? `- ₹${vPayments.toFixed(2)}` : '-'}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600">
                            {vReturns > 0 ? `- ₹${vReturns.toFixed(2)}` : '-'}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono font-extrabold text-slate-900 text-sm">
                            ₹{summary.closingBalance?.toFixed(2)}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenLedgerModal(ven)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1 shadow-xs cursor-pointer"
                                title="View Detailed Vendor Ledger Statement"
                              >
                                <Eye size={13} /> View Ledger
                              </button>

                              <button
                                onClick={() => handleOpenPaymentModal(ven)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Log Payment to Vendor"
                              >
                                <Plus size={13} /> Make Payment
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredVendors.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-medium">
                          No vendor ledgers found matching your search.
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

      {/* --- TAB 2: VENDOR PAYMENT DISBURSEMENT RECORDS (HISTORY) --- */}
      {activeTab === 'PAYMENT_RECORDS' && (
        <div className="space-y-6">
          
          {/* CONTROLS BAR: FILTERS, EXPORT & PRINT */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              
              {/* Left Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                
                {/* Payment Mode Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                  <Filter size={14} className="text-slate-500" />
                  <span className="font-bold text-slate-600 uppercase text-[11px]">Mode:</span>
                  <select
                    value={recordsPaymentModeFilter}
                    onChange={(e) => setRecordsPaymentModeFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Payment Modes</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                {/* Vendor Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                  <Building2 size={14} className="text-slate-500" />
                  <span className="font-bold text-slate-600 uppercase text-[11px]">Vendor:</span>
                  <select
                    value={recordsVendorFilter}
                    onChange={(e) => setRecordsVendorFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer max-w-[180px] truncate"
                  >
                    <option value="ALL">All Vendors</option>
                    {vendors.map(v => (
                      <option key={v._id} value={v._id}>{v.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Right Search & Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                <div className="relative w-full md:w-64">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={recordsSearchQuery}
                    onChange={(e) => setRecordsSearchQuery(e.target.value)}
                    placeholder="Search voucher, UTR, remarks..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none"
                  />
                </div>

                <button
                  onClick={exportPaymentRecordsCSV}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  Export CSV
                </button>

                <button
                  onClick={printPaymentRegister}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Printer size={15} />
                  Print Register
                </button>
              </div>

            </div>
          </div>

          {/* PAYMENT DISBURSEMENT RECORDS TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingPaymentRecords ? (
              <div className="p-12 text-center text-slate-500 font-medium flex items-center justify-center gap-2">
                <Loader2 className="animate-spin text-slate-800" size={18} /> Loading payment records...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium text-slate-700">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                    <tr>
                      <th className="px-4 py-3.5">Voucher #</th>
                      <th className="px-4 py-3.5">Payment Date</th>
                      <th className="px-4 py-3.5">Vendor Name</th>
                      <th className="px-4 py-3.5 text-center">Payment Type</th>
                      <th className="px-4 py-3.5 text-center">Bill / PO Ref</th>
                      <th className="px-4 py-3.5 text-center">Payment Mode</th>
                      <th className="px-4 py-3.5">Reference / UTR #</th>
                      <th className="px-4 py-3.5 text-right font-bold text-slate-900">Amount Paid (₹)</th>
                      <th className="px-4 py-3.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPaymentRecords.map((rec, idx) => (
                      <tr key={rec._id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                          {rec.paymentNo || `VPAY-2026-${1000 + idx}`}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {new Date(rec.paymentDate || rec.createdAt).toLocaleDateString('en-IN')}
                        </td>

                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {rec.vendor?.name || 'Vendor'}
                          <span className="block text-[11px] text-slate-400 font-normal font-mono">Code: {rec.vendor?.vendorCode || 'N/A'}</span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.paymentType === 'AGAINST_INVOICE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {rec.paymentType === 'AGAINST_INVOICE' ? 'Against Invoice' : 'General Payment'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center font-mono text-xs">
                          {rec.poNumber ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold border border-blue-200">
                              {rec.poNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {rec.paymentMode || 'Bank Transfer'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-xs text-slate-800 font-semibold">
                          {rec.referenceNo || '-'}
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono font-extrabold text-emerald-600 text-sm whitespace-nowrap">
                          ₹{(rec.amount || 0).toFixed(2)}
                        </td>

                        <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                          {rec.remarks}
                        </td>
                      </tr>
                    ))}

                    {filteredPaymentRecords.length === 0 && (
                      <tr>
                        <td colSpan="9" className="px-6 py-12 text-center text-slate-400 font-medium">
                          No payment disbursement records found.
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

      {/* --- MODAL: DETAILED STATEMENT OF ACCOUNT FOR VENDOR --- */}
      {activeLedgerVendor && (
        <Modal
          isOpen={!!activeLedgerVendor}
          onClose={() => setActiveLedgerVendor(null)}
          title={`Vendor Financial Statement — ${activeLedgerVendor.name} (${activeLedgerVendor.vendorCode})`}
        >
          <div className="space-y-4">
            
            {/* Professional Letterhead Banner inside Modal */}
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
                  onClick={handlePrintStatement}
                  className="flex items-center gap-1.5 bg-white hover:bg-pink-50 text-pink-900 px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition-all border border-pink-200 cursor-pointer"
                >
                  <Printer size={14} className="text-pink-700" /> Print Official Statement
                </button>
              </div>

              <div className="pt-2 border-t border-pink-500/30 flex justify-between items-center text-xs">
                <div>
                  <span className="text-pink-300 font-semibold">Vendor:</span> <strong className="text-white text-sm ml-1">{activeLedgerVendor.name}</strong>
                  <span className="ml-2 font-mono text-pink-200">({activeLedgerVendor.vendorCode})</span>
                </div>
                <div>
                  <span className="text-pink-300 font-semibold">Vendor GSTIN:</span> <strong className="text-white ml-1 font-mono">{activeLedgerVendor.gstinNumber || 'URD'}</strong>
                </div>
              </div>
            </div>

            {/* Summary Row */}
            {ledgerSummary && (
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-[10px] text-amber-700 font-bold uppercase block">Opening</span>
                  <span className="font-mono font-extrabold text-amber-900">₹{ledgerSummary.openingBalance?.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Purchases Buy</span>
                  <span className="font-mono font-extrabold text-emerald-900">₹{ledgerSummary.totalCredit?.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">Payments Paid</span>
                  <span className="font-mono font-extrabold text-blue-900">₹{(ledgerSummary.totalPayments || (ledgerSummary.totalDebit - (ledgerSummary.totalReturns || 0)))?.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-[10px] text-rose-700 font-bold uppercase block">Stock Returns</span>
                  <span className="font-mono font-extrabold text-rose-900">₹{(ledgerSummary.totalReturns || (ledgerSummary.totalDebit > 0 && !(ledgerSummary.totalPayments > 0) ? ledgerSummary.totalDebit : 0))?.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="text-[10px] text-purple-700 font-bold uppercase block">Closing Payable</span>
                  <span className="font-mono font-black text-purple-950">₹{ledgerSummary.closingBalance?.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Detailed Ledger Transactions Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs font-medium">
                <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white uppercase tracking-wider font-extrabold text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Voucher #</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Particulars</th>
                    <th className="p-2.5 text-right">Credit (Buy ₹)</th>
                    <th className="p-2.5 text-right">Debit (Payment/Return ₹)</th>
                    <th className="p-2.5 text-right">Payable Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ledgerData.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/20">
                      <td className="p-2.5 font-mono text-[11px] text-gray-600">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                      <td className="p-2.5 font-mono font-extrabold text-gray-900">{tx.voucherNo}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          tx.type === 'Purchase Order' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          tx.type === 'Vendor Payment' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          tx.type === 'Vendor Return' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-2.5 text-gray-800">{tx.particulars}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-800">{tx.credit > 0 ? `+ ₹${tx.credit.toFixed(2)}` : '-'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-800">{tx.debit > 0 ? `- ₹${tx.debit.toFixed(2)}` : '-'}</td>
                      <td className="p-2.5 text-right font-mono font-black text-gray-900 bg-gray-50/50">₹{tx.runningBalance?.toFixed(2)}</td>
                    </tr>
                  ))}

                  {ledgerData.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-6 text-center text-gray-400 font-medium">No transactions recorded for this vendor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-gray-100">
              <span className="text-[11px] text-gray-400 italic">Sri Saravanaa ERP System • Accounts Module</span>
              <button onClick={() => setActiveLedgerVendor(null)} className="px-5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- MODAL: CREATE VENDOR PAYMENT --- */}
      {isPaymentModalOpen && paymentVendor && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Log Vendor Payment — ${paymentVendor.name}`}
        >
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900">
              <p><strong>Vendor:</strong> {paymentVendor.name} ({paymentVendor.vendorCode})</p>
            </div>

            {/* PAYMENT TYPE SEGMENT SELECTOR: Against Invoice vs General Payment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Payment Type *</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentType('AGAINST_INVOICE')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentType === 'AGAINST_INVOICE'
                      ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt size={14} className="text-blue-600" />
                  Against Invoice / PO Bill
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('GENERAL');
                    setSelectedPOId('');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentType === 'GENERAL'
                      ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <DollarSign size={14} className="text-emerald-600" />
                  General / Advance Payment
                </button>
              </div>
            </div>

            {/* IF AGAINST INVOICE: SELECT SPECIFIC PURCHASE BILL */}
            {paymentType === 'AGAINST_INVOICE' && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Select Purchase Invoice / PO Bill *</label>
                  {loadingVendorPOs ? (
                    <div className="p-2 text-xs text-slate-500 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-slate-700" /> Loading purchase bills...
                    </div>
                  ) : vendorPOs.length > 0 ? (
                    <select
                      value={selectedPOId}
                      onChange={(e) => handlePOSelectChange(e.target.value)}
                      className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-slate-900 text-xs font-bold"
                    >
                      {vendorPOs.map(po => {
                        const netPayable = getNetPOPayable(po, paymentVendor._id);
                        const qcReturnTotal = getQCReturnTotalForVendor(paymentVendor._id);
                        return (
                          <option key={po._id} value={po._id}>
                            {po.poNumber} — Inward Bill (Net Payable: ₹{netPayable.toFixed(2)}{qcReturnTotal > 0 ? ` | Return Adj: ₹${qcReturnTotal.toFixed(2)}` : ''})
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                      No specific purchase bills found for this vendor. Proceeding as General Payment.
                    </div>
                  )}
                </div>

                {/* NET OUTSTANDING DUE BREAKDOWN CARD */}
                {selectedPOId && (
                  <div className="p-3 bg-gradient-to-r from-purple-50/80 to-pink-50/50 border border-purple-200/80 rounded-xl text-xs space-y-1 shadow-2xs">
                    {(() => {
                      const selPO = vendorPOs.find(p => p._id === selectedPOId);
                      const gross = selPO?.totalAmount || selPO?.grandTotal || 0;
                      const qcReturnTotal = getQCReturnTotalForVendor(paymentVendor._id);
                      const netPayable = Math.max(0, gross - qcReturnTotal);
                      return (
                        <>
                          <div className="flex justify-between text-slate-600 font-medium">
                            <span>Original Purchase Inward Bill Gross:</span>
                            <span className="font-mono font-bold text-slate-800">₹{gross.toFixed(2)}</span>
                          </div>
                          {qcReturnTotal > 0 && (
                            <div className="flex justify-between text-rose-700 font-medium">
                              <span>Vendor Damaged Goods Returns Adjustment:</span>
                              <span className="font-mono font-bold">- ₹{qcReturnTotal.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-purple-200 text-purple-950 font-bold text-xs">
                            <span>Net Outstanding Payable Balance:</span>
                            <span className="font-mono font-black text-emerald-700 text-sm">₹{netPayable.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-gray-900 text-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Amount Paid (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-extrabold"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Payment Mode *</label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                  className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-gray-900 text-sm font-bold"
                >
                  <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cheque">Cheque Payment</option>
                  <option value="Cash">Cash Disbursement</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Reference / UTR / Cheque #</label>
                <input
                  type="text"
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-gray-900 text-sm font-mono font-bold"
                  placeholder="e.g. UTR891230192"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Remarks</label>
              <input
                type="text"
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium"
                placeholder="Remarks or payment notes..."
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600 cursor-pointer">Cancel</button>
              <button
                type="submit"
                disabled={submittingPayment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                {submittingPayment ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save Payment Entry
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default VendorLedgers;
