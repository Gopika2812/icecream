const PurchaseOrder = require('../models/PurchaseOrder');

exports.getPurchaseOrders = async (req, res) => {
    try {
        const pos = await PurchaseOrder.find()
            .populate('vendor', 'name vendorCode')
            .populate('branch', 'branchName branchCode')
            .populate('items.rawMaterial', 'name itemCode unitOfMeasure');
        res.json({ success: true, data: pos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('vendor', 'name vendorCode')
            .populate('branch', 'branchName branchCode')
            .populate('items.rawMaterial', 'name itemCode unitOfMeasure');
        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
        res.json({ success: true, data: po });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createPurchaseOrder = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        // In real world, poNumber is generated sequentially (e.g. PO-2026-0001)
        req.body.poNumber = `PO-${Date.now()}`;
        const po = await PurchaseOrder.create(req.body);
        res.status(201).json({ success: true, data: po });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updatePurchaseOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
        
        po.status = status;
        po.updatedBy = req.user._id;
        await po.save();
        
        res.json({ success: true, data: po });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
