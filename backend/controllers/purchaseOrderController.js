const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');
const Branch = require('../models/Branch');
const Product = require('../models/Product');
const { getNextSequenceNumber } = require('../utils/sequenceGenerator');

// Helper to populate reference IDs in DynamoDB
const populatePOReferences = async (pos) => {
    const poList = Array.isArray(pos) ? pos : [pos];
    if (poList.length === 0) return [];

    const [allVendors, allBranches, allProducts] = await Promise.all([
        Vendor.find({}),
        Branch.find({}),
        Product.find({})
    ]);

    const vendorMap = {};
    allVendors.forEach(v => { vendorMap[v._id || v.id] = v; });

    const branchMap = {};
    allBranches.forEach(b => { branchMap[b._id || b.id] = b; });

    const productMap = {};
    allProducts.forEach(p => { productMap[p._id || p.id] = p; });

    return poList.map(po => {
        const vObj = typeof po.vendor === 'object' ? po.vendor : (vendorMap[po.vendor] || null);
        const bObj = typeof po.branch === 'object' ? po.branch : (branchMap[po.branch] || null);
        const populatedItems = (po.items || []).map(item => {
            const pId = typeof item.product === 'object' ? (item.product._id || item.product.id) : item.product;
            const pObj = typeof item.product === 'object' ? item.product : (productMap[pId] || null);
            return {
                ...item,
                product: pObj || { name: 'Raw Material Item', itemCode: '-', unitOfMeasure: 'Units' }
            };
        });

        return {
            ...po,
            orderDate: po.orderDate || po.createdAt || new Date().toISOString(),
            vendor: vObj || { name: 'Vendor' },
            branch: bObj || { branchName: 'Main Branch' },
            items: populatedItems
        };
    });
};

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

        const rawPos = await PurchaseOrder.find(filter).sort({ createdAt: -1 });
        const populatedPOs = await populatePOReferences(rawPos);
        res.json({ success: true, data: populatedPOs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPurchaseOrder = async (req, res) => {
    try {
        const rawPo = await PurchaseOrder.findById(req.params.id);
        if (!rawPo) return res.status(404).json({ success: false, message: 'PO not found' });
        const [po] = await populatePOReferences(rawPo);
        res.json({ success: true, data: po });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createPurchaseOrder = async (req, res) => {
    try {
        req.body.createdBy = req.user?._id || '6a5ec376b44299bf18d9e800';
        req.body.orderDate = req.body.orderDate || new Date().toISOString();
        req.body.poNumber = await getNextSequenceNumber(PurchaseOrder, 'poNumber', 'PO', req.body.orderDate);
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
        if (req.user) po.updatedBy = req.user._id;
        await po.save();
        
        res.json({ success: true, data: po });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
