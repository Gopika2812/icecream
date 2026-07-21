const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    branchCode: { type: String, required: true, unique: true },
    branchName: { type: String, required: true },
    legalBusinessName: { type: String },
    gstinNumber: { type: String },
    address: { type: String },
    city: { type: String },
    district: { type: String },
    state: { type: String },
    pinCode: { type: String },
    phoneNumber: { type: String },
    email: { type: String },
    branchManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
