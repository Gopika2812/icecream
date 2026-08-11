const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');
const GRN = require('../models/GRN');
const QualityControl = require('../models/QualityControl');
const VendorPayment = require('../models/VendorPayment');
const Product = require('../models/Product');

// Helper to populate QC records and calculate Vendor Returns debit amounts
const getPopulatedQCEntries = async () => {
    const [allQCs, allGrns, allPos, allProducts] = await Promise.all([
        QualityControl.find(),
        GRN.find(),
        PurchaseOrder.find(),
        Product.find()
    ]);

    const grnMap = {};
    (allGrns || []).forEach(g => { if (g._id) grnMap[g._id.toString()] = g; });

    const poMap = {};
    (allPos || []).forEach(p => { if (p._id) poMap[p._id.toString()] = p; });

    const productMap = {};
    (allProducts || []).forEach(pr => { if (pr._id) productMap[pr._id.toString()] = pr; });

    return (allQCs || []).map(qc => {
        const qcObj = typeof qc.toObject === 'function' ? qc.toObject() : { ...qc };

        // 1. Resolve GRN
        let grnObj = null;
        const gId = qcObj.grnReference?._id ? qcObj.grnReference._id.toString() : (typeof qcObj.grnReference === 'string' ? qcObj.grnReference : null);
        if (gId && grnMap[gId]) {
            grnObj = grnMap[gId];
        } else if (qcObj.grnReference && typeof qcObj.grnReference === 'object') {
            grnObj = qcObj.grnReference;
        }

        // 2. Resolve PO
        let poObj = null;
        if (grnObj) {
            const pId = grnObj.poReference?._id ? grnObj.poReference._id.toString() : (typeof grnObj.poReference === 'string' ? grnObj.poReference : null);
            if (pId && poMap[pId]) {
                poObj = poMap[pId];
            } else if (grnObj.poReference && typeof grnObj.poReference === 'object') {
                poObj = grnObj.poReference;
            }
        }
        if (!poObj) {
            const pIdDirect = qcObj.poReference?._id ? qcObj.poReference._id.toString() : (typeof qcObj.poReference === 'string' ? qcObj.poReference : null);
            if (pIdDirect && poMap[pIdDirect]) {
                poObj = poMap[pIdDirect];
            }
        }

        // 3. Resolve Vendor ID
        let vendorId = null;
        if (poObj) {
            vendorId = poObj.vendor?._id ? poObj.vendor._id.toString() : (typeof poObj.vendor === 'string' ? poObj.vendor : null);
        }
        if (!vendorId && qcObj.vendor) {
            vendorId = qcObj.vendor?._id ? qcObj.vendor._id.toString() : (typeof qcObj.vendor === 'string' ? qcObj.vendor : null);
        }

        // 4. Calculate total return quantity & value
        let totalReturnQty = 0;
        let totalReturnValue = 0;
        const itemDetails = [];

        (qcObj.items || []).forEach(item => {
            const damagedQty = item.damagedQty || item.rejectedQty || 0;
            if (damagedQty > 0) {
                totalReturnQty += damagedQty;

                const prId = item.product?._id ? item.product._id.toString() : (typeof item.product === 'string' ? item.product : null);
                const prodObj = (prId && productMap[prId]) ? productMap[prId] : (typeof item.product === 'object' ? item.product : {});

                let unitPrice = item.purchasePrice || item.unitPrice || item.rate || 0;
                if (!unitPrice && poObj?.items) {
                    const poItem = poObj.items.find(pi => {
                        const piPrId = pi.product?._id ? pi.product._id.toString() : (typeof pi.product === 'string' ? pi.product : null);
                        return piPrId && piPrId === prId;
                    });
                    if (poItem) {
                        unitPrice = poItem.unitPrice || poItem.rate || poItem.purchasePrice || 0;
                    }
                }
                if (!unitPrice && prodObj.purchasePrice) {
                    unitPrice = prodObj.purchasePrice;
                }
                if (!unitPrice) unitPrice = 0.25; // Default rate fallback if price not set

                const returnVal = damagedQty * unitPrice;
                totalReturnValue += returnVal;
                itemDetails.push(`${prodObj.name || 'Material'}: ${damagedQty} units @ ₹${unitPrice.toFixed(2)}`);
            }
        });

        return {
            ...qcObj,
            grnObj,
            poObj,
            vendorId,
            totalReturnQty,
            totalReturnValue,
            itemDetails
        };
    });
};

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

        // 2. Fetch QC / Vendor Returns with resolved references
        const populatedQCs = await getPopulatedQCEntries();
        const qcEntries = populatedQCs.filter(qc => {
            if (!qc.vendorId || qc.vendorId.toString() !== vendorId.toString()) return false;

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

        // Purchase Orders Inward / Purchases (CREDIT to vendor)
        purchaseOrders.forEach(po => {
            ledgerTransactions.push({
                date: po.createdAt,
                voucherNo: po.poNumber,
                type: 'Purchase Order',
                particulars: `Purchase Inward Bill (${po.items?.length || 0} Raw Materials)`,
                credit: po.totalAmount || po.grandTotal || 0,
                debit: 0,
                status: po.status,
                rawDoc: po
            });
        });

        // QC Checks & Vendor Returns (DEBIT to vendor - reduces payable)
        qcEntries.forEach((qc, idx) => {
            if (qc.totalReturnQty > 0 || qc.totalReturnValue > 0) {
                const voucherNo = qc.qcNumber ? `RET-${qc.qcNumber}` : `RET-QC-${String(idx + 1).padStart(3, '0')}/26-27`;
                ledgerTransactions.push({
                    date: qc.checkedDate || qc.createdAt,
                    voucherNo,
                    type: 'Vendor Return',
                    particulars: `Purchase Return / Damaged Material (${qc.totalReturnQty} Units${qc.itemDetails.length ? `: ${qc.itemDetails.join(', ')}` : ''})`,
                    credit: 0,
                    debit: qc.totalReturnValue,
                    status: 'Returned',
                    rawDoc: qc
                });
            }
        });

        // Vendor Payments Paid (DEBIT to vendor - reduces payable)
        payments.forEach(vp => {
            ledgerTransactions.push({
                date: vp.paymentDate,
                voucherNo: vp.paymentNo,
                type: 'Vendor Payment',
                particulars: `Payment Paid via ${vp.paymentMode} ${vp.referenceNo ? `(Ref: ${vp.referenceNo})` : ''} — ${vp.remarks || ''}`,
                credit: 0,
                debit: vp.amount || 0,
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
        const vendors = await Vendor.find();

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

        const [purchaseOrders, payments, populatedQCs] = await Promise.all([
            PurchaseOrder.find(poQuery),
            VendorPayment.find(payQuery),
            getPopulatedQCEntries()
        ]);

        const summariesMap = {};

        (vendors || []).forEach(v => {
            const vId = v._id ? v._id.toString() : v.id;
            if (vId) {
                summariesMap[vId] = {
                    openingBalance: v.openingBalance || 0,
                    totalCredit: 0,
                    totalDebit: 0,
                    closingBalance: v.openingBalance || 0
                };
            }
        });

        (purchaseOrders || []).forEach(po => {
            const vId = po.vendor?._id ? po.vendor._id.toString() : (typeof po.vendor === 'string' ? po.vendor : null);
            if (vId && summariesMap[vId]) {
                summariesMap[vId].totalCredit += (po.totalAmount || po.grandTotal || 0);
            }
        });

        (payments || []).forEach(vp => {
            const vId = vp.vendor?._id ? vp.vendor._id.toString() : (typeof vp.vendor === 'string' ? vp.vendor : null);
            if (vId && summariesMap[vId]) {
                summariesMap[vId].totalDebit += (vp.amount || 0);
            }
        });

        (populatedQCs || []).forEach(qc => {
            const qcDate = qc.checkedDate || qc.createdAt;
            if (startDate && new Date(qcDate) < dateFilter.$gte) return;
            if (endDate && new Date(qcDate) > dateFilter.$lte) return;

            const vId = qc.vendorId ? qc.vendorId.toString() : null;
            if (vId && summariesMap[vId]) {
                summariesMap[vId].totalDebit += (qc.totalReturnValue || 0);
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

// @desc    Create Vendor Payment Entry (Against Invoice or General)
// @route   POST /api/v1/vendor-ledger/payment
exports.createVendorPayment = async (req, res) => {
    try {
        const { vendorId, paymentDate, amount, paymentMode, referenceNo, remarks, paymentType, poReference, invoiceNumber } = req.body;

        if (!vendorId || !amount) {
            return res.status(400).json({ success: false, message: 'Vendor and Amount are required.' });
        }

        if (referenceNo) {
            const existingPayment = await VendorPayment.findOne({ referenceNo, vendor: vendorId });
            if (existingPayment) {
                return res.status(200).json({ success: true, data: existingPayment, message: 'Payment already recorded with this reference number.' });
            }
        }

        const count = await VendorPayment.countDocuments();
        const paymentNo = `VPAY-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1001).toString()}`;

        let finalRemarks = remarks || (paymentType === 'AGAINST_INVOICE' ? `Payment against bill ${invoiceNumber || poReference || ''}` : 'General Vendor Bill Payment');

        const payment = await VendorPayment.create({
            paymentNo,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            vendor: vendorId,
            amount: parseFloat(amount),
            paymentMode: paymentMode || 'Bank Transfer',
            referenceNo: referenceNo || '',
            remarks: finalRemarks,
            paymentType: paymentType || 'GENERAL',
            poReference: poReference || null,
            invoiceNumber: invoiceNumber || null,
            createdBy: req.user?._id || '6a5ec376b44299bf18d9e800'
        });

        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        console.error('Error creating vendor payment:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get All Vendor Payment Disbursement Records (with filters)
// @route   GET /api/v1/vendor-ledger/payments
exports.getAllVendorPayments = async (req, res) => {
    try {
        const { vendorId, paymentMode, startDate, endDate } = req.query;

        let query = {};
        if (vendorId) query.vendor = vendorId;
        if (paymentMode && paymentMode !== 'ALL') query.paymentMode = paymentMode;

        if (startDate || endDate) {
            query.paymentDate = {};
            if (startDate) query.paymentDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.paymentDate.$lte = end;
            }
        }

        const payments = await VendorPayment.find(query);
        const [allVendors, allPOs] = await Promise.all([
            Vendor.find(),
            PurchaseOrder.find()
        ]);

        const vendorMap = {};
        (allVendors || []).forEach(v => { if (v._id) vendorMap[v._id.toString()] = v; });

        const poMap = {};
        (allPOs || []).forEach(p => { if (p._id) poMap[p._id.toString()] = p; });

        const enrichedPayments = (payments || []).map(p => {
            const pObj = typeof p.toObject === 'function' ? p.toObject() : { ...p };
            const vId = pObj.vendor?._id ? pObj.vendor._id.toString() : (typeof pObj.vendor === 'string' ? pObj.vendor : null);
            const vendor = (vId && vendorMap[vId]) ? vendorMap[vId] : (typeof pObj.vendor === 'object' ? pObj.vendor : null);

            const poId = pObj.poReference?._id ? pObj.poReference._id.toString() : (typeof pObj.poReference === 'string' ? pObj.poReference : null);
            const po = (poId && poMap[poId]) ? poMap[poId] : null;

            return {
                ...pObj,
                vendor,
                poNumber: pObj.invoiceNumber || po?.poNumber || (pObj.paymentType === 'AGAINST_INVOICE' ? 'PO-001/26-27' : 'General')
            };
        });

        // Sort descending by date
        enrichedPayments.sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt));

        res.json({ success: true, count: enrichedPayments.length, data: enrichedPayments });
    } catch (error) {
        console.error('Error fetching all vendor payments:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


