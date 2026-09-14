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

// @desc    Get All Sales Orders with Payment Status (for Receipt Entry)
// @route   GET /api/v1/customer-ledger/pending-invoices
exports.getPendingInvoices = async (req, res) => {
    try {
        const { customerId, status } = req.query;
        let query = {};
        if (customerId) query.customer = customerId;

        const [salesOrders, receipts] = await Promise.all([
            SalesOrder.find(query).populate('customer').populate('salesOwner', 'name username employeeId').sort({ createdAt: -1 }),
            CustomerReceipt.find().lean()
        ]);

        // Map receipts by salesOrderId to calculate exact paid amount
        const receiptMap = {};
        receipts.forEach(rc => {
            if (rc.salesOrderId) {
                const soId = rc.salesOrderId.toString();
                receiptMap[soId] = (receiptMap[soId] || 0) + (parseFloat(rc.amount) || 0);
            }
        });

        const invoiceList = (salesOrders || []).map(so => {
            const soId = (so._id || so.id).toString();
            const grandTotal = parseFloat(so.grandTotal) || 0;
            const paid = receiptMap[soId] !== undefined ? receiptMap[soId] : (parseFloat(so.paidAmount) || 0);
            const pending = Math.max(0, grandTotal - paid);
            let paymentStatus = so.paymentStatus || so.status || 'Unpaid';

            if (pending <= 0.01 && grandTotal > 0) {
                paymentStatus = 'Paid';
            } else if (paid > 0 && pending > 0.01) {
                paymentStatus = 'Partially Paid';
            } else if (paid === 0) {
                paymentStatus = 'Unpaid';
            }

            return {
                ...so,
                grandTotal,
                paidAmount: paid,
                pendingAmount: pending,
                paymentStatus
            };
        });

        // Filter by status if requested
        const filtered = status 
            ? invoiceList.filter(inv => inv.paymentStatus?.toLowerCase() === status.toLowerCase())
            : invoiceList;

        res.json({ success: true, count: filtered.length, data: filtered });
    } catch (error) {
        console.error('Error fetching pending invoices:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get All Receipts with Filter
// @route   GET /api/v1/customer-ledger/receipts/all
exports.getAllReceipts = async (req, res) => {
    try {
        const { customerId, receiptType, startDate, endDate } = req.query;
        let query = {};
        if (customerId) query.customer = customerId;
        if (receiptType) query.receiptType = receiptType;

        if (startDate || endDate) {
            query.receiptDate = {};
            if (startDate) query.receiptDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.receiptDate.$lte = end;
            }
        }

        const receipts = await CustomerReceipt.find(query)
            .populate('customer')
            .sort({ receiptDate: -1, createdAt: -1 });

        res.json({ success: true, count: receipts.length, data: receipts });
    } catch (error) {
        console.error('Error fetching customer receipts:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create Customer Payment Receipt (Against Invoice or General Standalone)
// @route   POST /api/v1/customer-ledger/receipt
exports.createCustomerReceipt = async (req, res) => {
    try {
        const { 
            customerId, 
            salesOrderId, 
            receiptType = 'GENERAL', 
            receiptDate, 
            amount, 
            paymentMode, 
            referenceNo, 
            remarks 
        } = req.body;

        if (!customerId || !amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Customer and valid Amount are required.' });
        }

        const amtNum = parseFloat(amount);
        const count = await CustomerReceipt.countDocuments();
        const receiptNo = `RCP-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(count + 1001).toString()}`;

        let targetSalesOrder = null;
        let invoiceNo = '';

        if (salesOrderId) {
            targetSalesOrder = await SalesOrder.findById(salesOrderId);
            if (targetSalesOrder) {
                invoiceNo = targetSalesOrder.invoiceNumber || targetSalesOrder.id;
            }
        }

        const receipt = await CustomerReceipt.create({
            receiptNo,
            receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
            customer: customerId,
            salesOrderId: salesOrderId || null,
            salesOrderInvoiceNo: invoiceNo,
            receiptType: receiptType || (salesOrderId ? 'AGAINST_INVOICE' : 'GENERAL'),
            amount: amtNum,
            paymentMode: paymentMode || 'Cash',
            referenceNo: referenceNo || '',
            remarks: remarks || (salesOrderId ? `Payment against Invoice ${invoiceNo}` : 'Customer Payment Received'),
            createdBy: req.user?._id || req.user?.id || '6a5ec376b44299bf18d9e800'
        });

        // If paying against a specific Sales Order, update its paidAmount and status
        if (targetSalesOrder) {
            const currentPaid = parseFloat(targetSalesOrder.paidAmount) || 0;
            const newPaid = currentPaid + amtNum;
            const grandTotal = parseFloat(targetSalesOrder.grandTotal) || 0;
            const newPending = Math.max(0, grandTotal - newPaid);
            const newStatus = newPending <= 0.01 ? 'Paid' : 'Partially Paid';

            await SalesOrder.findByIdAndUpdate(targetSalesOrder._id || targetSalesOrder.id, {
                paidAmount: newPaid,
                pendingAmount: newPending,
                paymentStatus: newStatus,
                status: newStatus
            });
        }

        // Update customer current balance
        await Customer.findByIdAndUpdate(customerId, {
            $inc: { currentBalance: -amtNum }
        });

        const populated = await CustomerReceipt.findById(receipt._id || receipt.id).populate('customer');

        res.status(201).json({ 
            success: true, 
            message: `Receipt ${receiptNo} created successfully`, 
            data: populated 
        });
    } catch (error) {
        console.error('Error creating customer receipt:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Auto Sales Daily Stock Settlement & Net Receipt
// @route   POST /api/v1/customer-ledger/auto-settlement
exports.createAutoSalesSettlement = async (req, res) => {
    try {
        const {
            entryDate,
            vehicleNo,
            customer: customerId,
            incharge: inchargeId,
            items = [],
            expenses = {},
            collectionBreakdown = {},
            salesOrderId
        } = req.body;

        if (!customerId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Auto Van Customer and stock items are required.' });
        }

        const customerObj = await Customer.findById(customerId);
        if (!customerObj) return res.status(404).json({ success: false, message: 'Customer not found' });

        const inchargeObj = inchargeId ? await User.findById(inchargeId) : null;

        // Auto Generate Transfer/Settlement No
        const count = await AutoSalesEntry.countDocuments();
        const transferNo = `SODC/${(count + 1001).toString()}/26-27`;

        let grossSalesAmount = 0;
        const processedItems = [];

        for (const item of items) {
            const openQty = parseFloat(item.openingQty) || 0;
            const takeQty = parseFloat(item.takenQty) || 0;
            const totQty = openQty + takeQty;
            const retQty = parseFloat(item.returnQty) || 0;
            const sQty = Math.max(0, totQty - retQty);
            const price = parseFloat(item.unitPrice) || 0;
            const val = sQty * price;

            grossSalesAmount += val;

            processedItems.push({
                product: item.product,
                productName: item.productName || '',
                openingQty: openQty,
                takenQty: takeQty,
                totalQty: totQty,
                returnQty: retQty,
                salesQty: sQty,
                unitPrice: price,
                totalSalesValue: val
            });
        }

        const dieselCost = parseFloat(expenses.dieselCost) || 0;
        const maintenanceCost = parseFloat(expenses.maintenanceCost) || 0;
        const otherCost = parseFloat(expenses.otherCost) || 0;
        const totalExpenses = dieselCost + maintenanceCost + otherCost;
        const netCollection = Math.max(0, grossSalesAmount - totalExpenses);

        const cashAmount = parseFloat(collectionBreakdown.cashAmount) || 0;
        const paytmAmount = parseFloat(collectionBreakdown.paytmAmount) || 0;
        const gpayAmount = parseFloat(collectionBreakdown.gpayAmount) || 0;
        const totalCollected = cashAmount + paytmAmount + gpayAmount;
        const pendingDifference = netCollection - totalCollected;

        // Save AutoSalesEntry (Permanently preserves returnQty for next day opening!)
        const autoEntry = await AutoSalesEntry.create({
            transferNo,
            entryDate: entryDate ? new Date(entryDate) : new Date(),
            vehicleNo: vehicleNo || customerObj.name,
            customer: customerId,
            incharge: inchargeId || customerObj.salesOwner,
            branch: req.user?.primaryBranch || '6a5ec376b44299bf18d9e800',
            items: processedItems,
            grossSalesAmount,
            expenses: {
                dieselCost,
                maintenanceCost,
                otherCost,
                totalExpenses
            },
            netCollection,
            collectionBreakdown: {
                cashAmount,
                paytmAmount,
                gpayAmount,
                totalCollected,
                pendingDifference
            },
            status: 'Settled',
            createdBy: req.user?._id || req.user?.id || '6a5ec376b44299bf18d9e800'
        });

        // Generate Receipts
        const targetDate = entryDate ? new Date(entryDate) : new Date();
        const safeTransfer = transferNo.replace(/\//g, '-');
        const generatedReceipts = [];

        if (cashAmount > 0) {
            const r = await CustomerReceipt.create({
                receiptNo: `RCP-CASH-${safeTransfer}`,
                receiptDate: targetDate,
                customer: customerId,
                salesOrderId: salesOrderId || null,
                receiptType: 'AUTO_SALES_SETTLEMENT',
                amount: cashAmount,
                paymentMode: 'Cash',
                referenceNo: `Cash Handover (${inchargeObj?.name || 'Driver'})`,
                remarks: `Auto Sales Daily Cash Collection (${transferNo}) [Gross: ₹${grossSalesAmount}, Exp: ₹${totalExpenses}]`,
                expenses: { dieselCost, maintenanceCost, otherCost, totalExpenses },
                grossSalesAmount,
                netAmount: netCollection,
                createdBy: req.user?._id || req.user?.id || '6a5ec376b44299bf18d9e800'
            });
            generatedReceipts.push(r);
        }

        if (paytmAmount > 0) {
            const r = await CustomerReceipt.create({
                receiptNo: `RCP-PAYTM-${safeTransfer}`,
                receiptDate: targetDate,
                customer: customerId,
                salesOrderId: salesOrderId || null,
                receiptType: 'AUTO_SALES_SETTLEMENT',
                amount: paytmAmount,
                paymentMode: 'UPI',
                referenceNo: `Paytm QR (${inchargeObj?.name || 'Driver'})`,
                remarks: `Auto Sales Daily Paytm Collection (${transferNo})`,
                expenses: { dieselCost, maintenanceCost, otherCost, totalExpenses },
                grossSalesAmount,
                netAmount: netCollection,
                createdBy: req.user?._id || req.user?.id || '6a5ec376b44299bf18d9e800'
            });
            generatedReceipts.push(r);
        }

        if (gpayAmount > 0) {
            const r = await CustomerReceipt.create({
                receiptNo: `RCP-GPAY-${safeTransfer}`,
                receiptDate: targetDate,
                customer: customerId,
                salesOrderId: salesOrderId || null,
                receiptType: 'AUTO_SALES_SETTLEMENT',
                amount: gpayAmount,
                paymentMode: 'UPI',
                referenceNo: `GPay UPI (${inchargeObj?.name || 'Driver'})`,
                remarks: `Auto Sales Daily GPay Collection (${transferNo})`,
                expenses: { dieselCost, maintenanceCost, otherCost, totalExpenses },
                grossSalesAmount,
                netAmount: netCollection,
                createdBy: req.user?._id || req.user?.id || '6a5ec376b44299bf18d9e800'
            });
            generatedReceipts.push(r);
        }

        // If today's SO is linked, update its payment status
        if (salesOrderId) {
            const targetSO = await SalesOrder.findById(salesOrderId);
            if (targetSO) {
                const currentPaid = parseFloat(targetSO.paidAmount) || 0;
                const newPaid = currentPaid + totalCollected;
                const grandTotal = parseFloat(targetSO.grandTotal) || 0;
                const newPending = Math.max(0, grandTotal - newPaid);
                await SalesOrder.findByIdAndUpdate(salesOrderId, {
                    paidAmount: newPaid,
                    pendingAmount: newPending,
                    paymentStatus: newPending <= 0.01 ? 'Paid' : 'Partially Paid'
                });
            }
        }

        const populatedEntry = await AutoSalesEntry.findById(autoEntry._id || autoEntry.id)
            .populate('customer')
            .populate('incharge', 'name username employeeId designation');

        res.status(201).json({
            success: true,
            message: `Auto Sales Daily Settlement ${transferNo} Completed Successfully!`,
            data: {
                settlement: populatedEntry,
                receipts: generatedReceipts,
                netCollection,
                totalExpenses,
                grossSalesAmount
            }
        });
    } catch (error) {
        console.error('Error in auto sales settlement creation:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};
