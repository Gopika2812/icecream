const GRN = require('../models/GRN');
const PurchaseOrder = require('../models/PurchaseOrder');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const { getNextSequenceNumber } = require('../utils/sequenceGenerator');

exports.getGRNs = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let filter = {};
        if (startDate || endDate) {
            filter.receivedDate = {};
            if (startDate) filter.receivedDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.receivedDate.$lte = end;
            }
        }

        const grns = await GRN.find(filter)
            .populate('poReference', 'poNumber')
            .populate('branch', 'branchName branchCode')
            .populate('items.product', 'name itemCode unitOfMeasure')
            .sort({ createdAt: -1 });
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
    try {
        const { poReference, branch, supplierInvoiceNumber, items } = req.body;
        
        const po = await PurchaseOrder.findById(poReference);
        if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

        const grnNumber = await getNextSequenceNumber(GRN, 'grnNumber', 'GRN', new Date());
        const grn = await GRN.create({
            grnNumber,
            poReference,
            branch,
            supplierInvoiceNumber,
            items,
            createdBy: req.user?._id || '6a5ec376b44299bf18d9e800'
        });

        po.status = 'Completed';
        await po.save();

        res.status(201).json({ success: true, data: grn });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
