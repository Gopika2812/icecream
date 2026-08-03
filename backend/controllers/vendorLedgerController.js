const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');
const GRN = require('../models/GRN');
const QualityControl = require('../models/QualityControl');
const VendorPayment = require('../models/VendorPayment');
const Product = require('../models/Product');

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
        const allQCs = await QualityControl.find()
            .populate({
                path: 'grnReference',
                populate: {
                    path: 'poReference'
                }
            })
            .populate('items.product', 'name itemCode unitOfMeasure');

        const qcEntries = allQCs.filter(qc => {
            const poVendorId = qc.grnReference?.poReference?.vendor?._id?.toString() || qc.grnReference?.poReference?.vendor?.toString();
            if (!poVendorId || poVendorId !== vendorId.toString()) return false;

            if (startDate || endDate) {
                const qcDate = qc.checkedDate || qc.createdAt;
                if (startDate && new Date(qcDate) < dateFilter.$gte) return false;
                if (endDate && new Date(qcDate) > dateFilter.$lte) return false;
            }
            return true;
        });

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
                credit: po.totalAmount || po.grandTotal || 0, // Purchases increase payable amount to vendor
                debit: 0,
                status: po.status,
                rawDoc: po
            });
        });

        // QC Checks & Vendor Returns
        qcEntries.forEach((qc, idx) => {
            const poObj = qc.grnReference?.poReference;
            let totalReturnQty = 0;
            let totalReturnValue = 0;
            const itemDetails = [];

            (qc.items || []).forEach(item => {
                if (item.damagedQty > 0) {
                    totalReturnQty += item.damagedQty;
                    let unitPrice = item.purchasePrice || 0;
                    if (!unitPrice && poObj?.items) {
                        const prodId = item.product?._id?.toString() || item.product?.toString();
                        const poItem = poObj.items.find(pi => (pi.product?._id || pi.product)?.toString() === prodId);
                        if (poItem) unitPrice = poItem.unitPrice || 0;
                    }
                    const returnVal = item.damagedQty * unitPrice;
                    totalReturnValue += returnVal;
                    itemDetails.push(`${item.product?.name || 'Item'}: ${item.damagedQty} units @ ₹${unitPrice.toFixed(2)}`);
                }
            });

            if (totalReturnQty > 0 || totalReturnValue > 0) {
                const voucherNo = qc.qcNumber ? qc.qcNumber.replace(/^QC-/, 'R-') : `R-${String(idx + 1).padStart(3, '0')}/26-27`;
                ledgerTransactions.push({
                    date: qc.checkedDate || qc.createdAt,
                    voucherNo,
                    type: 'Vendor Return',
                    particulars: `Purchase Return / Rejected Material (${totalReturnQty} Units${itemDetails.length ? `: ${itemDetails.join(', ')}` : ''})`,
                    credit: 0,
                    debit: totalReturnValue, // Returns reduce payable amount
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

        const [purchaseOrders, payments, qcEntries] = await Promise.all([
            PurchaseOrder.find(poQuery).lean(),
            VendorPayment.find(payQuery).lean(),
            QualityControl.find()
                .populate({
                    path: 'grnReference',
                    populate: {
                        path: 'poReference'
                    }
                })
                .lean()
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
                summariesMap[vId].totalCredit += (po.totalAmount || po.grandTotal || 0);
            }
        });

        payments.forEach(vp => {
            const vId = vp.vendor?.toString();
            if (vId && summariesMap[vId]) {
                summariesMap[vId].totalDebit += (vp.amount || 0);
            }
        });

        qcEntries.forEach(qc => {
            const qcDate = qc.checkedDate || qc.createdAt;
            if (startDate && new Date(qcDate) < dateFilter.$gte) return;
            if (endDate && new Date(qcDate) > dateFilter.$lte) return;

            const poObj = qc.grnReference?.poReference;
            const vId = poObj?.vendor?.toString();
            if (vId && summariesMap[vId]) {
                (qc.items || []).forEach(item => {
                    if (item.damagedQty > 0) {
                        let unitPrice = item.purchasePrice || 0;
                        if (!unitPrice && poObj?.items) {
                            const prodId = item.product?.toString();
                            const poItem = poObj.items.find(pi => pi.product?.toString() === prodId);
                            if (poItem) unitPrice = poItem.unitPrice || 0;
                        }
                        summariesMap[vId].totalDebit += (item.damagedQty * unitPrice);
                    }
                });
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
