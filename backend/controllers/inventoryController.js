const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');

// @desc    Get inventory levels for a branch (or all)
// @route   GET /api/v1/inventory
// @access  Private
exports.getInventory = async (req, res) => {
    try {
        const { branchId } = req.query;
        let query = {};
        if (branchId) query.branch = branchId;
        
        const inventory = await Inventory.find(query)
            .populate('branch', 'branchName branchCode')
            .populate('product', 'name itemCode category unitOfMeasure minimumStockLevel mrp wholesalePrice purchasePrice itemType piecesPerBox')
            .sort({ lastUpdated: -1, updatedAt: -1, createdAt: -1 });
            
        res.json({ success: true, data: inventory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get inventory transactions
// @route   GET /api/v1/inventory/transactions
// @access  Private
exports.getInventoryTransactions = async (req, res) => {
    try {
        const { branchId, productId } = req.query;
        let query = {};
        if (branchId) query.branch = branchId;
        if (productId) query.product = productId;

        const transactions = await InventoryTransaction.find(query)
            .populate('branch', 'branchName')
            .populate('product', 'name itemCode category unitOfMeasure itemType piecesPerBox')
            .populate('performedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(200);
            
        res.json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create manual inventory transaction (Inward / Outward)
// @route   POST /api/v1/inventory/transactions
// @access  Private
exports.createInventoryTransaction = async (req, res) => {
    try {
        const { branchId, product, inventoryType, batchNumber, transactionType, quantity, referenceType, remarks } = req.body;
        
        const targetBranch = branchId || req.user.branch || (await require('../models/Branch').findOne())._id;
        
        const tx = await InventoryTransaction.create({
            branch: targetBranch,
            product,
            inventoryType: inventoryType || 'Store Room',
            batchNumber: batchNumber || `B-${Date.now().toString().slice(-4)}`,
            transactionType: transactionType || 'IN', // 'IN' or 'OUT'
            quantity: parseFloat(quantity) || 0,
            referenceType: referenceType || 'MANUAL',
            remarks: remarks || 'Manual Stock Adjustment',
            performedBy: req.user._id
        });

        // Also update or create Inventory stock balance
        let inv = await Inventory.findOne({ 
            branch: targetBranch, 
            product, 
            inventoryType: tx.inventoryType, 
            batchNumber: tx.batchNumber 
        });

        if (!inv) {
            inv = new Inventory({
                branch: targetBranch,
                product,
                inventoryType: tx.inventoryType,
                batchNumber: tx.batchNumber,
                quantity: 0
            });
        }

        if (transactionType === 'IN') {
            inv.quantity += parseFloat(quantity) || 0;
        } else if (transactionType === 'OUT') {
            inv.quantity = Math.max(0, inv.quantity - (parseFloat(quantity) || 0));
        }
        inv.lastUpdated = Date.now();
        await inv.save();

        res.status(201).json({ success: true, data: tx });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
