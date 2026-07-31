const AutoSalesEntry = require('../models/AutoSalesEntry');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Customer = require('../models/Customer');
const User = require('../models/User');

// @desc    Get all Auto Sales entries
// @route   GET /api/v1/auto-sales
exports.getAutoSalesEntries = async (req, res) => {
    try {
        const { date, vehicleNo } = req.query;
        let query = {};

        if (vehicleNo) {
            query.vehicleNo = vehicleNo;
        }

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.entryDate = { $gte: start, $lte: end };
        }

        const entries = await AutoSalesEntry.find(query)
            .populate('customer')
            .populate('incharge', 'name username employeeId designation')
            .populate('items.product')
            .sort({ entryDate: -1, createdAt: -1 });

        res.json({ success: true, count: entries.length, data: entries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Previous Day Unsold Return Stock (Opening) & Today's Dispatched Stock (Taken)
// @route   GET /api/v1/auto-sales/previous-opening
exports.getPreviousOpeningStock = async (req, res) => {
    try {
        const { customerId, vehicleNo, date } = req.query;
        let query = {};
        if (customerId) query.customer = customerId;
        if (vehicleNo) query.vehicleNo = vehicleNo;

        // 1. Fetch Previous Day Opening Stock (Yesterday's Unsold Returns)
        const lastEntry = await AutoSalesEntry.findOne(query)
            .sort({ entryDate: -1, createdAt: -1 });

        const openingMap = {};
        if (lastEntry && lastEntry.items) {
            lastEntry.items.forEach(item => {
                openingMap[item.product.toString()] = item.returnQty || 0;
            });
        }

        // 2. Fetch Today's TAKEN Stock (Sales Invoices generated for this customer)
        const SalesOrder = require('../models/SalesOrder');
        const targetDate = date ? new Date(date) : new Date();
        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);

        let invoiceQuery = { createdAt: { $gte: start, $lte: end } };
        if (customerId) invoiceQuery.customer = customerId;

        const todayInvoices = await SalesOrder.find(invoiceQuery);

        const takenMap = {};
        const returnMap = {};
        todayInvoices.forEach(inv => {
            if (inv.items && inv.items.length > 0) {
                inv.items.forEach((item, idx) => {
                    const pId = item.product.toString();
                    takenMap[pId] = (takenMap[pId] || 0) + (item.quantityPcs || 0);
                    
                    // Use item.returnedPcs or fallback to inv.returnedPcs if single item invoice
                    let ret = item.returnedPcs || 0;
                    if (!ret && inv.returnedPcs && idx === 0) {
                        ret = inv.returnedPcs;
                    }
                    returnMap[pId] = (returnMap[pId] || 0) + ret;
                });
            }
        });

        res.json({ 
            success: true, 
            data: {
                openingMap,
                takenMap,
                returnMap,
                lastEntryDate: lastEntry?.entryDate
            } 
        });
    } catch (error) {
        console.error('Error fetching auto stock data:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create / Update Daily Auto Sales Entry (Stock Transfer + Returns + Expenses)
// @route   POST /api/v1/auto-sales
exports.createAutoSalesEntry = async (req, res) => {
    try {
        const {
            entryDate,
            vehicleNo,
            customer: customerId,
            incharge: inchargeId,
            items,
            expenses = {}
        } = req.body;

        if (!customerId || !items || !items.length) {
            return res.status(400).json({ success: false, message: 'Vehicle Customer and stock items are required.' });
        }

        const customerObj = await Customer.findById(customerId);
        if (!customerObj) return res.status(404).json({ success: false, message: 'Customer not found' });

        const inchargeObj = inchargeId ? await User.findById(inchargeId) : null;

        // Auto Generate Transfer No (e.g., SODC/1918/26-27 style)
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
                openingQty: openQty,
                takenQty: takeQty,
                totalQty: totQty,
                returnQty: retQty,
                salesQty: sQty,
                unitPrice: price,
                totalSalesValue: val
            });

            // Deduct takenQty from main Cold Room stock
            if (takeQty > 0) {
                let inv = null;
                if (item.batchNumber) {
                    inv = await Inventory.findOne({ 
                        product: item.product, 
                        inventoryType: 'Cold Room', 
                        batchNumber: item.batchNumber 
                    });
                }
                if (!inv) {
                    inv = await Inventory.findOne({ 
                        product: item.product, 
                        inventoryType: 'Cold Room' 
                    });
                }

                if (inv) {
                    inv.quantity = Math.max(0, inv.quantity - takeQty);
                    inv.lastUpdated = Date.now();
                    await inv.save();
                }

                // Log Inventory Transaction OUT for taken stock
                await InventoryTransaction.create({
                    branch: customerObj.branch || inv?.branch || req.user?.primaryBranch || '6a5ec376b44299bf18d9e800',
                    product: item.product,
                    inventoryType: 'Cold Room',
                    batchNumber: item.batchNumber || inv?.batchNumber || 'COLD-ROOM',
                    transactionType: 'OUT',
                    quantity: takeQty,
                    referenceType: 'MANUAL',
                    remarks: `Auto Sales Stock Loading (${transferNo}) for ${vehicleNo || customerObj.name}`,
                    performedBy: req.user?._id || '6a5ec376b44299bf18d9e800'
                });
            }
        }

        const dieselCost = parseFloat(expenses.dieselCost) || 0;
        const maintenanceCost = parseFloat(expenses.maintenanceCost) || 0;
        const otherCost = parseFloat(expenses.otherCost) || 0;
        const totalExpenses = dieselCost + maintenanceCost + otherCost;
        const netCollection = grossSalesAmount - totalExpenses;

        // Collection Breakdown
        const cashAmount = parseFloat(collectionBreakdown.cashAmount) || 0;
        const paytmAmount = parseFloat(collectionBreakdown.paytmAmount) || 0;
        const gpayAmount = parseFloat(collectionBreakdown.gpayAmount) || 0;
        const totalCollected = cashAmount + paytmAmount + gpayAmount;
        const pendingDifference = netCollection - totalCollected;

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
            status: 'Completed',
            createdBy: req.user?._id || '6a5ec376b44299bf18d9e800'
        });

        // Automatically Generate Customer Receipts for Customer Ledger
        const CustomerReceipt = require('../models/CustomerReceipt');
        const targetDate = entryDate ? new Date(entryDate) : new Date();
        const safeTransfer = transferNo.replace(/\//g, '-');

        if (cashAmount > 0) {
            await CustomerReceipt.create({
                receiptNo: `RCP-CASH-${safeTransfer}`,
                receiptDate: targetDate,
                customer: customerId,
                amount: cashAmount,
                paymentMode: 'Cash',
                referenceNo: `Auto Cash Collection (${inchargeObj?.name || 'Driver'})`,
                remarks: `Auto Sales Daily Cash Collection (${transferNo})`,
                createdBy: req.user?._id || '6a5ec376b44299bf18d9e800'
            }).catch(e => console.log('Duplicate cash receipt skipped', e.message));
        }

        if (paytmAmount > 0) {
            await CustomerReceipt.create({
                receiptNo: `RCP-PAYTM-${safeTransfer}`,
                receiptDate: targetDate,
                customer: customerId,
                amount: paytmAmount,
                paymentMode: 'UPI',
                referenceNo: `Paytm QR (${inchargeObj?.name || 'Driver'})`,
                remarks: `Auto Sales Daily Paytm Collection (${transferNo})`,
                createdBy: req.user?._id || '6a5ec376b44299bf18d9e800'
            }).catch(e => console.log('Duplicate paytm receipt skipped', e.message));
        }

        if (gpayAmount > 0) {
            await CustomerReceipt.create({
                receiptNo: `RCP-GPAY-${safeTransfer}`,
                receiptDate: targetDate,
                customer: customerId,
                amount: gpayAmount,
                paymentMode: 'UPI',
                referenceNo: `GPay / Driver UPI (${inchargeObj?.name || 'Driver'})`,
                remarks: `Auto Sales Daily GPay Collection (${transferNo})`,
                createdBy: req.user?._id || '6a5ec376b44299bf18d9e800'
            }).catch(e => console.log('Duplicate gpay receipt skipped', e.message));
        }

        const populated = await AutoSalesEntry.findById(autoEntry._id)
            .populate('customer')
            .populate('incharge', 'name username employeeId designation')
            .populate('items.product');

        res.status(201).json({ success: true, data: populated });
    } catch (error) {
        console.error('Error in auto sales entry creation:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};
