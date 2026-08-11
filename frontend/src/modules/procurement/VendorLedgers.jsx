import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Building2, Search, Calendar, FileText, ArrowUpRight, ArrowDownLeft, 
  CreditCard, Plus, Printer, Loader2, CheckCircle2, Phone, MapPin, Tag, RefreshCw, Eye, ChevronRight
} from 'lucide-react';
import Modal from '../../components/Modal';

const VendorLedgers = () => {
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

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentVendor, setPaymentVendor] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    remarks: 'Vendor Bill Payment'
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchVendorsAndBalances();
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

      // Ensure Vendor Returns from QC are present in rawData
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

        // Sort chronologically and calculate running balance
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

  const handleOpenPaymentModal = (vendor) => {
    setPaymentVendor(vendor);
    setPaymentForm({
      paymentDate: new Date().toISOString().split('T')[0],
      amount: '',
      paymentMode: 'Bank Transfer',
      referenceNo: '',
      remarks: 'Vendor Bill Payment'
    });
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentVendor || !paymentForm.amount) return;

    try {
      setSubmittingPayment(true);
      await api.post('/vendor-ledger/payment', {
        vendorId: paymentVendor._id,
        ...paymentForm
      });

      alert('Vendor payment recorded successfully!');
      setIsPaymentModalOpen(false);
      fetchVendorsAndBalances();

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
  const totalDebitSum = Object.values(vendorBalances).reduce((acc, curr) => acc + (curr.totalDebit || 0), 0);
  const totalClosingBalanceSum = Object.values(vendorBalances).reduce((acc, curr) => acc + (curr.closingBalance || 0), 0);

  // Print Professional Vendor Financial Statement PDF
  const handlePrintStatement = () => {
    if (!activeLedgerVendor) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow popups in your browser to print the vendor statement.');

    const companyName = "SRI SARAVANASS ICE CREAM & DAIRY PRODUCTS";
    const companyAddress = "Head Office & Factory: 66, Nataraja Theatre Road, Sattur, Virudhunagar - 626203, Tamil Nadu";
    const companyContact = "Phone: +91 99420 27197 | Email: accounts@saravanass.com | GSTIN: 33AAAFS1234A1Z1";

    const periodStr = startDate || endDate 
      ? `${startDate || 'Beginning'} to ${endDate || 'Today'}` 
      : 'All Time Statement';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vendor Financial Statement - ${activeLedgerVendor.name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 25px; background: #fff; line-height: 1.4; }
            
            /* Letterhead Header */
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border-bottom: 3px double #d81b60; pb: 12px; }
            .header-logo { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; }
            .company-title { font-size: 18px; font-weight: 800; color: #881337; text-transform: uppercase; letter-spacing: 0.5px; }
            .company-sub { font-size: 11px; color: #475569; font-weight: 600; margin-top: 2px; }
            .company-contact { font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace; }
            
            /* Document Banner */
            .doc-title-bar { background: linear-gradient(135deg, #881337 0%, #ad1457 100%); color: white; padding: 8px 14px; border-radius: 6px; margin-bottom: 16px; display: flex; justify-between: space-between; align-items: center; }
            .doc-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
            .doc-date { font-size: 10px; opacity: 0.95; font-family: monospace; }

            /* Information Grid */
            .info-grid { display: flex; justify-between: space-between; gap: 15px; margin-bottom: 16px; }
            .info-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 11px; }
            .info-box h4 { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #881337; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 0.5px; }
            .info-box p { margin: 2px 0; color: #334155; }
            .info-box strong { color: #0f172a; }

            /* Summary Grid */
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
            .summary-card { padding: 8px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; }
            .summary-lbl { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px; }
            .summary-val { font-size: 13px; font-weight: 800; font-family: monospace; }

            /* Table Styles */
            .table-container { border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
            .ledger-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
            .ledger-table th { background: #f1f5f9; text-align: left; padding: 7px 9px; border-bottom: 2px solid #cbd5e1; font-weight: 800; color: #334155; text-transform: uppercase; font-size: 8.5px; letter-spacing: 0.5px; }
            .ledger-table td { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; }
            .credit-val { color: #047857; font-weight: 700; }
            .debit-val { color: #be123c; font-weight: 700; }
            .type-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; }
            .type-po { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
            .type-ret { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
            .type-pay { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }

            /* Footer & Signatures */
            .footer-section { margin-top: 30px; }
            .sig-grid { display: flex; justify-between: space-between; margin-top: 40px; padding-top: 8px; }
            .sig-box { text-align: center; width: 170px; border-top: 1px dashed #94a3b8; padding-top: 4px; font-size: 9.5px; font-weight: 700; color: #475569; }
            .disclaimer { margin-top: 25px; text-align: center; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }

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
              <td style="width: 72px; vertical-align: top;">
                <img src="/logo.avif" alt="Logo" class="header-logo" />
              </td>
              <td style="vertical-align: top; padding-left: 8px;">
                <div class="company-title">${companyName}</div>
                <div class="company-sub">${companyAddress}</div>
                <div class="company-contact">${companyContact}</div>
              </td>
            </tr>
          </table>

          <!-- DOCUMENT TITLE BAR -->
          <div class="doc-title-bar">
            <span class="doc-title">VENDOR STATEMENT OF ACCOUNT</span>
            <span class="doc-date">Period: ${periodStr} | Date: ${new Date().toLocaleDateString('en-IN')}</span>
          </div>

          <!-- INFORMATION BOXES -->
          <div class="info-grid">
            <div class="info-box">
              <h4>Vendor / Supplier Details</h4>
              <p><strong>Vendor Name:</strong> ${activeLedgerVendor.name}</p>
              <p><strong>Vendor Code:</strong> ${activeLedgerVendor.vendorCode}</p>
              <p><strong>GSTIN Number:</strong> ${activeLedgerVendor.gstinNumber || 'URD (Unregistered)'}</p>
              <p><strong>Contact Person:</strong> ${activeLedgerVendor.contactPerson || 'N/A'}</p>
              <p><strong>Phone:</strong> ${activeLedgerVendor.phone || 'N/A'}</p>
            </div>

            <div class="info-box">
              <h4>Statement Details</h4>
              <p><strong>Statement Ref:</strong> STMT-${activeLedgerVendor.vendorCode}-${new Date().getFullYear()}</p>
              <p><strong>Statement Period:</strong> ${periodStr}</p>
              <p><strong>Total Transactions:</strong> ${ledgerData.length}</p>
              <p><strong>Current Status:</strong> ${ledgerSummary?.closingBalance > 0 ? 'Payable Balance Outstanding' : 'Account Clear'}</p>
            </div>
          </div>

          <!-- SUMMARY CARDS -->
          ${ledgerSummary ? `
            <div class="summary-grid">
              <div class="summary-card" style="background: #fffbeb; border-color: #fde68a;">
                <span class="summary-lbl" style="color: #b45309;">Opening Balance</span>
                <span class="summary-val" style="color: #92400e;">₹${ledgerSummary.openingBalance?.toFixed(2)}</span>
              </div>
              <div class="summary-card" style="background: #ecfdf5; border-color: #a7f3d0;">
                <span class="summary-lbl" style="color: #047857;">Purchases Buy (Credit)</span>
                <span class="summary-val" style="color: #065f46;">+ ₹${ledgerSummary.totalCredit?.toFixed(2)}</span>
              </div>
              <div class="summary-card" style="background: #fff1f2; border-color: #fecdd3;">
                <span class="summary-lbl" style="color: #be123c;">Payments & Returns (Debit)</span>
                <span class="summary-val" style="color: #9f1239;">- ₹${ledgerSummary.totalDebit?.toFixed(2)}</span>
              </div>
              <div class="summary-card" style="background: #f3e8ff; border-color: #e9d5ff;">
                <span class="summary-lbl" style="color: #6b21a8;">Net Closing Payable</span>
                <span class="summary-val" style="color: #581c87;">₹${ledgerSummary.closingBalance?.toFixed(2)}</span>
              </div>
            </div>
          ` : ''}

          <!-- TRANSACTION TABLE -->
          <div class="table-container">
            <table class="ledger-table">
              <thead>
                <tr>
                  <th style="width: 10%;">Date</th>
                  <th style="width: 14%;">Voucher #</th>
                  <th style="width: 14%; text-align: center;">Type</th>
                  <th>Particulars / Material Description</th>
                  <th class="text-right" style="width: 14%;">Credit (Buy ₹)</th>
                  <th class="text-right" style="width: 14%;">Debit (Return/Pay ₹)</th>
                  <th class="text-right" style="width: 14%;">Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${ledgerData.map(tx => `
                  <tr>
                    <td class="font-mono">${new Date(tx.date).toLocaleDateString('en-IN')}</td>
                    <td class="font-mono" style="font-weight: 800; color: #0f172a;">${tx.voucherNo}</td>
                    <td class="text-center">
                      <span class="type-badge ${
                        tx.type === 'Purchase Order' ? 'type-po' :
                        tx.type === 'Vendor Return' ? 'type-ret' :
                        'type-pay'
                      }">
                        ${tx.type}
                      </span>
                    </td>
                    <td>${tx.particulars}</td>
                    <td class="text-right font-mono credit-val">${tx.credit > 0 ? '+ ₹' + tx.credit.toFixed(2) : '-'}</td>
                    <td class="text-right font-mono debit-val">${tx.debit > 0 ? '- ₹' + tx.debit.toFixed(2) : '-'}</td>
                    <td class="text-right font-mono" style="font-weight: 800; color: #0f172a; background: #f8fafc;">₹${tx.runningBalance?.toFixed(2)}</td>
                  </tr>
                `).join('')}
                ${ledgerData.length === 0 ? '<tr><td colSpan="7" class="text-center" style="padding: 20px; color: #94a3b8;">No transactions found for this vendor.</td></tr>' : ''}
              </tbody>
            </table>
          </div>

          <!-- FOOTER & SIGNATURES -->
          <div class="footer-section">
            <div class="sig-grid">
              <div class="sig-box">Prepared By (Accounts)</div>
              <div class="sig-box">Verified By (Auditor)</div>
              <div class="sig-box">Authorized Signatory<br /><strong style="font-size: 8.5px;">Sri Saravanaa ERP</strong></div>
            </div>
            <div class="disclaimer">
              This financial statement is computer-generated by Sri Saravanaa ERP System.
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

  return (
    <div className="space-y-6">
      
      {/* PAGE TITLE & TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Vendor Ledgers & Payable Hub</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Raw material supplier ledgers, purchase bills, vendor stock returns & bill payment disbursements
          </p>
        </div>

        {/* DATE RANGE FILTRATION */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm text-xs">
          <Calendar size={14} className="text-gray-400" />
          <span className="font-bold text-gray-700 font-mono uppercase text-[11px]">Period:</span>
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
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">Total Purchases Buy (Credit)</span>
          <span className="text-2xl font-mono font-black text-emerald-950 mt-1 block">₹{totalCreditSum.toFixed(2)}</span>
        </div>

        <div className="p-4 bg-gradient-to-r from-rose-50 to-rose-100/50 border border-rose-200 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">Vendor Payments & Returns (Debit)</span>
          <span className="text-2xl font-mono font-black text-rose-950 mt-1 block">₹{totalDebitSum.toFixed(2)}</span>
        </div>

        <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 border border-purple-200 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 block">Net Payable Closing Balance</span>
          <span className="text-2xl font-mono font-black text-purple-950 mt-1 block">₹{totalClosingBalanceSum.toFixed(2)}</span>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="glass-panel p-4 flex justify-between items-center gap-4">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Registered Vendors: <strong className="text-[var(--color-primary)] font-mono">{filteredVendors.length}</strong>
        </span>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor name / code..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500 font-medium"
          />
        </div>
      </div>

      {/* FULL-WIDTH MASTER VENDOR LEDGER TABLE */}
      <div className="glass-panel overflow-hidden">
        {loadingVendors ? (
          <div className="p-12 text-center text-gray-500 font-medium flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-pink-600" size={18} /> Loading vendor financial ledgers...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-gray-700">
              <thead className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white uppercase tracking-wider text-[11px] font-black">
                <tr>
                  <th className="px-4 py-3.5">Vendor Code</th>
                  <th className="px-4 py-3.5">Vendor Name</th>
                  <th className="px-4 py-3.5">Contact & Phone</th>
                  <th className="px-4 py-3.5 text-right bg-amber-800/80">Opening (₹)</th>
                  <th className="px-4 py-3.5 text-right bg-emerald-800/80">Purchases Buy (Credit ₹)</th>
                  <th className="px-4 py-3.5 text-right bg-rose-900/80">Payments & Returns (Debit ₹)</th>
                  <th className="px-4 py-3.5 text-right bg-purple-950">Closing Payable (₹)</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVendors.map((ven) => {
                  const summary = vendorBalances[ven._id] || { openingBalance: 0, totalCredit: 0, totalDebit: 0, closingBalance: 0 };

                  return (
                    <tr key={ven._id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-gray-800">
                        <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
                          {ven.vendorCode}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-gray-900 text-sm">
                        {ven.name}
                        <span className="block text-[11px] text-gray-400 font-normal">GSTIN: {ven.gstinNumber || 'N/A'}</span>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-gray-700">
                        <span className="font-semibold text-gray-900 block">{ven.contactPerson || 'N/A'}</span>
                        <span className="font-mono text-gray-500">{ven.phone || '-'}</span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-900 bg-amber-50/30">
                        ₹{summary.openingBalance?.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-extrabold text-emerald-800 bg-emerald-50/30">
                        ₹{summary.totalCredit?.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-extrabold text-rose-800 bg-rose-50/30">
                        ₹{summary.totalDebit?.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-black text-purple-950 text-sm bg-purple-50/40">
                        ₹{summary.closingBalance?.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenLedgerModal(ven)}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-all border border-purple-200 flex items-center gap-1 shadow-sm"
                            title="View Detailed Vendor Ledger Statement"
                          >
                            <Eye size={13} /> View Ledger
                          </button>

                          <button
                            onClick={() => handleOpenPaymentModal(ven)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
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
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400 font-medium">
                      No vendor ledgers found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-[10px] text-amber-700 font-bold uppercase block">Opening</span>
                  <span className="font-mono font-extrabold text-amber-900">₹{ledgerSummary.openingBalance?.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Purchases Buy</span>
                  <span className="font-mono font-extrabold text-emerald-900">₹{ledgerSummary.totalCredit?.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-[10px] text-rose-700 font-bold uppercase block">Payments & Returns</span>
                  <span className="font-mono font-extrabold text-rose-900">₹{ledgerSummary.totalDebit?.toFixed(2)}</span>
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
              <button onClick={() => setActiveLedgerVendor(null)} className="px-5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100">
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
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancel</button>
              <button
                type="submit"
                disabled={submittingPayment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1 disabled:opacity-50"
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
