const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Product = require('../models/Product');
const Branch = require('../models/Branch');

const populateInventoryReferences = async (invList = []) => {
    if (!Array.isArray(invList) || invList.length === 0) return [];

    const [allProducts, allBranches] = await Promise.all([
        Product.find({}),
        Branch.find({})
    ]);

    const productMap = {};
    (allProducts || []).forEach(p => { if (p._id) productMap[p._id.toString()] = p; });

    const branchMap = {};
    (allBranches || []).forEach(b => { if (b._id) branchMap[b._id.toString()] = b; });

    return invList.map(inv => {
        const invObj = { ...inv };
        const pId = invObj.product?._id ? invObj.product._id.toString() : (typeof invObj.product === 'string' ? invObj.product : null);
        if (pId && productMap[pId]) {
            invObj.product = productMap[pId];
        }
        const bId = invObj.branch?._id ? invObj.branch._id.toString() : (typeof invObj.branch === 'string' ? invObj.branch : null);
        if (bId && branchMap[bId]) {
            invObj.branch = branchMap[bId];
        }
        return invObj;
    });
};

// @desc    Get inventory levels for a branch (or all)
// @route   GET /api/v1/inventory
// @access  Private
exports.getInventory = async (req, res) => {
    try {
        const { branchId } = req.query;
        let query = {};
        if (branchId) query.branch = branchId;
        
        const rawInventory = await Inventory.find(query);
        const sorted = (rawInventory || []).sort((a, b) => new Date(b.updatedAt || b.lastUpdated || 0) - new Date(a.updatedAt || a.lastUpdated || 0));
        const populated = await populateInventoryReferences(sorted);
            
        res.json({ success: true, data: populated });
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

        const rawTransactions = await InventoryTransaction.find(query);
        const sorted = (rawTransactions || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 200);
        const populated = await populateInventoryReferences(sorted);
            
        res.json({ success: true, data: populated });
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
