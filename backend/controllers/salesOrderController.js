const SalesOrder = require('../models/SalesOrder');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Customer = require('../models/Customer');
const User = require('../models/User');

// Helper for Indian Fiscal Year suffix (e.g. "26-27")
const getFiscalYearSuffix = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    let startYear = year;
    let endYear = year + 1;
    if (month < 4) {
        startYear = year - 1;
        endYear = year;
    }
    return `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
};

const getInvoicePrefix = (type) => {
    switch (type) {
        case 'Auto Sales':
            return 'AU';
        case 'Party Order':
            return 'PO';
        case 'Sample Products':
            return 'SMP';
        case 'Guest':
            return 'GST';
        case 'Dealer':
            return 'DLR';
        default:
            return 'INV';
    }
};

// @desc    Get all Sales Orders / Invoices
// @route   GET /api/v1/sales-orders
exports.getSalesOrders = async (req, res) => {
    try {
        const salesOrders = await SalesOrder.find().sort({ createdAt: -1 });

        const [allCustomers, allUsers, allProducts] = await Promise.all([
            Customer.find(),
            User.find(),
            require('../models/Product').find()
        ]);

        const customerMap = new Map((allCustomers || []).map(c => [c._id || c.id, c]));
        const userMap = new Map((allUsers || []).map(u => [u._id || u.id, u]));
        const userByNameMap = new Map((allUsers || []).map(u => [u.name?.toLowerCase().trim(), u]));
        const productMap = new Map((allProducts || []).map(p => [p._id || p.id, p]));

        const populatedOrders = (salesOrders || []).map(order => {
            const copy = { ...order };

            // Populate Customer
            if (copy.customer) {
                const custId = typeof copy.customer === 'object' ? (copy.customer._id || copy.customer.id) : copy.customer;
                if (customerMap.has(custId)) {
                    copy.customer = customerMap.get(custId);
                }
            }

            // Populate Sales Owner
            if (copy.salesOwner) {
                const ownerId = typeof copy.salesOwner === 'object' ? (copy.salesOwner._id || copy.salesOwner.id) : copy.salesOwner;
                if (userMap.has(ownerId)) {
                    copy.salesOwner = userMap.get(ownerId);
                } else if (typeof copy.salesOwner === 'string' && userByNameMap.has(copy.salesOwner.toLowerCase().trim())) {
                    copy.salesOwner = userByNameMap.get(copy.salesOwner.toLowerCase().trim());
                } else if (typeof copy.salesOwner === 'string') {
                    copy.salesOwner = { name: copy.salesOwner };
                }
            }

            // Populate items.product
            if (Array.isArray(copy.items)) {
                copy.items = copy.items.map(item => {
                    const prodId = typeof item.product === 'object' ? (item.product?._id || item.product?.id) : item.product;
                    return {
                        ...item,
                        product: productMap.get(prodId) || item.product
                    };
                });
            }

            return copy;
        });

        res.json({ success: true, count: populatedOrders.length, data: populatedOrders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create Sales Order / Generate Invoice
// @route   POST /api/v1/sales-orders
exports.createSalesOrder = async (req, res) => {
    try {
        const { invoiceType, customer: customerId, guestName, salesOwner: salesOwnerId, items, taxRate = 18, paymentStatus = 'Paid', remarks } = req.body;

        if (!items || !items.length) {
            return res.status(400).json({ success: false, message: 'Invoice items are required.' });
        }

        if (invoiceType !== 'Guest' && !customerId) {
            return res.status(400).json({ success: false, message: 'Customer is required.' });
        }

        const customerObj = customerId ? await Customer.findById(customerId) : null;
        const targetCustomerName = invoiceType === 'Guest' ? (guestName || 'Guest Receiver') : (customerObj?.name || 'Customer');

        const salesOwnerObj = salesOwnerId ? await User.findById(salesOwnerId) : null;
        const ownerName = salesOwnerObj ? salesOwnerObj.name : (typeof salesOwnerId === 'string' ? salesOwnerId : 'Unassigned');

        // Auto Generate Short Invoice Number (e.g. AU/001/26-27 or INV/001/26-27)
        const count = await SalesOrder.countDocuments();
        const prefix = getInvoicePrefix(invoiceType);
        const fySuffix = getFiscalYearSuffix();
        const invoiceNumber = `${prefix}/${(count + 1).toString().padStart(3, '0')}/${fySuffix}`;

        // Calculate Totals
        let subTotal = 0;
        const processedItems = [];

        for (const item of items) {
            const qtyPcs = parseInt(item.quantityPcs) || 0;
            const boxes = parseInt(item.quantityBoxes) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            const itemTotal = qtyPcs * price;
            subTotal += itemTotal;

            processedItems.push({
                product: item.product,
                batchNumber: item.batchNumber || 'COLD-ROOM',
                quantityBoxes: boxes,
                quantityPcs: qtyPcs,
                unitPrice: price,
                totalPrice: itemTotal
            });

            // Deduct stock from Cold Room Inventory
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
                inv.quantity = Math.max(0, inv.quantity - qtyPcs);
                inv.lastUpdated = Date.now();
                await inv.save();
            }

            // Log Inventory Transaction OUT
            await InventoryTransaction.create({
                branch: customerObj?.branch || inv?.branch || req.user?.primaryBranch || '6a5ec376b44299bf18d9e800',
                product: item.product,
                inventoryType: 'Cold Room',
                batchNumber: item.batchNumber || inv?.batchNumber || 'COLD-ROOM',
                transactionType: 'OUT',
                quantity: qtyPcs,
                referenceType: 'MANUAL',
                remarks: `Sales Invoice ${invoiceNumber} [${invoiceType}] to ${targetCustomerName} (Sales Owner: ${ownerName})`,
                performedBy: req.user?._id || '6a5ec376b44299bf18d9e800'
            });
        }

        const effectiveTaxRate = (invoiceType === 'Sample Products' || invoiceType === 'Guest') ? 0 : taxRate;
        const taxAmount = (subTotal * effectiveTaxRate) / 100;
        const grandTotal = subTotal + taxAmount;

        const salesOrder = await SalesOrder.create({
            invoiceNumber,
            invoiceType: invoiceType || 'Party Order',
            customer: customerId || undefined,
            guestName: invoiceType === 'Guest' ? targetCustomerName : undefined,
            salesOwner: salesOwnerId || customerObj?.salesOwner,
            branch: req.user?.primaryBranch || '6a5ec376b44299bf18d9e800',
            items: processedItems,
            subTotal,
            taxRate: effectiveTaxRate,
            taxAmount,
            grandTotal,
            paymentStatus,
            remarks: remarks || `${invoiceType} Outward Dispatch`,
            createdBy: req.user?._id || '6a5ec376b44299bf18d9e800'
        });

        let populatedOrder = await SalesOrder.findById(salesOrder._id);
        if (populatedOrder) {
            if (populatedOrder.customer && typeof populatedOrder.customer === 'string') {
                const cObj = await Customer.findById(populatedOrder.customer);
                if (cObj) populatedOrder.customer = cObj;
            }
            if (populatedOrder.salesOwner && typeof populatedOrder.salesOwner === 'string') {
                const uObj = await User.findById(populatedOrder.salesOwner);
                if (uObj) populatedOrder.salesOwner = uObj;
            }
            if (Array.isArray(populatedOrder.items)) {
                const Product = require('../models/Product');
                for (let item of populatedOrder.items) {
                    if (item.product && typeof item.product === 'string') {
                        const pObj = await Product.findById(item.product);
                        if (pObj) item.product = pObj;
                    }
                }
            }
        }

        res.status(201).json({ success: true, data: populatedOrder || salesOrder });
    } catch (error) {
        console.error('Error generating sales invoice:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Log Auto Sales Van Stock Return (Unsold Ice Cream Back to Cold Room)
// @route   POST /api/v1/sales-orders/:id/auto-return
exports.logAutoSalesReturn = async (req, res) => {
    try {
        const { returnedItems, remarks, returnMode = 'daily_auto' } = req.body; // array of { product, batchNumber, returnedPcs }
        const salesOrder = await SalesOrder.findById(req.params.id)
            .populate('customer')
            .populate('salesOwner');

        if (!salesOrder) return res.status(404).json({ success: false, message: 'Sales order not found' });
        if (salesOrder.invoiceType !== 'Auto Sales') {
            return res.status(400).json({ success: false, message: 'Stock return is only applicable for Auto Sales invoices.' });
        }

        let totalReturnedPcs = 0;

        for (const rItem of returnedItems) {
            const retPcs = parseInt(rItem.returnedPcs) || 0;
            if (retPcs > 0) {
                totalReturnedPcs += retPcs;

                // Save item returnedPcs on SalesOrder item
                const matchItem = salesOrder.items.find(i => i.product.toString() === rItem.product.toString());
                if (matchItem) {
                    matchItem.returnedPcs = retPcs;
                }

                // If Cold Room Maintenance Return mode -> Restore stock to Main Cold Room
                if (returnMode === 'cold_room') {
                    let inv = await Inventory.findOne({ 
                        product: rItem.product, 
                        inventoryType: 'Cold Room', 
                        batchNumber: rItem.batchNumber || 'COLD-ROOM' 
                    });

                    if (!inv) {
                        inv = await Inventory.findOne({ product: rItem.product, inventoryType: 'Cold Room' });
                    }

                    if (inv) {
                        inv.quantity += retPcs;
                        inv.lastUpdated = Date.now();
                        await inv.save();
                    }

                    // Log IN transaction to main Cold Room
                    await InventoryTransaction.create({
                        branch: salesOrder.branch || '6a5ec376b44299bf18d9e800',
                        product: rItem.product,
                        inventoryType: 'Cold Room',
                        batchNumber: rItem.batchNumber || 'COLD-ROOM',
                        transactionType: 'IN',
                        quantity: retPcs,
                        referenceType: 'MANUAL',
                        remarks: `Auto Van Maintenance Cold Room Unload for Invoice ${salesOrder.invoiceNumber} (Driver: ${salesOrder.salesOwner?.name || 'Auto Driver'}) — ${remarks || 'Vehicle Service Unload'}`,
                        performedBy: req.user?._id || '6a5ec376b44299bf18d9e800'
                    });
                }
            }
        }

        salesOrder.autoSalesReturnLogged = true;
        salesOrder.returnedPcs = (salesOrder.returnedPcs || 0) + totalReturnedPcs;
        salesOrder.status = 'Returned';
        await salesOrder.save();

        const successMsg = returnMode === 'cold_room'
            ? `Successfully returned ${totalReturnedPcs} Pcs back to Main Cold Storage Room!`
            : `Successfully logged ${totalReturnedPcs} Pcs unsold stock in Auto Storage for tomorrow opening!`;

        res.json({ success: true, message: successMsg, data: salesOrder });
    } catch (error) {
        console.error('Error logging auto sales return:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};
