const GRN = require('../models/GRN');
const PurchaseOrder = require('../models/PurchaseOrder');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');

exports.getGRNs = async (req, res) => {
    try {
        const grns = await GRN.find()
            .populate('poReference', 'poNumber')
            .populate('branch', 'branchName branchCode')
            .populate('items.product', 'name itemCode unitOfMeasure');
        res.json({ success: true, data: grns });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getGRN = async (req, res) => {
    try {
        const grn = await GRN.findById(req.params.id)
            .populate({
                path: 'poReference',
                select: 'poNumber vendor',
                populate: { path: 'vendor', select: 'name' }
            })
            .populate('branch', 'branchName branchCode')
            .populate('items.product', 'name itemCode unitOfMeasure');
        if (!grn) return res.status(404).json({ success: false, message: 'GRN not found' });
        res.json({ success: true, data: grn });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createGRN = async (req, res) => {
    // Start session for transaction if using MongoDB replica set (we assume we can just do sequentially for now, but a transaction is better)
    try {
        const { poReference, branch, supplierInvoiceNumber, items } = req.body;
        
        // 1. Verify PO exists
        const po = await PurchaseOrder.findById(poReference);
        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

        // 2. Create GRN
        const grnNumber = `GRN-${Date.now()}`;
        const grn = await GRN.create({
            grnNumber,
            poReference,
            branch,
            supplierInvoiceNumber,
            items,
            createdBy: req.user._id
        });

        // 3. (Deferred to QC Step) Inventory and transaction logs will be created when QC is run.
        
        // 4. Update PO Status
        po.status = 'Completed'; // Simplified logic, ideally check if all items received fully
        await po.save();

        res.status(201).json({ success: true, data: grn });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
