const mongoose = require('mongoose');

const vehicleMaintenanceSchema = new mongoose.Schema({
    maintenanceNumber: {
        type: String,
        required: true,
        unique: true
    },
    vehicle: {
        type: mongoose.Schema.Types.Mixed,
        ref: 'Vehicle',
        required: true
    },
    serviceType: {
        type: String,
        enum: ['Engine Oil & Filter', 'Tire Replacement', 'Reefer AC Gas & Compressor', 'Brake Work', 'Battery Replacement', 'Electrical & Wiring', 'General Service', 'Accident Repair'],
        default: 'General Service'
    },
    description: String,
    workshopName: String,
    odometerKm: {
        type: Number,
        default: 0
    },
    partsCost: {
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
    nextServiceDueKm: Number,
    receiptNumber: String,
    performedBy: {
        type: mongoose.Schema.Types.Mixed,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('VehicleMaintenance', vehicleMaintenanceSchema);
