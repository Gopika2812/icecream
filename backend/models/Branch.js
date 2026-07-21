const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    branchCode: { type: String, required: true, unique: true },
    branchName: { type: String, required: true },
    legalBusinessName: { type: String, required: true },
    gstinNumber: { type: String, required: true },
    fssaiNumber: { type: String },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        stateCode: { type: String, required: true },
        pinCode: { type: String, required: true }
    },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    branchManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
