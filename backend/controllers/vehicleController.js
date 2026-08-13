const Vehicle = require('../models/Vehicle');
const VehicleMaintenance = require('../models/VehicleMaintenance');

// Helper to auto-generate Vehicle ID Code: VECH001, VECH002, etc.
const generateVehicleCode = async () => {
    const vehicles = await Vehicle.find({}).select('vehicleCode');
    let maxNum = 0;
    vehicles.forEach(v => {
        if (v.vehicleCode && v.vehicleCode.toUpperCase().startsWith('VECH')) {
            const num = parseInt(v.vehicleCode.replace(/[^0-9]/g, '')) || 0;
            if (num > maxNum) maxNum = num;
        }
    });
    const nextNum = maxNum + 1;
    return `VECH${nextNum.toString().padStart(3, '0')}`;
};

// @desc    Get next sequential vehicle code (VECH001, VECH002...)
// @route   GET /api/v1/vehicles/next-code
exports.getNextVehicleCode = async (req, res) => {
    try {
        const nextCode = await generateVehicleCode();
        res.json({ success: true, nextCode });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all vehicles
// @route   GET /api/v1/vehicles
exports.getVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find().sort({ createdAt: -1 });
        res.json({ success: true, data: vehicles });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new vehicle
// @route   POST /api/v1/vehicles
exports.createVehicle = async (req, res) => {
    try {
        if (!req.body.vehicleCode) {
            req.body.vehicleCode = await generateVehicleCode();
        }
        if (req.user) req.body.createdBy = req.user._id;

        const vehicle = await Vehicle.create(req.body);
        res.status(201).json({ success: true, message: `Vehicle registered with Code ${vehicle.vehicleCode}!`, data: vehicle });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update vehicle details & odometer
// @route   PUT /api/v1/vehicles/:id
exports.updateVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        res.json({ success: true, message: 'Vehicle details updated successfully', data: vehicle });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete vehicle
// @route   DELETE /api/v1/vehicles/:id
exports.deleteVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        await VehicleMaintenance.deleteMany({ vehicle: req.params.id });
        res.json({ success: true, message: 'Vehicle and maintenance records deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get vehicle maintenance ledger history
// @route   GET /api/v1/vehicles/:id/maintenance
exports.getVehicleMaintenanceHistory = async (req, res) => {
    try {
        const history = await VehicleMaintenance.find({ vehicle: req.params.id })
            .populate('performedBy', 'name role')
            .sort({ servicedDate: -1 });
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add vehicle maintenance ledger record
// @route   POST /api/v1/vehicles/:id/maintenance
exports.addVehicleMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const vehicle = await Vehicle.findById(id);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

        const parts = parseFloat(req.body.partsCost) || 0;
        const labor = parseFloat(req.body.laborCost) || 0;
        const totalExp = parseFloat(req.body.totalExpenseAmount) || (parts + labor);
        const odo = parseFloat(req.body.odometerKm) || vehicle.currentOdometerKm || 0;

        const count = await VehicleMaintenance.countDocuments();
        const mntNo = `MNT-VEC-${(count + 1).toString().padStart(4, '0')}`;

        const record = await VehicleMaintenance.create({
            maintenanceNumber: mntNo,
            vehicle: id,
            serviceType: req.body.serviceType,
            description: req.body.description,
            workshopName: req.body.workshopName,
            odometerKm: odo,
            partsCost: parts,
            laborCost: labor,
            totalExpenseAmount: totalExp,
            servicedDate: req.body.servicedDate || new Date(),
            nextServiceDueKm: req.body.nextServiceDueKm,
            receiptNumber: req.body.receiptNumber,
            performedBy: req.user?._id
        });

        // Update vehicle lifetime maintenance cost & current odometer reading
        const newTotalCost = (vehicle.totalMaintenanceCost || 0) + totalExp;
        const newOdo = Math.max(vehicle.currentOdometerKm || 0, odo);

        await Vehicle.findByIdAndUpdate(id, {
            totalMaintenanceCost: newTotalCost,
            currentOdometerKm: newOdo,
            status: req.body.status === 'Under Maintenance' ? 'Under Maintenance' : 'Operational'
        });

        res.status(201).json({
            success: true,
            message: `Maintenance Ledger Recorded! ₹${totalExp.toLocaleString()} added to ${vehicle.vehicleCode} (${vehicle.registrationNumber})`,
            data: record
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
