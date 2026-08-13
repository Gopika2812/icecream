const Asset = require('../models/Asset');
const AssetMaintenance = require('../models/AssetMaintenance');

// Helper to auto-generate Asset ID Code: A001, A002, etc.
const generateAssetCode = async () => {
    const assets = await Asset.find({}).select('assetCode');
    let maxNum = 0;
    assets.forEach(a => {
        if (a.assetCode && a.assetCode.toUpperCase().startsWith('A')) {
            const num = parseInt(a.assetCode.replace(/[^0-9]/g, '')) || 0;
            if (num > maxNum) maxNum = num;
        }
    });
    const nextNum = maxNum + 1;
    return `A${nextNum.toString().padStart(3, '0')}`;
};

// @desc    Get next sequential asset code (A001, A002...)
// @route   GET /api/v1/assets/next-code
exports.getNextAssetCode = async (req, res) => {
    try {
        const nextCode = await generateAssetCode();
        res.json({ success: true, nextCode });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all assets
// @route   GET /api/v1/assets
exports.getAssets = async (req, res) => {
    try {
        const assets = await Asset.find()
            .populate('assignedDealerCustomer', 'name phone shopName address')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: assets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new asset
// @route   POST /api/v1/assets
exports.createAsset = async (req, res) => {
    try {
        if (!req.body.assetCode) {
            req.body.assetCode = await generateAssetCode();
        }
        if (req.user) req.body.createdBy = req.user._id;

        const asset = await Asset.create(req.body);
        res.status(201).json({ success: true, message: `Asset registered with Code ${asset.assetCode}!`, data: asset });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update asset details or dealer allocation
// @route   PUT /api/v1/assets/:id
exports.updateAsset = async (req, res) => {
    try {
        const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('assignedDealerCustomer', 'name phone shopName address');
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
        res.json({ success: true, message: 'Asset updated successfully', data: asset });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete asset
// @route   DELETE /api/v1/assets/:id
exports.deleteAsset = async (req, res) => {
    try {
        const asset = await Asset.findByIdAndDelete(req.params.id);
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
        await AssetMaintenance.deleteMany({ asset: req.params.id });
        res.json({ success: true, message: 'Asset and maintenance logs deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get asset maintenance ledger history
// @route   GET /api/v1/assets/:id/maintenance
exports.getAssetMaintenanceHistory = async (req, res) => {
    try {
        const history = await AssetMaintenance.find({ asset: req.params.id })
            .populate('performedBy', 'name role')
            .sort({ servicedDate: -1 });
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add asset maintenance ledger record
// @route   POST /api/v1/assets/:id/maintenance
exports.addAssetMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Asset.findById(id);
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

        const parts = parseFloat(req.body.sparePartsCost) || 0;
        const labor = parseFloat(req.body.laborCost) || 0;
        const totalExp = parseFloat(req.body.totalExpenseAmount) || (parts + labor);

        const count = await AssetMaintenance.countDocuments();
        const mntNo = `MNT-AST-${(count + 1).toString().padStart(4, '0')}`;

        const record = await AssetMaintenance.create({
            maintenanceNumber: mntNo,
            asset: id,
            serviceType: req.body.serviceType,
            issueDescription: req.body.issueDescription,
            workDone: req.body.workDone,
            serviceVendor: req.body.serviceVendor,
            sparePartsCost: parts,
            laborCost: labor,
            totalExpenseAmount: totalExp,
            servicedDate: req.body.servicedDate || new Date(),
            nextDueDate: req.body.nextDueDate,
            performedBy: req.user?._id
        });

        // Update asset lifetime maintenance cost & last service date
        const newTotalCost = (asset.totalMaintenanceCost || 0) + totalExp;
        await Asset.findByIdAndUpdate(id, {
            totalMaintenanceCost: newTotalCost,
            lastServiceDate: req.body.servicedDate || new Date(),
            nextServiceDueDate: req.body.nextDueDate || asset.nextServiceDueDate,
            status: req.body.status === 'Completed' ? 'Operational' : asset.status
        });

        res.status(201).json({
            success: true,
            message: `Maintenance Ledger Logged! Expense: ₹${totalExp.toLocaleString()} added to Asset ${asset.assetCode}`,
            data: record
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
