const ProductRequisition = require('../models/ProductRequisition');
const Product = require('../models/Product');
const Branch = require('../models/Branch');

// @desc    Get all product requisitions (purchase indents)
// @route   GET /api/v1/product-requisitions
// @access  Private
exports.getProductRequisitions = async (req, res) => {
    try {
        const requisitions = await ProductRequisition.find({})
            .populate('requestedBy', 'name')
            .populate('branch', 'branchName')
            .populate('items.product', 'name itemCode unitOfMeasure currentStock category')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: requisitions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new purchase indent / product requisition
// @route   POST /api/v1/product-requisitions
// @access  Private
exports.createProductRequisition = async (req, res) => {
    try {
        const { items, remarks, priority } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Requisition must include at least one item.' });
        }

        const totalCount = await ProductRequisition.countDocuments();
        const reqNumber = `PR-${(totalCount + 1).toString().padStart(2, '0')}`;

        const reqObj = await ProductRequisition.create({
            requisitionNumber: reqNumber,
            branch: req.user?.branch,
            requestedBy: req.user?._id,
            items: items.map(item => ({
                product: item.product,
                requestedQuantity: parseFloat(item.requestedQuantity) || 0,
                currentStock: parseFloat(item.currentStock) || 0,
                unitOfMeasure: item.unitOfMeasure || 'Units'
            })),
            priority: priority || 'HIGH',
            status: 'PENDING_PURCHASE',
            remarks: remarks || 'Low stock / out-of-stock indent from Production Team'
        });

        res.status(201).json({ success: true, message: `Purchase Indent ${reqNumber} sent to Purchase Team & Super Admin!`, data: reqObj });
    } catch (error) {
        console.error('Error creating product requisition', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update requisition status
// @route   PATCH /api/v1/product-requisitions/:id/status
// @access  Private
exports.updateRequisitionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const reqObj = await ProductRequisition.findById(id);
        if (!reqObj) return res.status(404).json({ success: false, message: 'Requisition not found.' });

        reqObj.status = status;
        reqObj.updatedAt = new Date();
        await reqObj.save();

        res.json({ success: true, data: reqObj });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
