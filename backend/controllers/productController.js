const Product = require('../models/Product');

exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find().populate('rawMaterials.product', 'name itemCode unitOfMeasure category purchasePrice costPrice');
        
        // Auto-calculate costPrice for Mix & Finished Goods if not manually set
        const enriched = products.map(prod => {
            const pObj = typeof prod.toObject === 'function' ? prod.toObject() : { ...prod };
            if (Array.isArray(pObj.rawMaterials) && pObj.rawMaterials.length > 0) {
                const recipeCost = pObj.rawMaterials.reduce((sum, rm) => {
                    const rmProd = rm.product;
                    const rmPrice = rmProd?.purchasePrice || rmProd?.costPrice || 0;
                    return sum + (parseFloat(rm.quantity || 0) * parseFloat(rmPrice));
                }, 0);

                if (!pObj.costPrice || pObj.costPrice === 0) {
                    pObj.costPrice = Number(recipeCost.toFixed(2));
                }
                pObj.recipeCalculatedCost = Number(recipeCost.toFixed(2));
            }
            return pObj;
        });

        res.json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('rawMaterials.product', 'name itemCode unitOfMeasure category');
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        if (req.user) req.body.createdBy = req.user._id;
        const product = await Product.create(req.body);
        const populated = await Product.findById(product._id).populate('rawMaterials.product', 'name itemCode unitOfMeasure category');
        res.status(201).json({ success: true, data: populated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        if (req.user) req.body.updatedBy = req.user._id;
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('rawMaterials.product', 'name itemCode unitOfMeasure category');
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
