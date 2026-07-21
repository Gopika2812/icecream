const Vendor = require('../models/Vendor');

// @desc    Get all vendors
// @route   GET /api/v1/vendors
// @access  Private
exports.getVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find();
        res.json({ success: true, data: vendors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single vendor
// @route   GET /api/v1/vendors/:id
// @access  Private
exports.getVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
        res.json({ success: true, data: vendor });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new vendor
// @route   POST /api/v1/vendors
// @access  Private
exports.createVendor = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        const vendor = await Vendor.create(req.body);
        res.status(201).json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update vendor
// @route   PUT /api/v1/vendors/:id
// @access  Private
exports.updateVendor = async (req, res) => {
    try {
        req.body.updatedBy = req.user._id;
        const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
        res.json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
