const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');
const QualityControl = require('../models/QualityControl');
const VendorPayment = require('../models/VendorPayment');

// @desc    Get Vendor Financial Ledger Statement with Running Balance
// @route   GET /api/v1/vendor-ledger/:vendorId
exports.getVendorLedger = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { startDate, endDate } = req.query;

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
        }

        // 1. Fetch Purchase Orders / Bills for Vendor
        const poQuery = { vendor: vendorId };
        if (startDate || endDate) poQuery.createdAt = dateFilter;
        const purchaseOrders = await PurchaseOrder.find(poQuery).sort({ createdAt: 1 });

        // 2. Fetch QC / Quality Checks for Vendor (Approved / Rejected)
        const qcQuery = { vendor: vendorId };
        if (startDate || endDate) qcQuery.createdAt = dateFilter;
        const qcEntries = await QualityControl.find(qcQuery).sort({ createdAt: 1 });

        // 3. Fetch Vendor Payments Paid
        const payQuery = { vendor: vendorId };
        if (startDate || endDate) payQuery.paymentDate = dateFilter;
        const payments = await VendorPayment.find(payQuery).sort({ paymentDate: 1 });

        // 4. Combine into chronological Ledger Entries
        const ledgerTransactions = [];

        // Purchase Orders Inward / Purchases
        purchaseOrders.forEach(po => {
            ledgerTransactions.push({
                date: po.createdAt,
                voucherNo: po.poNumber,
                type: 'Purchase Order',
                particulars: `Purchase Inward Bill (${po.items?.length || 0} Raw Materials)`,
                credit: po.grandTotal || 0, // Purchases increase payable amount to vendor
                debit: 0,
                status: po.status,
                rawDoc: po
            });
        });

        // QC Checks & Vendor Returns
        qcEntries.forEach(qc => {
            if (qc.qcStatus === 'Rejected' || qc.rejectedQuantity > 0) {
                const returnVal = (qc.rejectedQuantity || 0) * (qc.unitPrice || 10);
                ledgerTransactions.push({
                    date: qc.qcDate || qc.createdAt,
                    voucherNo: `VRET-${qc._id.toString().substring(18)}`,
                    type: 'Vendor Return',
                    particulars: `Purchase Return / Rejected Material (${qc.rejectedQuantity} Units)`,
                    credit: 0,
                    debit: returnVal, // Returns reduce payable amount
                    status: 'Returned',
                    rawDoc: qc
                });
            }
        });

        // Vendor Payments Paid
        payments.forEach(vp => {
            ledgerTransactions.push({
                date: vp.paymentDate,
                voucherNo: vp.paymentNo,
                type: 'Vendor Payment',
                particulars: `Payment Paid via ${vp.paymentMode} ${vp.referenceNo ? `(Ref: ${vp.referenceNo})` : ''} — ${vp.remarks || ''}`,
                credit: 0,
                debit: vp.amount || 0, // Payments reduce payable amount
                status: 'Paid',
                rawDoc: vp
            });
        });

        // Sort chronologically by date
        ledgerTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate Running Payable Balance
        let openingBalance = vendor.openingBalance || 0;
        let runningBalance = openingBalance;
        let totalCredit = 0; // Total Purchases
        let totalDebit = 0;  // Total Payments & Returns

        const ledgerWithBalance = ledgerTransactions.map(tx => {
            totalCredit += tx.credit;
            totalDebit += tx.debit;
            runningBalance += (tx.credit - tx.debit);
            return {
                ...tx,
                runningBalance
            };
        });

        const summary = {
            vendor,
            openingBalance,
            totalCredit,
            totalDebit,
            closingBalance: runningBalance
        };

        res.json({
            success: true,
            summary,
            data: ledgerWithBalance
        });

    } catch (error) {
        console.error('Error fetching vendor ledger:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get All Vendors Financial Summaries in a single fast call
// @route   GET /api/v1/vendor-ledger/summaries/all
exports.getAllVendorSummaries = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const vendors = await Vendor.find().lean();

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
        }

        const poQuery = startDate || endDate ? { createdAt: dateFilter } : {};
        const payQuery = startDate || endDate ? { paymentDate: dateFilter } : {};
        const qcQuery = startDate || endDate ? { createdAt: dateFilter } : {};

        const [purchaseOrders, payments, qcEntries] = await Promise.all([
            PurchaseOrder.find(poQuery).lean(),
            VendorPayment.find(payQuery).lean(),
            QualityControl.find(qcQuery).lean()
        ]);

        const summariesMap = {};

        vendors.forEach(v => {
            summariesMap[v._id.toString()] = {
                openingBalance: v.openingBalance || 0,
                totalCredit: 0,
                totalDebit: 0,
                closingBalance: v.openingBalance || 0
            };
        });

        purchaseOrders.forEach(po => {
            const vId = po.vendor?.toString();
            if (vId && summariesMap[vId]) {
                summariesMap[vId].totalCredit += (po.grandTotal || 0);
            }
        });

        payments.forEach(vp => {
            const vId = vp.vendor?.toString();
            if (vId && summariesMap[vId]) {
                summariesMap[vId].totalDebit += (vp.amount || 0);
            }
        });

        qcEntries.forEach(qc => {
            const vId = qc.vendor?.toString();
            if (vId && summariesMap[vId] && (qc.qcStatus === 'Rejected' || qc.rejectedQuantity > 0)) {
                const returnVal = (qc.rejectedQuantity || 0) * (qc.unitPrice || 10);
                summariesMap[vId].totalDebit += returnVal;
            }
        });

        // Compute closing balance
        Object.keys(summariesMap).forEach(vId => {
            const s = summariesMap[vId];
            s.closingBalance = s.openingBalance + s.totalCredit - s.totalDebit;
        });

        res.json({ success: true, data: summariesMap });
    } catch (error) {
        console.error('Error fetching all vendor summaries:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create Vendor Payment Entry
// @route   POST /api/v1/vendor-ledger/payment
exports.createVendorPayment = async (req, res) => {
    try {
        const { vendorId, paymentDate, amount, paymentMode, referenceNo, remarks } = req.body;

        if (!vendorId || !amount) {
            return res.status(400).json({ success: false, message: 'Vendor and Amount are required.' });
        }

        const count = await VendorPayment.countDocuments();
        const paymentNo = `VPAY-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1001).toString()}`;

        const payment = await VendorPayment.create({
            paymentNo,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            vendor: vendorId,
            amount: parseFloat(amount),
            paymentMode: paymentMode || 'Bank Transfer',
            referenceNo: referenceNo || '',
            remarks: remarks || 'Vendor Bill Payment Paid',
            createdBy: req.user?._id || '6a5ec376b44299bf18d9e800'
        });

        const populated = await VendorPayment.findById(payment._id).populate('vendor');

        res.status(201).json({ success: true, data: populated });
    } catch (error) {
        console.error('Error creating vendor payment:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};
