const mongoose = require('mongoose');

const assetMaintenanceSchema = new mongoose.Schema({
    maintenanceNumber: {
        type: String,
        required: true,
        unique: true
    },
    asset: {
        type: mongoose.Schema.Types.Mixed,
        ref: 'Asset',
        required: true
    },
    serviceType: {
        type: String,
        enum: ['Preventive Servicing', 'Breakdown Repair', 'Refrigerant Gas Top-Up', 'Calibration', 'Part Replacement', 'General Checkup'],
        default: 'Preventive Servicing'
    },
    issueDescription: String,
    workDone: String,
    serviceVendor: String,
    sparePartsCost: {
        type: Number,
        default: 0
    },
    laborCost: {
        type: Number,
        default: 0
    },
    totalExpenseAmount: {
        type: Number,
        required: true,
        default: 0
    },
    servicedDate: {
        type: Date,
        default: Date.now
    },
    nextDueDate: Date,
    status: {
        type: String,
        enum: ['Completed', 'Pending', 'In Progress'],
        default: 'Completed'
    },
    performedBy: {
        type: mongoose.Schema.Types.Mixed,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('AssetMaintenance', assetMaintenanceSchema);
