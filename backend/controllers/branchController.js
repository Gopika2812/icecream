const Branch = require('../models/Branch');

// @desc    Get all branches
// @route   GET /api/v1/branches
// @access  Private (Super Admin)
const getBranches = async (req, res) => {
    try {
        const branches = await Branch.find().populate('branchManager', 'name email');
        res.json({ success: true, count: branches.length, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single branch
// @route   GET /api/v1/branches/:id
// @access  Private (Super Admin or Assigned)
const getBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id).populate('branchManager', 'name email');
        
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }
        
        res.json({ success: true, data: branch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new branch
// @route   POST /api/v1/branches
// @access  Private (Super Admin)
const createBranch = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        const branch = await Branch.create(req.body);
        res.status(201).json({ success: true, data: branch });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update branch
// @route   PUT /api/v1/branches/:id
// @access  Private (Super Admin)
const updateBranch = async (req, res) => {
    try {
        req.body.updatedBy = req.user._id;
        const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        res.json({ success: true, data: branch });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete branch (Soft delete / Deactivate)
// @route   DELETE /api/v1/branches/:id
// @access  Private (Super Admin)
const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, {
            status: 'Inactive',
            updatedBy: req.user._id
        }, { new: true });

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        res.json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getBranches,
    getBranch,
    createBranch,
    updateBranch,
    deleteBranch
};
