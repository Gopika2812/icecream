const Customer = require('../models/Customer');
const SalesOrder = require('../models/SalesOrder');
const AutoSalesEntry = require('../models/AutoSalesEntry');
const CustomerReceipt = require('../models/CustomerReceipt');

// @desc    Get Customer Ledger Statement with Running Balance
// @route   GET /api/v1/customer-ledger/:customerId
exports.getCustomerLedger = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { startDate, endDate } = req.query;

        const customer = await Customer.findById(customerId).populate('salesOwner', 'name username employeeId');
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

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

        // 1. Fetch Sales Invoices for Customer
        const invoiceQuery = { customer: customerId };
        if (startDate || endDate) invoiceQuery.createdAt = dateFilter;
        const salesOrders = await SalesOrder.find(invoiceQuery).sort({ createdAt: 1 });

        // 2. Fetch Auto Sales Entries for Customer (if Auto Sales category)
        const autoQuery = { customer: customerId };
        if (startDate || endDate) autoQuery.entryDate = dateFilter;
        const autoEntries = await AutoSalesEntry.find(autoQuery).sort({ entryDate: 1 });

        // 3. Fetch Payment Receipts for Customer
        const receiptQuery = { customer: customerId };
        if (startDate || endDate) receiptQuery.receiptDate = dateFilter;
        const receipts = await CustomerReceipt.find(receiptQuery).sort({ receiptDate: 1 });

        // 4. Combine into chronological Ledger Entries
        const ledgerTransactions = [];

        // Sales Orders
        salesOrders.forEach(so => {
            ledgerTransactions.push({
                date: so.createdAt,
                voucherNo: so.invoiceNumber,
                type: 'Sales Invoice',
                particulars: `Sales Dispatch (${so.items?.length || 0} Products) — ${so.invoiceType}`,
                debit: so.grandTotal || 0,
                credit: 0,
                status: so.status,
                rawDoc: so
            });

            // ONLY show Store Room Return (Cold Storage Maintenance Unload)
            // DO NOT show daily auto van returns
            if (so.autoSalesReturnLogged && so.returnMode === 'cold_room' && so.returnedPcs > 0) {
                ledgerTransactions.push({
                    date: so.updatedAt || so.createdAt,
                    voucherNo: `RET-${so.invoiceNumber}`,
                    type: 'Store Room Return',
                    particulars: `Main Cold Storage Stock Unload (${so.returnedPcs} Pcs Returned to Store Room)`,
                    debit: 0,
                    credit: 0, // Stock restored to cold room
                    status: 'Returned'
                });
            }
        });

        // Auto Sales Entries & Daily Expenses
        autoEntries.forEach(ae => {
            // Include Daily Auto Expenses if incurred (Diesel, Maintenance)
            const expTotal = ae.expenses?.totalExpenses || 0;
            if (expTotal > 0) {
                const diesel = ae.expenses?.dieselCost || 0;
                const maint = ae.expenses?.maintenanceCost || 0;
                const other = ae.expenses?.otherCost || 0;

                ledgerTransactions.push({
                    date: ae.entryDate,
                    voucherNo: `EXP-${ae.transferNo}`,
                    type: 'Auto Expenses',
                    particulars: `Daily Auto Van Expenses (${diesel > 0 ? `Diesel: ₹${diesel}` : ''} ${maint > 0 ? `Repair: ₹${maint}` : ''} ${other > 0 ? `Other: ₹${other}` : ''})`,
                    debit: 0,
                    credit: expTotal,
                    status: 'Adjusted',
                    rawDoc: ae
                });
            }
        });

        // Customer Payment Receipts
        receipts.forEach(rc => {
            ledgerTransactions.push({
                date: rc.receiptDate,
                voucherNo: rc.receiptNo,
                type: 'Payment Receipt',
                particulars: `Payment Received via ${rc.paymentMode} ${rc.referenceNo ? `(Ref: ${rc.referenceNo})` : ''} — ${rc.remarks || ''}`,
                debit: 0,
                credit: rc.amount || 0,
                status: 'Received',
                rawDoc: rc
            });
        });

        // Sort chronologically by date
        ledgerTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate Running Balance
        let openingBalance = customer.openingBalance || 0;
        let runningBalance = openingBalance;
        let totalDebit = 0;
        let totalCredit = 0;

        const ledgerWithBalance = ledgerTransactions.map(tx => {
            totalDebit += tx.debit;
            totalCredit += tx.credit;
            runningBalance += (tx.debit - tx.credit);
            return {
                ...tx,
                runningBalance
            };
        });

        const summary = {
            customer,
            openingBalance,
            totalDebit,
            totalCredit,
            closingBalance: runningBalance
        };

        res.json({
            success: true,
            summary,
            data: ledgerWithBalance
        });

    } catch (error) {
        console.error('Error fetching customer ledger:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get All Customers Financial Summaries in a single fast call
// @route   GET /api/v1/customer-ledger/summaries/all
exports.getAllCustomerSummaries = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const customers = await Customer.find().lean();

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

        const soQuery = startDate || endDate ? { createdAt: dateFilter } : {};
        const rcQuery = startDate || endDate ? { receiptDate: dateFilter } : {};
        const autoQuery = startDate || endDate ? { entryDate: dateFilter } : {};

        const [salesOrders, receipts, autoEntries] = await Promise.all([
            SalesOrder.find(soQuery).lean(),
            CustomerReceipt.find(rcQuery).lean(),
            AutoSalesEntry.find(autoQuery).lean()
        ]);

        const summariesMap = {};

        customers.forEach(c => {
            summariesMap[c._id.toString()] = {
                openingBalance: c.openingBalance || 0,
                totalDebit: 0,
                totalCredit: 0,
                closingBalance: c.openingBalance || 0
            };
        });

        salesOrders.forEach(so => {
            const cId = so.customer?.toString();
            if (cId && summariesMap[cId]) {
                summariesMap[cId].totalDebit += (so.grandTotal || 0);
            }
        });

        receipts.forEach(rc => {
            const cId = rc.customer?.toString();
            if (cId && summariesMap[cId]) {
                summariesMap[cId].totalCredit += (rc.amount || 0);
            }
        });

        autoEntries.forEach(ae => {
            const cId = ae.customer?.toString();
            const expTotal = ae.expenses?.totalExpenses || 0;
            if (cId && summariesMap[cId] && expTotal > 0) {
                summariesMap[cId].totalCredit += expTotal;
            }
        });

        // Compute closing balance
        Object.keys(summariesMap).forEach(cId => {
            const s = summariesMap[cId];
            s.closingBalance = s.openingBalance + s.totalDebit - s.totalCredit;
        });

        res.json({ success: true, data: summariesMap });
    } catch (error) {
        console.error('Error fetching all customer summaries:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create Customer Payment Receipt
// @route   POST /api/v1/customer-ledger/receipt
exports.createCustomerReceipt = async (req, res) => {
    try {
        const { customerId, receiptDate, amount, paymentMode, referenceNo, remarks } = req.body;

        if (!customerId || !amount) {
            return res.status(400).json({ success: false, message: 'Customer and Amount are required.' });
        }

        const count = await CustomerReceipt.countDocuments();
        const receiptNo = `RCP-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1001).toString()}`;

        const receipt = await CustomerReceipt.create({
            receiptNo,
            receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
            customer: customerId,
            amount: parseFloat(amount),
            paymentMode: paymentMode || 'Cash',
            referenceNo: referenceNo || '',
            remarks: remarks || 'Customer Payment Received',
            createdBy: req.user?._id || '6a5ec376b44299bf18d9e800'
        });

        // Update customer current balance
        await Customer.findByIdAndUpdate(customerId, {
            $inc: { currentBalance: -parseFloat(amount) }
        });

        const populated = await CustomerReceipt.findById(receipt._id).populate('customer');

        res.status(201).json({ success: true, data: populated });
    } catch (error) {
        console.error('Error creating customer receipt:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};
