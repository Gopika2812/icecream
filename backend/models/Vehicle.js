const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    vehicleCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    registrationNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    vehicleType: {
        type: String,
        enum: ['Auto Sales Delivery Van', 'Reefer Truck', 'Delivery Auto', 'Insulated Van', 'Forklift / Stack'],
        default: 'Auto Sales Delivery Van'
    },
    makeModel: String,
    reeferUnitMake: String,
    targetTemperature: {
        type: Number,
        default: -18
    },
    payloadCapacityBoxes: {
        type: Number,
        default: 50
    },
    branch: {
        type: mongoose.Schema.Types.Mixed,
        ref: 'Branch'
    },
    assignedDriver: String,
    driverContact: String,
    status: {
        type: String,
        enum: ['Operational', 'In Transit', 'Under Maintenance', 'Out of Service'],
        default: 'Operational'
    },
    insuranceExpiry: Date,
    fitnessCertExpiry: Date,
    pucExpiry: Date,
    roadTaxExpiry: Date,
    currentOdometerKm: {
        type: Number,
        default: 0
    },
    totalMaintenanceCost: {
        type: Number,
        default: 0
    },
    totalFuelSpent: {
        type: Number,
        default: 0
    },
    remarks: String,
    createdBy: {
        type: mongoose.Schema.Types.Mixed,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
