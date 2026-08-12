const ProductRequisition = require('../models/ProductRequisition');
const Product = require('../models/Product');
const Branch = require('../models/Branch');

// @desc    Get all product requisitions (purchase indents)
// @route   GET /api/v1/product-requisitions
// @access  Private
exports.getProductRequisitions = async (req, res) => {
    try {
        const allItems = await ProductRequisition.find({});
        const requisitions = allItems.filter(i => i.isRequisition === true || i.requisitionNumber);
        
        // Enrich items with Product details
        const products = await Product.find({});
        const prodMap = {};
        products.forEach(p => { prodMap[p._id || p.id] = p; });

        const enriched = requisitions.map(r => ({
            ...r,
            items: (r.items || []).map(item => ({
                ...item,
                product: typeof item.product === 'object' ? item.product : (prodMap[item.product] || { name: 'Unknown Item', _id: item.product })
            }))
        }));

        enriched.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.json({ success: true, data: enriched });
    } catch (error) {
        console.error('Error fetching product requisitions:', error);
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

        const allItems = await ProductRequisition.find({});
        const allReqs = allItems.filter(i => i.isRequisition === true || i.requisitionNumber);
        const reqNumber = `PR-${(allReqs.length + 1).toString().padStart(2, '0')}`;

        const reqObj = await ProductRequisition.create({
            isRequisition: true,
            requisitionNumber: reqNumber,
            branch: req.user?.branch || 'Main Branch',
            requestedBy: req.user?.name || req.user?._id || 'Production Staff',
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
        console.error('Error creating product requisition:', error);
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

        const updated = await ProductRequisition.update(id, {
            status,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true, message: `Requisition ${status} successfully!`, data: updated });
    } catch (error) {
        console.error('Error updating requisition status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
