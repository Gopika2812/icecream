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

      const [vRes, bRes] = await Promise.all([
        api.get('/vendors'),
        api.get(url)
      ]);

      setVendors(vRes.data.data || []);
      setVendorBalances(bRes.data.data || {});
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

      const res = await api.get(url);
      setLedgerSummary(res.data.summary || null);
      setLedgerData(res.data.data || []);
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
            
            {/* Vendor Details Banner */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs flex justify-between items-center">
              <div>
                <p><strong>Vendor Name:</strong> {activeLedgerVendor.name}</p>
                <p className="mt-0.5"><strong>GSTIN:</strong> {activeLedgerVendor.gstinNumber || 'N/A'}</p>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 bg-white border border-purple-300 hover:bg-purple-100 text-purple-900 px-3 py-1.5 rounded-lg font-bold text-xs"
              >
                <Printer size={13} /> Print Vendor Statement
              </button>
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
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-xs font-medium">
                <thead className="bg-gray-100 text-gray-700 uppercase tracking-wider font-extrabold text-[10px] sticky top-0">
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
                      <td className="p-2.5 font-mono text-[11px] text-gray-600">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="p-2.5 font-mono font-extrabold text-gray-900">{tx.voucherNo}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          tx.type === 'Purchase Order' ? 'bg-emerald-100 text-emerald-800' :
                          tx.type === 'Vendor Payment' ? 'bg-blue-100 text-blue-800' :
                          tx.type === 'Vendor Return' ? 'bg-rose-100 text-rose-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-2.5 text-gray-800">{tx.particulars}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-800">{tx.credit > 0 ? `₹${tx.credit.toFixed(2)}` : '-'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-800">{tx.debit > 0 ? `₹${tx.debit.toFixed(2)}` : '-'}</td>
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

            <div className="pt-2 flex justify-end">
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
