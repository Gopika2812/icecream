const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
    assetCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Processing Machinery', 'Cold Storage & Compressors', 'Retail Dealer Freezer', 'Utility & Generator', 'Factory Tools'],
        default: 'Processing Machinery'
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },
    modelNumber: String,
    serialNumber: String,
    manufacturer: String,
    purchaseDate: Date,
    purchaseCost: {
        type: Number,
        default: 0
    },
    warrantyExpiry: Date,
    location: {
        type: String,
        default: 'Main Factory'
    },
    status: {
        type: String,
        enum: ['Operational', 'Under Maintenance', 'Assigned to Dealer', 'Scrapped'],
        default: 'Operational'
    },
    assignedDealerCustomer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    dealerAssignedDate: Date,
    lastServiceDate: Date,
    nextServiceDueDate: Date,
    totalMaintenanceCost: {
        type: Number,
        default: 0
    },
    remarks: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
