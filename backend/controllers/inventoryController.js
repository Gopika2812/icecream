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
            .populate('rawMaterial', 'name itemCode category unitOfMeasure minimumStockLevel');
            
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
        const { branchId, rawMaterialId } = req.query;
        let query = {};
        if (branchId) query.branch = branchId;
        if (rawMaterialId) query.rawMaterial = rawMaterialId;

        const transactions = await InventoryTransaction.find(query)
            .populate('branch', 'branchName')
            .populate('rawMaterial', 'name itemCode')
            .populate('performedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(100);
            
        res.json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
