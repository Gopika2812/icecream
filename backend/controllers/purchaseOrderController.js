const PurchaseOrder = require('../models/PurchaseOrder');
const { getNextSequenceNumber } = require('../utils/sequenceGenerator');

exports.getPurchaseOrders = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let filter = {};
        if (startDate || endDate) {
            filter.orderDate = {};
            if (startDate) filter.orderDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.orderDate.$lte = end;
            }
        }

        const pos = await PurchaseOrder.find(filter)
            .populate('vendor')
            .populate('branch')
            .populate('items.product')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: pos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('vendor')
            .populate('branch')
            .populate('items.product');
        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
        res.json({ success: true, data: po });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createPurchaseOrder = async (req, res) => {
    try {
        req.body.createdBy = req.user?._id || '6a5ec376b44299bf18d9e800';
        req.body.poNumber = await getNextSequenceNumber(PurchaseOrder, 'poNumber', 'PO', req.body.orderDate || new Date());
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
